import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-code-review-copilot-backend',
  });
});

router.get('/health/ready', (_req: Request, res: Response) => {
  const isReady = mongoose.connection.readyState === 2;
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'degraded',
    dbState: mongoose.connection.readyState,
  });
});

export default router;
