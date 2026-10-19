import { Router } from 'express';
import { scorecardController } from '../controllers/scorecard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all scorecard and audit endpoints with JWT authentication
router.use(requireAuth);

// Manually record an audit event from client workflows
router.post('/audit', scorecardController.logAuditEvent);

// Get audit event history for a PR (specific multi-segment route)
router.get('/audit/:owner/:repo/:pullNumber', scorecardController.getAuditHistory);

// Get calculated quality scorecard for a specific review (parameterized route)
router.get('/:reviewId', scorecardController.getScorecard);

export default router;
