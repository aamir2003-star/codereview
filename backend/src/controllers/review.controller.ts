import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { Comment } from '../models/Comment';
import { decrypt } from '../utils/crypto';
import { githubService } from '../services/github.service';
import { geminiService, GeminiApiError } from '../services/gemini.service';
import { getIO } from '../sockets/socket.instance';

async function getUserAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user || !user.accessToken) {
    throw new Error('User not found or missing access token');
  }
  return decrypt(user.accessToken);
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(async () => {
      const res = await task();
      results.push(res);
    });

    const e: Promise<void> = p.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });

    executing.push(e);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

const IGNORED_EXTENSIONS = [
  '.lock',
  '.lockb',
  '-lock.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.min.js',
  '.min.css',
  '.map',
];

const IGNORED_PATHS = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'dist/',
  '.next/',
  'build/',
  'node_modules/',
];

function isReviewableFile(filename: string): boolean {
  if (IGNORED_PATHS.some((ignored) => filename.includes(ignored))) return false;
  if (IGNORED_EXTENSIONS.some((ext) => filename.endsWith(ext))) return false;
  return true;
}

export const reviewController = {
  /**
   * POST /review
   * Trigger async review for an entire PR with Socket.io streaming
   */
  async triggerReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { owner, repo, pullNumber, prUrl, prTitle } = req.body;

    if (!owner || !repo || !pullNumber) {
      res.status(400).json({ error: 'owner, repo, and pullNumber are required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const review = await Review.create({
      prUrl: prUrl || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
      owner,
      repo,
      pullNumber,
      prTitle: prTitle || `PR #${pullNumber}`,
      requestedBy: new mongoose.Types.ObjectId(req.user.userId),
      status: 'pending',
    });

    const reviewId = review._id.toString();
    const io = getIO();

    // Return reviewId immediately so client joins socket room `review:{reviewId}`
    res.status(202).json({ reviewId, status: 'pending' });

    // Asynchronous streaming worker
    (async () => {
      try {
        const accessToken = await getUserAccessToken(req.user!.userId);

        await Review.findByIdAndUpdate(review._id, { status: 'streaming' });
        io?.to(`review:${reviewId}`).emit('review:status', { reviewId, status: 'streaming' });

        const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);
        
        // Filter out non-reviewable assets / lockfiles
        const reviewableFiles = files.filter((f) => isReviewableFile(f.filename) && f.patch);
        const filesToReview = reviewableFiles.length > 0 ? reviewableFiles.slice(0, 10) : files.slice(0, 10);

        await Review.findByIdAndUpdate(review._id, { totalFiles: filesToReview.length });

        // Emit initial progress starting point
        io?.to(`review:${reviewId}`).emit('review:progress', {
          reviewId,
          filesReviewed: 0,
          totalFiles: filesToReview.length,
          percent: 10,
          currentFile: filesToReview[0]?.filename || 'Initializing diff...',
          totalComments: 0,
        });

        let totalComments = 0;
        let filesReviewedCount = 0;

        const tasks = filesToReview.map((file) => async () => {
          if (!file.patch) {
            filesReviewedCount++;
            const percent = Math.min(100, Math.round((filesReviewedCount / filesToReview.length) * 100));
            io?.to(`review:${reviewId}`).emit('review:progress', {
              reviewId,
              filesReviewed: filesReviewedCount,
              totalFiles: filesToReview.length,
              percent,
              currentFile: file.filename,
              totalComments,
            });
            return;
          }

          try {
            console.log(`[Review] Analyzing file: ${file.filename} (Patch length: ${file.patch.length} chars)`);
            const comments = await geminiService.reviewFileDiff(file.filename, file.patch);

            if (comments.length > 0) {
              const docs = await Comment.insertMany(
                comments.map((c) => ({
                  reviewId: review._id,
                  filePath: file.filename,
                  lineNumber: c.line,
                  severity: c.severity,
                  message: c.message,
                }))
              );

              totalComments += docs.length;

              // Stream new comments to all reviewers in this room
              for (const doc of docs) {
                io?.to(`review:${reviewId}`).emit('comment:new', {
                  reviewId,
                  comment: doc.toObject(),
                });
              }
            }
          } catch (err) {
            console.error(`[Review] Gemini error on ${file.filename}:`, err instanceof Error ? err.message : err);
            io?.to(`review:${reviewId}`).emit('file:error', {
              reviewId,
              filename: file.filename,
              error: err instanceof Error ? err.message : 'Analysis failed',
            });
          }

          filesReviewedCount++;
          const percent = Math.min(100, Math.round((filesReviewedCount / filesToReview.length) * 100));

          await Review.updateOne(
            { _id: review._id },
            {
              $inc: { filesReviewed: 1 },
              $set: { updatedAt: new Date() },
            }
          );

          io?.to(`review:${reviewId}`).emit('review:progress', {
            reviewId,
            filesReviewed: filesReviewedCount,
            totalFiles: filesToReview.length,
            percent,
            currentFile: file.filename,
            totalComments,
          });
        });

        // Run files with concurrency of 2 for fast, stable rate-limits
        await runWithConcurrency(tasks, 2);

        // Review completed
        await Review.findByIdAndUpdate(review._id, {
          status: 'done',
          totalComments,
          filesReviewed: filesToReview.length,
        });

        io?.to(`review:${reviewId}`).emit('review:progress', {
          reviewId,
          filesReviewed: filesToReview.length,
          totalFiles: filesToReview.length,
          percent: 100,
          totalComments,
        });

        io?.to(`review:${reviewId}`).emit('review:complete', {
          reviewId,
          totalComments,
          filesReviewed: filesToReview.length,
        });
      } catch (err) {
        console.error('[Review] Processing failed:', err);
        await Review.findByIdAndUpdate(review._id, { status: 'error' });
        io?.to(`review:${reviewId}`).emit('review:error', {
          reviewId,
          message: err instanceof Error ? err.message : 'Review process encountered a fatal error',
        });
      }
    })();
  },

  /**
   * GET /review/:id
   */
  async getReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!reviewId || !mongoose.isValidObjectId(reviewId)) {
      res.status(400).json({ error: 'Valid review ID is required' });
      return;
    }

    try {
      const review = await Review.findById(reviewId).lean();
      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }

      const comments = await Comment.find({ reviewId: review._id }).sort({ lineNumber: 1 }).lean();

      res.status(200).json({ review, comments });
    } catch (err) {
      console.error('[GetReview Error]:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * GET /review/pr/:owner/:repo/:pullNumber
   */
  async getReviewByPr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
    const repo = Array.isArray(req.params.repo) ? req.params.repo[0] : req.params.repo;
    const pullNumberStr = Array.isArray(req.params.pullNumber) ? req.params.pullNumber[0] : req.params.pullNumber;
    const pullNumber = parseInt(pullNumberStr || '', 10);

    if (!owner || !repo || isNaN(pullNumber)) {
      res.status(400).json({ error: 'Valid owner, repo, and pullNumber are required' });
      return;
    }

    try {
      const review = await Review.findOne({ owner, repo, pullNumber })
        .sort({ createdAt: -1 })
        .lean();

      if (!review) {
        res.status(404).json({ error: 'No review found for this PR' });
        return;
      }

      const comments = await Comment.find({ reviewId: review._id }).sort({ lineNumber: 1 }).lean();

      res.status(200).json({ review, comments });
    } catch (err) {
      console.error('[GetReviewByPr Error]:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * PATCH /comments/:id/resolve
   */
  async resolveComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const commentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!commentId || !mongoose.isValidObjectId(commentId)) {
      res.status(400).json({ error: 'Valid comment ID is required' });
      return;
    }

    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      comment.resolved = !comment.resolved;
      comment.resolvedBy = comment.resolved && req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
      await comment.save();

      const io = getIO();
      io?.to(`review:${comment.reviewId.toString()}`).emit('comment:resolved', {
        reviewId: comment.reviewId.toString(),
        commentId: comment._id.toString(),
        resolved: comment.resolved,
        resolvedBy: req.user?.username || '',
      });

      res.status(200).json({ comment });
    } catch (err) {
      console.error('[ResolveComment Error]:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * PATCH /comments/:id/upvote
   */
  async upvoteComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const commentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user?.userId;

    if (!commentId || !mongoose.isValidObjectId(commentId) || !userId) {
      res.status(400).json({ error: 'Valid comment ID and user authentication required' });
      return;
    }

    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      const userObjId = new mongoose.Types.ObjectId(userId);
      const hasUpvoted = comment.upvotes.some((id) => id.toString() === userId);

      if (hasUpvoted) {
        comment.upvotes = comment.upvotes.filter((id) => id.toString() !== userId);
      } else {
        comment.upvotes.push(userObjId);
      }

      await comment.save();

      const io = getIO();
      io?.to(`review:${comment.reviewId.toString()}`).emit('comment:upvoted', {
        reviewId: comment.reviewId.toString(),
        commentId: comment._id.toString(),
        upvotes: comment.upvotes.map((id) => id.toString()),
      });

      res.status(200).json({ comment, upvotes: comment.upvotes.length });
    } catch (err) {
      console.error('[UpvoteComment Error]:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
