import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { Comment } from '../models/Comment';
import { decrypt } from '../utils/crypto';
import { githubService, GitHubApiError } from '../services/github.service';
import { geminiService, GeminiApiError } from '../services/gemini.service';

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
   * Trigger a full PR review — creates Review doc, runs Gemini per file, persists comments
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

    // Create the Review doc immediately and return its ID — don't block on AI
    const review = await Review.create({
      prUrl: prUrl || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
      owner,
      repo,
      pullNumber,
      prTitle: prTitle || `PR #${pullNumber}`,
      requestedBy: new mongoose.Types.ObjectId(req.user.userId),
      status: 'pending',
    });

    // Return the reviewId immediately so the client can join the socket room
    res.status(202).json({ reviewId: review._id.toString(), status: 'pending' });

    // --- Run the review asynchronously (fire and forget) ---
    (async () => {
      try {
        const accessToken = await getUserAccessToken(req.user!.userId);

        // Update status to streaming
        await Review.findByIdAndUpdate(review._id, { status: 'streaming' });

        // Fetch PR files
        const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);
        const filesToReview = files.slice(0, 10); // v1 cap

        await Review.findByIdAndUpdate(review._id, { totalFiles: filesToReview.length });

        let totalComments = 0;
        let filesReviewed = 0;

        const tasks = filesToReview.map((file) => async () => {
          if (!file.patch) {
            filesReviewed++;
            await Review.findByIdAndUpdate(review._id, { filesReviewed });
            return;
          }

          try {
            const comments = await geminiService.reviewFileDiff(file.filename, file.patch);

            // Persist each comment to MongoDB
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
          } catch (err) {
            if (err instanceof GeminiApiError) {
              console.error(`[Review] Gemini failed for ${file.filename}:`, err.message);
            } else {
              console.error(`[Review] Unexpected error for ${file.filename}:`, err);
            }
          }

          filesReviewed++;
          await Review.findByIdAndUpdate(review._id, { filesReviewed, totalComments });
        });

        await runWithConcurrency(tasks, 3);

        // Mark review complete
        await Review.findByIdAndUpdate(review._id, { status: 'done', totalComments });
      } catch (err) {
        console.error('[Review] Fatal error:', err);
        await Review.findByIdAndUpdate(review._id, { status: 'error' });
      }
    })();
  },

  /**
   * GET /review/:id
   * Fetch a review and all its persisted comments
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
   * Check if a review already exists for this PR
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

      comment.resolved = !comment.resolved;
      comment.resolvedBy = comment.resolved
        ? new mongoose.Types.ObjectId(req.user.userId)
        : undefined;

      await comment.save();
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

      const userId = new mongoose.Types.ObjectId(req.user.userId);
      const hasUpvoted = comment.upvotes.some((id) => id.equals(userId));

      if (hasUpvoted) {
        comment.upvotes = comment.upvotes.filter((id) => !id.equals(userId));
      } else {
        comment.upvotes.push(userId);
      }

      await comment.save();
      res.status(200).json({ comment, upvotes: comment.upvotes.length });
    } catch (err) {
      console.error('[UpvoteComment Error]:', err);
      res.status(500).json({ error: 'Failed to update upvote' });
    }
  },
};
