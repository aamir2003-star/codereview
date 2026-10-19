import { Request, Response } from 'express';
import { MemoryQueue } from '../queue/memory-queue';
import { DeadLetterService } from '../queue/dead-letter.service';

export const reviewQueue = new MemoryQueue('pr-reviews');
export const exportQueue = new MemoryQueue('exports');
export const reviewDeadLetter = new DeadLetterService(reviewQueue);

export const queueController = {
  getQueueMetrics(req: Request, res: Response): void {
    const reviewMetrics = reviewQueue.getMetrics();
    const exportMetrics = exportQueue.getMetrics();

    res.status(200).json({
      queues: {
        'pr-reviews': reviewMetrics,
        exports: exportMetrics,
      },
      deadLettersCount: reviewDeadLetter.listAll().length,
    });
  },

  listDeadLetters(req: Request, res: Response): void {
    res.status(200).json({ deadLetters: reviewDeadLetter.listAll() });
  },

  async replayDeadLetter(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const replayed = await reviewDeadLetter.replay(id);
    if (replayed) {
      res.status(200).json({ success: true, message: 'Job replayed' });
    } else {
      res.status(404).json({ error: 'Dead letter job not found' });
    }
  },

  pauseQueue(req: Request, res: Response): void {
    const queueName = Array.isArray(req.params.queueName) ? req.params.queueName[0] : req.params.queueName;
    if (queueName === 'pr-reviews') {
      reviewQueue.pause();
    } else if (queueName === 'exports') {
      exportQueue.pause();
    }
    res.status(200).json({ success: true, status: 'paused' });
  },

  resumeQueue(req: Request, res: Response): void {
    const queueName = Array.isArray(req.params.queueName) ? req.params.queueName[0] : req.params.queueName;
    if (queueName === 'pr-reviews') {
      reviewQueue.resume();
    } else if (queueName === 'exports') {
      exportQueue.resume();
    }
    res.status(200).json({ success: true, status: 'resumed' });
  },
};
