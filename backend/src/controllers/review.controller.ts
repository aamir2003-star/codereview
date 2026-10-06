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

// Phase 2: Cross-file context mapping (UPGRADED)
// Two types of context:
// 1. Dynamic: Related files from the PR diff (other changed files)
// 2. Static: Actual repo files fetched via GitHub API (routes, models, schemas)
//    These are ALWAYS fetched even if not changed in the PR.
const CONTEXT_RULES: Array<{
  pattern: RegExp;
  dynamicPatterns: RegExp[];
  staticPaths: string[];
  description: string;
}> = [
  {
    pattern: /frontend\/lib\/(api|review-api|repo-api)\.ts/,
    dynamicPatterns: [/backend\/src\/routes\//],
    staticPaths: [
      'backend/src/routes/review.routes.ts',
      'backend/src/routes/comment.routes.ts',
      'backend/src/routes/repo.routes.ts',
      'backend/src/routes/auth.routes.ts',
    ],
    description: 'Frontend API calls need backend route definitions for HTTP method/path verification',
  },
  {
    pattern: /backend\/src\/controllers\//,
    dynamicPatterns: [/backend\/src\/models\//],
    staticPaths: [
      'backend/src/models/Review.ts',
      'backend/src/models/Comment.ts',
      'backend/src/models/User.ts',
      'backend/src/middleware/auth.middleware.ts',
    ],
    description: 'Controllers need model schemas for type/field verification and middleware for userId type',
  },
  {
    pattern: /backend\/src\/middleware\//,
    dynamicPatterns: [/backend\/src\/controllers\//],
    staticPaths: [
      'backend/src/config/env.ts',
    ],
    description: 'Middleware needs config context',
  },
  {
    pattern: /backend\/src\/services\//,
    dynamicPatterns: [/backend\/src\/models\//],
    staticPaths: [
      'backend/src/models/Review.ts',
      'backend/src/models/Comment.ts',
    ],
    description: 'Services need model schemas',
  },
  {
    pattern: /frontend\/hooks\//,
    dynamicPatterns: [/frontend\/components\//, /frontend\/lib\//],
    staticPaths: [],
    description: 'Hooks need component and library context',
  },
  {
    pattern: /frontend\/components\//,
    dynamicPatterns: [/frontend\/hooks\//, /frontend\/lib\//],
    staticPaths: [],
    description: 'Components need hooks and API context',
  },
  {
    pattern: /backend\/src\/models\//,
    dynamicPatterns: [/backend\/src\/controllers\//],
    staticPaths: [],
    description: 'Models need controller context to verify query consistency',
  },
];

function getRelatedFilesFromDiff(
  filename: string,
  allFiles: Array<{ filename: string; patch?: string }>
): Array<{ filename: string; snippet: string }> {
  const related: Array<{ filename: string; snippet: string }> = [];

  for (const rule of CONTEXT_RULES) {
    if (rule.pattern.test(filename)) {
      for (const dynamicPattern of rule.dynamicPatterns) {
        for (const file of allFiles) {
          if (dynamicPattern.test(file.filename) && file.filename !== filename && file.patch) {
            related.push({ filename: file.filename, snippet: file.patch });
          }
        }
      }
    }
  }

  return related;
}

function getStaticContextPaths(filename: string): string[] {
  const paths: string[] = [];

  for (const rule of CONTEXT_RULES) {
    if (rule.pattern.test(filename)) {
      paths.push(...rule.staticPaths);
    }
  }

  // Deduplicate
  return [...new Set(paths)];
}

async function fetchStaticContextFiles(
  accessToken: string,
  owner: string,
  repo: string,
  filename: string,
  prRef?: string
): Promise<Array<{ filename: string; snippet: string }>> {
  const staticPaths = getStaticContextPaths(filename);
  if (staticPaths.length === 0) return [];

  const results: Array<{ filename: string; snippet: string }> = [];

  await Promise.all(
    staticPaths.map(async (path) => {
      try {
        const content = await githubService.getFileContent(accessToken, owner, repo, path, prRef);
        if (content) {
          // Truncate to keep token count manageable
          const trimmed = content.length > 3000 ? content.slice(0, 3000) + '\n... [truncated]' : content;
          results.push({ filename: path, snippet: trimmed });
        }
      } catch {
        // Silently skip files that don't exist
      }
    })
  );

  return results;
}

// Phase 4: Security-sensitive file patterns
const SECURITY_PATTERNS = [
  /middleware\/auth/i,
  /controllers\/auth/i,
  /middleware/i,
  /\.middleware\./i,
  /controllers\/repo/i,
  /services\/github/i,
  /config\/env/i,
  /crypto/i,
  /session/i,
  /cookie/i,
  /passport/i,
];

function isSecuritySensitive(filename: string): boolean {
  return SECURITY_PATTERNS.some((pattern) => pattern.test(filename));
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

    // Smart Cache: Check if a review already exists for this PR
    let review = await Review.findOne({ owner, repo, pullNumber });
    let existingCommentsList: Array<{ filePath: string; line: number; message: string }> = [];

    if (review) {
      // Re-run requested: fetch existing comments to skip them
      console.log(`[Review] Re-running review for ${owner}/${repo} #${pullNumber}. Fetching existing comments to prevent duplicates.`);
      const existingDocs = await Comment.find({ reviewId: review._id });
      existingCommentsList = existingDocs.map(c => ({
        filePath: c.filePath,
        line: c.lineNumber,
        message: c.message
      }));
      // Reset status to pending
      review.status = 'pending';
      await review.save();
    } else {
      // First time reviewing this PR
      review = await Review.create({
        prUrl: prUrl || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
        owner,
        repo,
        pullNumber,
        prTitle: prTitle || `PR #${pullNumber}`,
        requestedBy: new mongoose.Types.ObjectId(req.user.userId),
        status: 'pending',
      });
    }

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

        // Generate or re-use CodeRabbit-style PR Architecture & Walkthrough
        if (review.architectureSummary && review.architectureSummary.highLevelSummary) {
          console.log(`[Review] Using existing PR Architecture summary for #${pullNumber}.`);
          io?.to(`review:${reviewId}`).emit('review:architecture', {
            reviewId,
            architecture: review.architectureSummary,
          });
        } else {
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
        const CONCURRENCY_LIMIT = 3;

        // Phase 2 (upgraded): Pre-fetch static context files from the repo
        // These are actual source files (routes, models, schemas) fetched via GitHub API,
        // NOT from the PR diff. This lets the AI cross-reference even unchanged files.
        const staticContextCache = new Map<string, Array<{ filename: string; snippet: string }>>();
        try {
          const allStaticPaths = new Set<string>();
          for (const file of filesToReview) {
            for (const path of getStaticContextPaths(file.filename)) {
              allStaticPaths.add(path);
            }
          }

          if (allStaticPaths.size > 0) {
            console.log(`[Review] Pre-fetching ${allStaticPaths.size} static context files from repo...`);
            const fetchedFiles = new Map<string, string>();

            await Promise.all(
              [...allStaticPaths].map(async (path) => {
                try {
                  const content = await githubService.getFileContent(accessToken, owner, repo, path);
                  if (content) {
                    const trimmed = content.length > 3000 ? content.slice(0, 3000) + '\n... [truncated]' : content;
                    fetchedFiles.set(path, trimmed);
                  }
                } catch {
                  // Skip files that don't exist
                }
              })
            );

            // Build per-file context cache
            for (const file of filesToReview) {
              const staticPaths = getStaticContextPaths(file.filename);
              const contextForFile: Array<{ filename: string; snippet: string }> = [];
              for (const path of staticPaths) {
                const content = fetchedFiles.get(path);
                if (content) {
                  contextForFile.push({ filename: path, snippet: content });
                }
              }
              if (contextForFile.length > 0) {
                staticContextCache.set(file.filename, contextForFile);
              }
            }

            console.log(`[Review] Static context ready for ${staticContextCache.size} file(s).`);
          }
        } catch (ctxErr) {
          console.warn('[Review] Failed to pre-fetch static context (non-fatal):', ctxErr);
        }

        // Process files concurrently with bounded worker pool (3-4x faster than sequential)
        let fileIndex = 0;
        const workers: Promise<void>[] = [];
        const activeCount = Math.min(CONCURRENCY_LIMIT, filesToReview.length);

        for (let w = 0; w < activeCount; w++) {
          workers.push(
            (async () => {
              while (fileIndex < filesToReview.length) {
                if (activeReviewAborts.get(reviewId)) {
                  break;
                }

                const i = fileIndex++;
                const file = filesToReview[i];
                if (!file) break;

                const currentPercent = Math.min(94, Math.round(((filesReviewedCount + 0.5) / filesToReview.length) * 85) + 10);

                io?.to(`review:${reviewId}`).emit('review:progress', {
                  reviewId,
                  filesReviewed: filesReviewedCount,
                  totalFiles: filesToReview.length,
                  percent: currentPercent,
                  stage: `Auditing ${file.filename}...`,
                  currentFile: file.filename,
                  totalComments,
                });

                if (!file.patch) {
                  filesReviewedCount++;
                  continue;
                }

                try {
                  console.log(`[Review] Analyzing file [${i + 1}/${filesToReview.length}]: ${file.filename} (${file.patch.length} chars)`);

                  // Phase 2 (upgraded): Combine dynamic (PR diff) + static (repo files) context
                  const dynamicContext = getRelatedFilesFromDiff(file.filename, filesToReview);
                  const staticContext = staticContextCache.get(file.filename) || [];
                  // Merge and deduplicate by filename
                  const seenFiles = new Set<string>();
                  const contextFiles: Array<{ filename: string; snippet: string }> = [];
                  for (const ctx of [...staticContext, ...dynamicContext]) {
                    if (!seenFiles.has(ctx.filename)) {
                      seenFiles.add(ctx.filename);
                      contextFiles.push(ctx);
                    }
                  }
                  if (contextFiles.length > 0) {
                    console.log(`[Review] Injecting ${contextFiles.length} context file(s) for ${file.filename} (${staticContext.length} from repo, ${dynamicContext.length} from PR)`);
                  }

                  const existingForFile = existingCommentsList.filter(c => c.filePath === file.filename);

                  const comments = await geminiService.reviewFileDiff(file.filename, file.patch, contextFiles, existingForFile);

                  // Phase 4: Run dedicated security scanner on sensitive files
                  if (isSecuritySensitive(file.filename)) {
                    console.log(`[Security] Running security scan on ${file.filename}...`);
                    try {
                      const secComments = await geminiService.securityScanFile(file.filename, file.patch, contextFiles, existingForFile);
                      // Deduplicate: only add security comments that don't overlap with existing
                      for (const sc of secComments) {
                        const isDuplicate = comments.some(
                          (c) => Math.abs(c.line - sc.line) <= 2 && c.severity === sc.severity
                        );
                        if (!isDuplicate) {
                          comments.push(sc);
                        }
                      }
                      console.log(`[Security] Found ${secComments.length} security-specific issues in ${file.filename}`);
                    } catch (secErr) {
                      console.warn(`[Security] Security scan failed for ${file.filename}:`, secErr instanceof Error ? secErr.message : secErr);
                    }
                  }

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

                    for (const doc of docs) {
                      io?.to(`review:${reviewId}`).emit('comment:new', {
                        reviewId,
                        comment: doc.toObject(),
                      });
                    }
                  }
                } catch (err) {
                  console.error(`[Review] Error analyzing ${file.filename}:`, err instanceof Error ? err.message : err);
                  const errMsg = err instanceof Error ? err.message : String(err);
                  const isHighDemand =
                    errMsg.includes('429') ||
                    errMsg.includes('503') ||
                    errMsg.includes('high demand') ||
                    errMsg.includes('UNAVAILABLE') ||
                    errMsg.includes('RESOURCE_EXHAUSTED') ||
                    errMsg.includes('quota');

                  if (isHighDemand) {
                    throw err;
                  }

                  io?.to(`review:${reviewId}`).emit('file:error', {
                    reviewId,
                    filename: file.filename,
                    error: errMsg || 'Analysis failed',
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

                const stepCompletePercent = Math.min(95, Math.round((filesReviewedCount / filesToReview.length) * 85) + 10);

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
            })()
          );
        }

        await Promise.all(workers);

        // Phase 3: Cross-file integration review — analyze ALL files together
        if (!activeReviewAborts.get(reviewId) && filesToReview.length > 1) {
          try {
            io?.to(`review:${reviewId}`).emit('review:progress', {
              reviewId,
              filesReviewed: filesReviewedCount,
              totalFiles: filesToReview.length,
              percent: 96,
              stage: 'Running cross-file integration analysis...',
              currentFile: 'Cross-File Consistency Check',
              totalComments,
            });

            console.log(`[Review] Starting cross-file integration review for ${filesToReview.length} files...`);

            // Collect all unique static context files for the cross-file review
            const allStaticContext: Array<{ filename: string; snippet: string }> = [];
            const seenStaticFiles = new Set<string>();
            for (const [, ctxFiles] of staticContextCache) {
              for (const ctx of ctxFiles) {
                if (!seenStaticFiles.has(ctx.filename)) {
                  seenStaticFiles.add(ctx.filename);
                  allStaticContext.push(ctx);
                }
              }
            }

            const crossFileComments = await geminiService.crossFileIntegrationReview(
              filesToReview
                .filter((f) => f.patch)
                .map((f) => ({ filename: f.filename, patch: f.patch! })),
              allStaticContext.length > 0 ? allStaticContext : undefined,
              existingCommentsList.filter(c => c.filePath === 'cross-file')
            );

            if (crossFileComments.length > 0) {
              // Assign cross-file comments to the first mentioned file in the message
              const crossDocs = await Comment.insertMany(
                crossFileComments.map((c) => ({
                  reviewId: review._id,
                  filePath: 'cross-file',
                  lineNumber: c.line,
                  severity: c.severity,
                  message: c.message,
                  suggestedFix: c.suggestedFix || undefined,
                }))
              );

              totalComments += crossDocs.length;
              console.log(`[Review] Cross-file review found ${crossDocs.length} integration issues.`);

              for (const doc of crossDocs) {
                io?.to(`review:${reviewId}`).emit('comment:new', {
                  reviewId,
                  comment: doc.toObject(),
                });
              }
            } else {
              console.log('[Review] Cross-file review found no integration issues.');
            }
          } catch (crossErr) {
            console.warn('[Review] Cross-file integration review failed (non-fatal):', crossErr instanceof Error ? crossErr.message : crossErr);
          }
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
          errMsg.includes('429') ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota');

        const userMessage = isHighDemand
          ? 'Due to heavy traffic on the AI review engine, we cannot review your code at this time. Please try again in a few moments.'
          : errMsg || 'Review process encountered an unexpected issue.';

        await Review.findByIdAndUpdate(review._id, {
          status: 'error',
          errorMessage: userMessage,
        });
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
