import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { decrypt } from '../utils/crypto';
import { githubService, GitHubApiError } from '../services/github.service';
import { geminiService, GeminiApiError, GeminiComment } from '../services/gemini.service';

async function getUserAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user || !user.accessToken) {
    throw new Error('User access token not found');
  }
  return decrypt(user.accessToken);
}

// Concurrency limiter — run at most N promises simultaneously
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
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

export interface FileReviewResult {
  filename: string;
  status: 'ok' | 'error' | 'skipped';
  comments: GeminiComment[];
  error?: string;
}

export const reviewController = {
  /**
   * POST /review/file
   * Single-shot review of one file's diff patch (Milestone 3)
   */
  async reviewSingleFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { filename, patch } = req.body as { filename?: string; patch?: string };

    if (!filename || !patch) {
      res.status(400).json({ error: 'filename and patch are required in request body' });
      return;
    }

    try {
      const comments = await geminiService.reviewFileDiff(filename, patch);
      res.status(200).json({ filename, comments, total: comments.length });
    } catch (err) {
      if (err instanceof GeminiApiError) {
        console.error('[ReviewSingleFile Error]:', err.message);
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Review failed' });
    }
  },

  /**
   * POST /review/pr
   * Review all changed files in a pull request with limited concurrency
   */
  async reviewPullRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { owner, repo, pullNumber } = req.body as {
      owner?: string;
      repo?: string;
      pullNumber?: number;
    };

    if (!owner || !repo || !pullNumber) {
      res.status(400).json({ error: 'owner, repo, and pullNumber are required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const accessToken = await getUserAccessToken(req.user.userId);

      // Fetch changed files from GitHub
      const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);

      // Cap to first 10 files (v1 limitation per PRD)
      const filesToReview = files.slice(0, 10);

      // Build review tasks per file
      const tasks = filesToReview.map((file) => async (): Promise<FileReviewResult> => {
        if (!file.patch) {
          return { filename: file.filename, status: 'skipped', comments: [] };
        }

        try {
          const comments = await geminiService.reviewFileDiff(file.filename, file.patch);
          return { filename: file.filename, status: 'ok', comments };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return { filename: file.filename, status: 'error', comments: [], error: message };
        }
      });

      // Run with concurrency of 3 (per architecture doc)
      const results = await runWithConcurrency(tasks, 3);

      const totalComments = results.reduce((sum, r) => sum + r.comments.length, 0);

      res.status(200).json({
        owner,
        repo,
        pullNumber,
        filesReviewed: results.length,
        totalFilesChanged: files.length,
        totalComments,
        results,
      });
    } catch (err) {
      console.error('[ReviewPullRequest Error]:', err);
      if (err instanceof GitHubApiError) {
        res.status(err.statusCode || 500).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Failed to review pull request' });
    }
  },
};
