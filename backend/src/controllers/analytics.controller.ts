import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

/**
 * GET /api/analytics/:repoFullName/health/:reviewId
 * Generate a health report for a specific pull request review.
 */
export async function getPrHealthReport(req: Request, res: Response) {
  try {
    const reviewId = req.params.reviewId as string;
    const report = await analyticsService.generatePrHealthReport(reviewId);
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('[Analytics] Health report error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/analytics/:repoFullName/developers
 * Retrieve developer-level metrics for a repository.
 */
export async function getDeveloperMetrics(req: Request, res: Response) {
  try {
    const repoFullName = req.params.repoFullName as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const decodedRepo = decodeURIComponent(repoFullName);

    const metrics = await analyticsService.getDeveloperMetrics(decodedRepo, limit);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('[Analytics] Developer metrics error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/analytics/:repoFullName/trend
 * Retrieve weekly trend data for a repository.
 */
export async function getWeeklyTrend(req: Request, res: Response) {
  try {
    const repoFullName = req.params.repoFullName as string;
    const weeks = parseInt(req.query.weeks as string) || 8;
    const decodedRepo = decodeURIComponent(repoFullName);

    const trend = await analyticsService.getWeeklyTrend(decodedRepo, weeks);
    res.json({ success: true, data: trend });
  } catch (error: any) {
    console.error('[Analytics] Trend error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/analytics/:repoFullName/summary
 * Full analytics summary for the repository dashboard.
 */
export async function getAnalyticsSummary(req: Request, res: Response) {
  try {
    const repoFullName = req.params.repoFullName as string;
    const decodedRepo = decodeURIComponent(repoFullName);

    const summary = await analyticsService.getAnalyticsSummary(decodedRepo);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('[Analytics] Summary error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/analytics/:repoFullName/leaderboard
 * Returns a ranked leaderboard of developers by resolved rate and risk score.
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const repoFullName = req.params.repoFullName as string;
    const decodedRepo = decodeURIComponent(repoFullName);

    const metrics = await analyticsService.getDeveloperMetrics(decodedRepo, 25);

    // Build a leaderboard ranked by resolved rate (descending), then risk (ascending)
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

    // Re-assign ranks after sort
    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('[Analytics] Leaderboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
