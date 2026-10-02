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

// Track active review jobs so user can cancel/stop them on demand
const activeReviewAborts = new Map<string, boolean>();

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
    activeReviewAborts.set(reviewId, false);

    const io = getIO();

    // Return reviewId immediately so client joins socket room `review:{reviewId}`
    res.status(202).json({ reviewId, status: 'pending' });

    // Asynchronous review worker
    (async () => {
      const startTime = Date.now();
      try {
        const accessToken = await getUserAccessToken(req.user!.userId);

        await Review.findByIdAndUpdate(review._id, { status: 'streaming' });
        io?.to(`review:${reviewId}`).emit('review:status', { reviewId, status: 'streaming' });

        const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);

        // Filter out non-reviewable assets / lockfiles
        const reviewableFiles = files.filter((f) => isReviewableFile(f.filename) && f.patch);
        const filesToReview = reviewableFiles.length > 0 ? reviewableFiles.slice(0, 10) : files.slice(0, 10);

        await Review.findByIdAndUpdate(review._id, { totalFiles: filesToReview.length });

        console.log(`[Review] Starting review for ${owner}/${repo} #${pullNumber} (${filesToReview.length} files to review)`);

        // Emit initial progress starting point
        const totalSteps = Math.max(1, filesToReview.length * 3 + 2);

        io?.to(`review:${reviewId}`).emit('review:progress', {
          reviewId,
          filesReviewed: 0,
          totalFiles: filesToReview.length,
          percent: 5,
          stage: 'Synthesizing PR Architecture & System Impact...',
          currentFile: 'Architecture Analysis',
          totalComments: 0,
        });

        // Generate CodeRabbit-style PR Architecture & Walkthrough
        try {
          console.log(`[Review] Generating PR Architecture summary for #${pullNumber}...`);
          const architectureSummary = await geminiService.generatePrArchitecture(
            prTitle || `PR #${pullNumber}`,
            '',
            filesToReview.map((f) => ({
              filename: f.filename,
              patch: f.patch,
              additions: f.additions,
              deletions: f.deletions,
            }))
          );

          await Review.findByIdAndUpdate(review._id, { architectureSummary });
          io?.to(`review:${reviewId}`).emit('review:architecture', {
            reviewId,
            architecture: architectureSummary,
          });
        } catch (archErr) {
          console.warn('[Review] Failed to generate architecture summary:', archErr);
        }

        io?.to(`review:${reviewId}`).emit('review:progress', {
          reviewId,
          filesReviewed: 0,
          totalFiles: filesToReview.length,
          percent: 15,
          stage: 'Initializing deep line-by-line audit...',
          currentFile: filesToReview[0]?.filename || 'Starting analyzer...',
          totalComments: 0,
        });

        let totalComments = 0;
        let filesReviewedCount = 0;

        // Process files sequentially with smooth multi-phase progress
        for (let i = 0; i < filesToReview.length; i++) {
          // Check if user requested to stop/cancel review
          if (activeReviewAborts.get(reviewId)) {
            console.log(`[Review] Review #${reviewId} was stopped by user.`);
            break;
          }

          const file = filesToReview[i];
          const fileBasePercent = Math.round(((i * 3 + 1) / totalSteps) * 90) + 5;

          io?.to(`review:${reviewId}`).emit('review:progress', {
            reviewId,
            filesReviewed: filesReviewedCount,
            totalFiles: filesToReview.length,
            percent: fileBasePercent,
            stage: `Scanning ${file.filename}...`,
            currentFile: file.filename,
            totalComments,
          });

          if (!file.patch) {
            filesReviewedCount++;
            continue;
          }

          try {
            console.log(`[Review] Analyzing file [${i + 1}/${filesToReview.length}]: ${file.filename} (${file.patch.length} chars)`);

            // Phase 2: AI reasoning & analysis
            io?.to(`review:${reviewId}`).emit('review:progress', {
              reviewId,
              filesReviewed: filesReviewedCount,
              totalFiles: filesToReview.length,
              percent: Math.min(94, fileBasePercent + 15),
              stage: `Neural analysis & code audit for ${file.filename}...`,
              currentFile: file.filename,
              totalComments,
            });

            const comments = await geminiService.reviewFileDiff(file.filename, file.patch);

            if (comments.length > 0) {
              const docs = await Comment.insertMany(
                comments.map((c) => ({
                  reviewId: review._id,
                  filePath: file.filename,
                  lineNumber: c.line,
                  severity: c.severity,
                  message: c.message,
                  suggestedFix: c.suggestedFix || undefined,
                }))
              );

              totalComments += docs.length;
              console.log(`[Review] Found ${docs.length} issues in ${file.filename}`);

              // Stream new comments to all reviewers in this room
              for (const doc of docs) {
                io?.to(`review:${reviewId}`).emit('comment:new', {
                  reviewId,
                  comment: doc.toObject(),
                });
              }
            }
          } catch (err) {
            console.error(`[Review] Error analyzing ${file.filename}:`, err instanceof Error ? err.message : err);
            io?.to(`review:${reviewId}`).emit('file:error', {
              reviewId,
              filename: file.filename,
              error: err instanceof Error ? err.message : 'Analysis failed',
            });
          }

          filesReviewedCount++;

          await Review.updateOne(
            { _id: review._id },
            {
              $set: {
                filesReviewed: filesReviewedCount,
                totalComments,
                updatedAt: new Date(),
              },
            }
          );

          const stepCompletePercent = Math.min(95, Math.round(((i + 1) / filesToReview.length) * 92) + 5);

          io?.to(`review:${reviewId}`).emit('review:progress', {
            reviewId,
            filesReviewed: filesReviewedCount,
            totalFiles: filesToReview.length,
            percent: stepCompletePercent,
            stage: `Completed ${file.filename}`,
            currentFile: file.filename,
            totalComments,
          });
        }

        // Review completed
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Review] Completed review #${reviewId} in ${durationSec}s with ${totalComments} total comments.`);

        await Review.findByIdAndUpdate(review._id, {
          status: 'done',
          totalComments,
          filesReviewed: filesReviewedCount,
        });

        io?.to(`review:${reviewId}`).emit('review:progress', {
          reviewId,
          filesReviewed: filesReviewedCount,
          totalFiles: filesToReview.length,
          percent: 100,
          stage: 'Review complete',
          totalComments,
        });

        io?.to(`review:${reviewId}`).emit('review:complete', {
          reviewId,
          totalComments,
          filesReviewed: filesReviewedCount,
        });
      } catch (err) {
        console.error('[Review] Processing failed:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        const isHighDemand =
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota');

        const userMessage = isHighDemand
          ? 'Google Gemini AI is experiencing temporary high demand spikes. Please wait a moment and click "AI Review Again".'
          : errMsg || 'Review process encountered an unexpected issue.';

        await Review.findByIdAndUpdate(review._id, { status: 'error' });
        io?.to(`review:${reviewId}`).emit('review:error', {
          reviewId,
          isHighDemand,
          message: userMessage,
        });
      } finally {
        activeReviewAborts.delete(reviewId);
      }
    })();
  },

  /**
   * POST /review/:id/stop
   * Stop/cancel a running review
   */
  async stopReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!reviewId || !mongoose.isValidObjectId(reviewId)) {
      res.status(400).json({ error: 'Valid review ID is required' });
      return;
    }

    try {
      activeReviewAborts.set(reviewId, true);

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { status: 'done' },
        { new: true }
      );

      const io = getIO();
      io?.to(`review:${reviewId}`).emit('review:complete', {
        reviewId,
        totalComments: review?.totalComments || 0,
        filesReviewed: review?.filesReviewed || 0,
        stopped: true,
      });

      console.log(`[Review] Stopped review #${reviewId} on user request.`);
      res.status(200).json({ success: true, message: 'Review stopped successfully', review });
    } catch (err) {
      console.error('[StopReview Error]:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
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

  /**
   * POST /review/:id/publish-github
   * Submits a full Pull Request review with architecture overview and inline comments to GitHub.
   */
  async publishReviewToGithub(req: AuthenticatedRequest, res: Response): Promise<void> {
    const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user?.userId;

    if (!reviewId || !mongoose.isValidObjectId(reviewId) || !userId) {
      res.status(400).json({ error: 'Valid review ID and authentication required' });
      return;
    }

    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }

      const comments = await Comment.find({ reviewId: review._id });
      const accessToken = await getUserAccessToken(userId);

      // Fetch PR to get latest head commit SHA
      const prDetails = await githubService.getPullRequest(
        accessToken,
        review.owner,
        review.repo,
        review.pullNumber
      );
      const headSha = prDetails.head.sha;

      // Format main review body markdown
      const arch = review.architectureSummary;
      let reviewBody = `## 🤖 ReviewCopilot AI Code Review\n\n`;

      if (arch?.highLevelSummary) {
        reviewBody += `### 📋 Executive Summary\n${arch.highLevelSummary}\n\n`;
      }

      if (arch?.architectureOverview) {
        reviewBody += `### 🏛️ System Architecture & Flow\n${arch.architectureOverview}\n\n`;
      }

      if (arch?.potentialRisks && arch.potentialRisks.length > 0) {
        reviewBody += `### ⚠️ Risk & Security Assessment\n`;
        arch.potentialRisks.forEach((risk, i) => {
          reviewBody += `${i + 1}. ${risk}\n`;
        });
        reviewBody += `\n`;
      }

      const securityCount = comments.filter((c) => c.severity === 'security').length;
      const bugCount = comments.filter((c) => c.severity === 'bug').length;
      const smellCount = comments.filter((c) => c.severity === 'smell').length;

      reviewBody += `### 📊 Findings Breakdown\n`;
      reviewBody += `- 🚨 **Security Vulnerabilities:** ${securityCount}\n`;
      reviewBody += `- 🐛 **Logic Bugs:** ${bugCount}\n`;
      reviewBody += `- 💡 **Code Smells & Improvements:** ${smellCount}\n\n`;
      reviewBody += `*Generated automatically by [ReviewCopilot](https://github.com/aamir2003-star/codereview).*`;

      // Format inline comments for GitHub API
      const inlineComments = comments.map((c) => {
        let body = `### 🤖 AI Review Finding: \`${c.severity.toUpperCase()}\`\n\n${c.message}\n\n`;
        if (c.suggestedFix) {
          body += `\`\`\`suggestion\n${c.suggestedFix}\n\`\`\``;
        }
        return {
          path: c.filePath,
          line: c.lineNumber,
          side: 'RIGHT' as const,
          body,
        };
      });

      let githubReviewUrl = '';
      let publishedCommentsCount = 0;

      // Determine event status: REQUEST_CHANGES if security issues found, else COMMENT
      const event = securityCount > 0 ? 'REQUEST_CHANGES' : 'COMMENT';

      try {
        // Attempt to submit review with inline comments
        const githubReview = await githubService.createPullRequestReview(
          accessToken,
          review.owner,
          review.repo,
          review.pullNumber,
          {
            commit_id: headSha,
            body: reviewBody,
            event,
            comments: inlineComments.length > 0 ? inlineComments : undefined,
          }
        );
        githubReviewUrl = githubReview.html_url;
        publishedCommentsCount = inlineComments.length;
      } catch (reviewErr) {
        console.warn('[PublishToGithub] Inline review failed, falling back to summary issue comment:', reviewErr);

        // Fallback: Submit high-level summary as an issue comment so findings are preserved
        const issueComment = await githubService.createIssueComment(
          accessToken,
          review.owner,
          review.repo,
          review.pullNumber,
          reviewBody
        );
        githubReviewUrl = issueComment.html_url;
      }

      // Update Review and Comments in database
      review.publishedToGithub = true;
      review.githubReviewUrl = githubReviewUrl;
      await review.save();

      await Comment.updateMany(
        { reviewId: review._id },
        { $set: { publishedToGithub: true, githubCommentUrl: githubReviewUrl } }
      );

      // Notify clients via Socket.io
      const io = getIO();
      io?.to(`review:${review._id.toString()}`).emit('review:published_to_github', {
        reviewId: review._id.toString(),
        githubReviewUrl,
      });

      res.status(200).json({
        success: true,
        published: true,
        githubReviewUrl,
        commentsCount: publishedCommentsCount,
      });
    } catch (err) {
      console.error('[PublishReviewToGithub Error]:', err);
      const rawMsg = err instanceof Error ? err.message : 'Unknown error';
      const is403 = rawMsg.includes('403') || rawMsg.includes('Resource not accessible');
      const userMessage = is403
        ? 'GitHub permission denied (403). Your current session lacks repository write permissions. Please log out and sign back in to grant write access.'
        : rawMsg;

      res.status(500).json({
        error: userMessage,
        details: rawMsg,
      });
    }
  },

  /**
   * POST /comments/:id/publish-github
   * Publishes a single inline review comment to GitHub.
   */
  async publishSingleCommentToGithub(req: AuthenticatedRequest, res: Response): Promise<void> {
    const commentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user?.userId;

    if (!commentId || !mongoose.isValidObjectId(commentId) || !userId) {
      res.status(400).json({ error: 'Valid comment ID and authentication required' });
      return;
    }

    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      const review = await Review.findById(comment.reviewId);
      if (!review) {
        res.status(404).json({ error: 'Associated review not found' });
        return;
      }

      const accessToken = await getUserAccessToken(userId);

      const prDetails = await githubService.getPullRequest(
        accessToken,
        review.owner,
        review.repo,
        review.pullNumber
      );
      const headSha = prDetails.head.sha;

      let body = `### 🤖 ReviewCopilot AI Suggestion: \`${comment.severity.toUpperCase()}\`\n\n${comment.message}\n\n`;
      if (comment.suggestedFix) {
        body += `\`\`\`suggestion\n${comment.suggestedFix}\n\`\`\``;
      }

      const githubComment = await githubService.createPullRequestComment(
        accessToken,
        review.owner,
        review.repo,
        review.pullNumber,
        {
          commit_id: headSha,
          path: comment.filePath,
          line: comment.lineNumber,
          side: 'RIGHT',
          body,
        }
      );

      comment.publishedToGithub = true;
      comment.githubCommentUrl = githubComment.html_url;
      await comment.save();

      const io = getIO();
      io?.to(`review:${comment.reviewId.toString()}`).emit('comment:published_to_github', {
        reviewId: comment.reviewId.toString(),
        commentId: comment._id.toString(),
        githubCommentUrl: githubComment.html_url,
      });

      res.status(200).json({
        success: true,
        comment,
        githubCommentUrl: githubComment.html_url,
      });
    } catch (err) {
      console.error('[PublishSingleCommentToGithub Error]:', err);
      const rawMsg = err instanceof Error ? err.message : 'Unknown error';
      const is403 = rawMsg.includes('403') || rawMsg.includes('Resource not accessible');
      const userMessage = is403
        ? 'GitHub permission denied (403). Your current session lacks repository write permissions. Please log out and sign back in to grant write access.'
        : rawMsg;

      res.status(500).json({
        error: userMessage,
        details: rawMsg,
      });
    }
  },
};
