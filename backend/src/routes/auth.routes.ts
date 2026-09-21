import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public OAuth routes
router.get('/github', authController.redirectToGitHub);
router.get('/github/callback', authController.handleCallback);

// Protected routes
router.get('/me', requireAuth, authController.getMe);

export default router;
