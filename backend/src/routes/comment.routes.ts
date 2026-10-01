import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Toggle resolve on a comment
router.patch('/:id/resolve', reviewController.resolveComment);

// Toggle upvote on a comment
router.patch('/:id/upvote', reviewController.upvoteComment);

// Publish single comment to GitHub PR
router.post('/:id/publish-github', reviewController.publishSingleCommentToGithub);

export default router;
