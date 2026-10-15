import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { queueController } from '../controllers/queue.controller';

const router = Router();

router.use(requireAuth);

router.get('/metrics', queueController.getQueueMetrics);
router.get('/dead-letters', queueController.listDeadLetters);
router.post('/dead-letters/:id/replay', queueController.replayDeadLetter);
router.post('/:queueName/pause', queueController.pauseQueue);
router.post('/:queueName/resume', queueController.resumeQueue);

export default router;
