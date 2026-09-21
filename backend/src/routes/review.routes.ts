import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All review routes require authentication
router.use(requireAuth);

// Trigger a new review for a PR
router.post('/', reviewController.triggerReview);

// Fetch a review + its comments by review ID
router.get('/:id', reviewController.getReview);

// Check if a review exists for a specific PR
router.get('/pr/:owner/:repo/:pullNumber', reviewController.getReviewByPr);

export default router;
