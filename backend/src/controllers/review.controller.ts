import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { Comment } from '../models/Comment';
import { decrypt } from '../utils/crypto';
import { githubService, GitHubApiError } from '../services/github.service';
import { geminiService, GeminiApiError } from '../services/gemini.service';
import { getIO } from '../sockets/socket.instance';

async function getUserAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user || !user.accessToken) throw new Error('User access token not found');
  return decrypt(user.accessToken);
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) results.push(await task());
    }
  });
  await Promise.all(workers);
  return results;
}

export const reviewController = {
  /**
   * POST /review
   * Trigger a full PR review — creates Review doc, streams Gemini comments via Socket.io
   */
  async triggerReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { owner, repo, pullNumber, prUrl, prTitle } = req.body as {
      owner?: string;
      repo?: string;
      pullNumber?: number;
      prUrl?: string;
      prTitle?: string;
    };

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
        const filesToReview = files.slice(0, 10); // v1 limit

        await Review.findByIdAndUpdate(review._id, { totalFiles: filesToReview.length });

        let totalComments = 0;
        let filesReviewed = 0;

        const tasks = filesToReview.map((file) => async () => {
          if (!file.patch) {
            filesReviewed++;
            await Review.findByIdAndUpdate(review._id, { filesReviewed });
            io?.to(`review:${reviewId}`).emit('review:progress', {
              reviewId,
              filesReviewed,
              totalFiles: filesToReview.length,
              currentFile: file.filename,
            });
            return;
          }

          try {
            const comments = await geminiService.reviewFileDiff(file.filename, file.patch);

            // Persist each comment to MongoDB BEFORE broadcasting
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
          } catch (err) {
            if (err instanceof GeminiApiError) {
              console.error(`[Review] Gemini error on ${file.filename}:`, err.message);
            }
            io?.to(`review:${reviewId}`).emit('file:error', {
              reviewId,
              filename: file.filename,
              error: err instanceof Error ? err.message : 'Analysis failed',
            });
          }

          filesReviewed++;
          // CRITICAL FIX: Use atomic $inc to prevent race conditions
          // Note: totalComments was already incremented in the try block
          await Review.updateOne(
            { _id: review._id },
            {
              $inc: { filesReviewed: 1 },
              $set: { updatedAt: new Date() },
            }
          );

          io?.to(`review:${reviewId}`).emit('review:progress', {
            reviewId,
            filesReviewed,
            totalFiles: filesToReview.length,
            currentFile: file.filename,
            totalComments,
          });
        });

        await runWithConcurrency(tasks, 3);

        // Review completed
        await Review.findByIdAndUpdate(review._id, { status: 'done', totalComments });
        io?.to(`review:${reviewId}`).emit('review:complete', {
          reviewId,
          totalComments,
          filesReviewed,
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

      const comments = await Comment.find({ reviewId: review._id })
        .sort({ filePath: 1, lineNumber: 1 })
        .lean();

      res.status(200).json({ review, comments });
    } catch (err) {
      console.error('[GetReview Error]:', err);
      res.status(500).json({ error: 'Failed to fetch review' });
    }
  },

  /**
   * GET /review/pr/:owner/:repo/:pullNumber
   */
  async getReviewByPr(req: AuthenticatedRequest, res: Response): Promise<void> {
    const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
    const repo = Array.isArray(req.params.repo) ? req.params.repo[0] : req.params.repo;
    const pullNumber = parseInt(
      Array.isArray(req.params.pullNumber) ? req.params.pullNumber[0] ?? '' : req.params.pullNumber ?? '',
      10
    );

    if (!owner || !repo || isNaN(pullNumber)) {
      res.status(400).json({ error: 'Invalid parameters' });
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

      const comments = await Comment.find({ reviewId: review._id })
        .sort({ filePath: 1, lineNumber: 1 })
        .lean();

      res.status(200).json({ review, comments });
    } catch (err) {
      console.error('[GetReviewByPr Error]:', err);
      res.status(500).json({ error: 'Failed to fetch review' });
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

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // CRITICAL FIX: Verify authorization - user must own the review
      const review = await Review.findById(comment.reviewId);
      if (!review || review.requestedBy.toString() !== req.user.userId) {
        res.status(403).json({ error: 'Not authorized to modify this review' });
        return;
      }

      comment.resolved = !comment.resolved;
      comment.resolvedBy = comment.resolved
        ? new mongoose.Types.ObjectId(req.user.userId)
        : undefined;

      await comment.save();

      // Broadcast live to room
      const io = getIO();
      io?.to(`review:${comment.reviewId.toString()}`).emit('comment:resolved', {
        reviewId: comment.reviewId.toString(),
        commentId: comment._id.toString(),
        resolved: comment.resolved,
        resolvedBy: req.user.username,
      });

      res.status(200).json({ comment });
    } catch (err) {
      console.error('[ResolveComment Error]:', err);
      res.status(500).json({ error: 'Failed to update comment' });
    }
  },

  /**
   * PATCH /comments/:id/upvote
   */
  async upvoteComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const commentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!commentId || !mongoose.isValidObjectId(commentId)) {
      res.status(400).json({ error: 'Valid comment ID is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // CRITICAL FIX: Verify authorization - user must own the review
      const review = await Review.findById(comment.reviewId);
      if (!review || review.requestedBy.toString() !== req.user.userId) {
        res.status(403).json({ error: 'Not authorized to modify this review' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.userId);
      const hasUpvoted = comment.upvotes.some((id) => id.equals(userId));

      if (hasUpvoted) {
        comment.upvotes = comment.upvotes.filter((id) => !id.equals(userId));
      } else {
        comment.upvotes.push(userId);
      }

      await comment.save();

      // Broadcast live to room
      const io = getIO();
      io?.to(`review:${comment.reviewId.toString()}`).emit('comment:upvoted', {
        reviewId: comment.reviewId.toString(),
        commentId: comment._id.toString(),
        upvotes: comment.upvotes.map((id) => id.toString()),
        userId: req.user.userId,
      });

      res.status(200).json({ comment, upvotes: comment.upvotes.length });
    } catch (err) {
      console.error('[UpvoteComment Error]:', err);
      res.status(500).json({ error: 'Failed to update upvote' });
    }
  },
};
