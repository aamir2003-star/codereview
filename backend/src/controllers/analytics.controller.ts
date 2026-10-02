import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { config } from '../config/env';

function formatErrorResponse(res: Response, message: string, error: unknown, status = 500) {
  const errMsg = error instanceof Error ? error.message : 'Internal server error';
  console.error(`[Analytics Error] ${message}:`, errMsg);

  return res.status(status).json({
    success: false,
    error: message,
    ...(config.nodeEnv === 'development' ? { details: errMsg } : {}),
  });
}

/**
 * GET /api/analytics/:owner/:repo/health/:reviewId
 * Generate a health report for a specific pull request review.
 */
export async function getPrHealthReport(req: Request, res: Response) {
  try {
    const { reviewId } = req.params;
    if (!reviewId) {
      return res.status(400).json({ success: false, error: 'Review ID is required' });
    }

    const report = await analyticsService.generatePrHealthReport(reviewId);
    return res.json({ success: true, data: report });
  } catch (error) {
    return formatErrorResponse(res, 'Failed to generate PR health report', error);
  }
}

/**
 * GET /api/analytics/:owner/:repo/developers
 * Retrieve developer-level metrics for a repository.
 */
export async function getDeveloperMetrics(req: Request, res: Response) {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: 'Owner and repo are required' });
    }

    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 10), 100);
    const metrics = await analyticsService.getDeveloperMetrics(owner, repo, limit);
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return formatErrorResponse(res, 'Failed to retrieve developer metrics', error);
  }
}

/**
 * GET /api/analytics/:owner/:repo/trend
 * Retrieve weekly trend data for a repository.
 */
export async function getWeeklyTrend(req: Request, res: Response) {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: 'Owner and repo are required' });
    }

    const weeks = Math.min(Math.max(1, parseInt(req.query.weeks as string) || 8), 52);
    const trend = await analyticsService.getWeeklyTrend(owner, repo, weeks);
    return res.json({ success: true, data: trend });
  } catch (error) {
    return formatErrorResponse(res, 'Failed to retrieve weekly trend', error);
  }
}

/**
 * GET /api/analytics/:owner/:repo/summary
 * Full analytics summary for the repository dashboard.
 */
export async function getAnalyticsSummary(req: Request, res: Response) {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: 'Owner and repo are required' });
    }

    const summary = await analyticsService.getAnalyticsSummary(owner, repo);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return formatErrorResponse(res, 'Failed to retrieve analytics summary', error);
  }
}

/**
 * GET /api/analytics/:owner/:repo/leaderboard
 * Returns a ranked leaderboard of developers by resolved rate and risk score.
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) {
      return res.status(400).json({ success: false, error: 'Owner and repo are required' });
    }

    const metrics = await analyticsService.getDeveloperMetrics(owner, repo, 25);

    const leaderboard = metrics
      .map((dev, index) => ({
        rank: index + 1,
        ...dev,
        badge:
          dev.resolvedRate >= 0.9
            ? 'gold'
            : dev.resolvedRate >= 0.7
              ? 'silver'
              : dev.resolvedRate >= 0.5
                ? 'bronze'
                : 'none',
      }))
      .sort((a, b) => {
        if (b.resolvedRate !== a.resolvedRate) return b.resolvedRate - a.resolvedRate;
        return a.riskScore - b.riskScore;
      });

    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    return res.json({ success: true, data: leaderboard });
  } catch (error) {
    return formatErrorResponse(res, 'Failed to retrieve leaderboard', error);
  }
}
