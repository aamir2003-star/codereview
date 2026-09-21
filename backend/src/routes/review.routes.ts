import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All review routes require authentication
router.use(requireAuth);

// Single-file review (Milestone 3)
router.post('/file', reviewController.reviewSingleFile);

// Full PR review (Milestone 3+)
router.post('/pr', reviewController.reviewPullRequest);

export default router;
