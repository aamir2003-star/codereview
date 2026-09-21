import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { decrypt } from '../utils/crypto';
import { githubService, GitHubApiError } from '../services/github.service';

async function getUserAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user || !user.accessToken) {
    throw new Error('User access token not found');
  }
  return decrypt(user.accessToken);
}

export const repoController = {
  /**
   * List authenticated user's repositories
   */
  async listRepos(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accessToken = await getUserAccessToken(req.user.userId);
      const repos = await githubService.getUserRepos(accessToken);

      res.status(200).json({ repos });
    } catch (err) {
      console.error('[ListRepos Error]:', err);
      if (err instanceof GitHubApiError) {
        res.status(err.statusCode || 500).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  },

  /**
   * List open pull requests for a specific repository
   */
  async listPullRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
    const repo = Array.isArray(req.params.repo) ? req.params.repo[0] : req.params.repo;

    if (!owner || !repo) {
      res.status(400).json({ error: 'Owner and repo parameters are required' });
      return;
    }

    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accessToken = await getUserAccessToken(req.user.userId);
      const prs = await githubService.getRepoPullRequests(accessToken, owner, repo);

      res.status(200).json({ prs });
    } catch (err) {
      console.error('[ListPullRequests Error]:', err);
      if (err instanceof GitHubApiError) {
        res.status(err.statusCode || 500).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch pull requests' });
    }
  },

  /**
   * Get file diffs for a specific pull request
   */
  async getPullRequestDiff(req: AuthenticatedRequest, res: Response): Promise<void> {
    const owner = Array.isArray(req.params.owner) ? req.params.owner[0] : req.params.owner;
    const repo = Array.isArray(req.params.repo) ? req.params.repo[0] : req.params.repo;
    const number = Array.isArray(req.params.number) ? req.params.number[0] : req.params.number;
    const pullNumber = parseInt(number || '', 10);

    if (!owner || !repo || isNaN(pullNumber)) {
      res.status(400).json({ error: 'Valid owner, repo, and PR number are required' });
      return;
    }

    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accessToken = await getUserAccessToken(req.user.userId);
      const files = await githubService.getPullRequestFiles(accessToken, owner, repo, pullNumber);

      res.status(200).json({
        owner,
        repo,
        pullNumber,
        filesCount: files.length,
        files,
      });
    } catch (err) {
      console.error('[GetPullRequestDiff Error]:', err);
      if (err instanceof GitHubApiError) {
        res.status(err.statusCode || 500).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch pull request diffs' });
    }
  },
};
