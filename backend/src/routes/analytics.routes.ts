import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPrHealthReport,
  getDeveloperMetrics,
  getWeeklyTrend,
  getAnalyticsSummary,
  getLeaderboard,
} from '../controllers/analytics.controller';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

// PR-level health report
router.get('/:owner/:repo/health/:reviewId', getPrHealthReport);

// Developer metrics for a repository
router.get('/:owner/:repo/developers', getDeveloperMetrics);

// Weekly trend data
router.get('/:owner/:repo/trend', getWeeklyTrend);

// Full summary dashboard
router.get('/:owner/:repo/summary', getAnalyticsSummary);

// Developer leaderboard
router.get('/:owner/:repo/leaderboard', getLeaderboard);

export default router;
