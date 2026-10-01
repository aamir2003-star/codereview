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
router.get('/:repoFullName/health/:reviewId', getPrHealthReport);

// Developer metrics for a repo
router.get('/:repoFullName/developers', getDeveloperMetrics);

// Weekly trend data
router.get('/:repoFullName/trend', getWeeklyTrend);

// Full summary dashboard
router.get('/:repoFullName/summary', getAnalyticsSummary);

// Developer leaderboard
router.get('/:repoFullName/leaderboard', getLeaderboard);

export default router;
