import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadController } from '../controllers/upload.controller';

const router = Router();

router.use(requireAuth);

router.post('/chunk', uploadController.handleChunk);
router.post('/bundle-diff', uploadController.analyzeBundle);

export default router;
