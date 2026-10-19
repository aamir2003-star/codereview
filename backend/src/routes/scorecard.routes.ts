import { Router } from 'express';
import { scorecardController } from '../controllers/scorecard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all scorecard and audit endpoints with JWT authentication
router.use(requireAuth);

// Get calculated quality scorecard for a specific review
router.get('/:reviewId', scorecardController.getScorecard);

// Get audit event history for a PR
router.get('/audit/:owner/:repo/:pullNumber', scorecardController.getAuditHistory);

// Manually record an audit event from client workflows
router.post('/audit', scorecardController.logAuditEvent);

export default router;
