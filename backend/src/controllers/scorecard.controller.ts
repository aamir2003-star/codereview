import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { scorecardService } from '../services/scorecard.service';
import { AuditAction } from '../models/AuditLog';

export const scorecardController = {
  /**
   * GET /scorecard/:reviewId
   * Computes and returns the comprehensive quality scorecard for a review.
   */
  async getScorecard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawReviewId = req.params.reviewId;
    const reviewId = Array.isArray(rawReviewId) ? rawReviewId[0] : rawReviewId;

    if (!reviewId || typeof reviewId !== 'string' || !mongoose.Types.ObjectId.isValid(reviewId)) {
      res.status(400).json({ error: 'Valid reviewId parameter is required' });
      return;
    }

    try {
      const scorecard = await scorecardService.calculateScorecard(reviewId);
      res.status(200).json(scorecard);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }

      console.error('[ScorecardController] Failed to get scorecard:', message);
      res.status(500).json({ error: 'Failed to compute quality scorecard' });
    }
  },

  /**
   * GET /scorecard/audit/:owner/:repo/:pullNumber
   * Retrieves the audit trail of actions performed on a PR review.
   */
  async getAuditHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawOwner = req.params.owner;
    const rawRepo = req.params.repo;
    const rawPullNumber = req.params.pullNumber;

    const owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner;
    const repo = Array.isArray(rawRepo) ? rawRepo[0] : rawRepo;
    const pullNumber = Array.isArray(rawPullNumber) ? rawPullNumber[0] : rawPullNumber;

    if (!owner || !repo || !pullNumber) {
      res.status(400).json({ error: 'owner, repo, and pullNumber are required' });
      return;
    }

    const parsedPullNumber = parseInt(pullNumber, 10);
    if (isNaN(parsedPullNumber) || parsedPullNumber <= 0) {
      res.status(400).json({ error: 'pullNumber must be a positive integer' });
      return;
    }

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    try {
      const logs = await scorecardService.getAuditHistory(
        owner,
        repo,
        parsedPullNumber,
        isNaN(limit) ? 20 : limit
      );
      res.status(200).json({ auditLogs: logs });
    } catch (err) {
      console.error('[ScorecardController] Failed to retrieve audit history:', err);
      res.status(500).json({ error: 'Failed to retrieve audit history' });
    }
  },

  /**
   * POST /scorecard/audit
   * Explicitly records an audit action triggered by the client (e.g. comment resolution).
   */
  async logAuditEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, owner, repo, pullNumber, reviewId, metadata } = req.body;

    const validActions: AuditAction[] = [
      'review_triggered',
      'review_completed',
      'comment_resolved',
      'comment_upvoted',
      'github_published',
    ];

    if (!action || !validActions.includes(action)) {
      res.status(400).json({
        error: `action must be one of: ${validActions.join(', ')}`,
      });
      return;
    }

    if (!owner || !repo || typeof pullNumber !== 'number') {
      res.status(400).json({
        error: 'owner, repo, and numeric pullNumber are required',
      });
      return;
    }

    try {
      await scorecardService.recordAuditEvent({
        action,
        userId: new mongoose.Types.ObjectId(req.user.userId),
        owner,
        repo,
        pullNumber,
        reviewId: typeof reviewId === 'string' && mongoose.Types.ObjectId.isValid(reviewId) ? new mongoose.Types.ObjectId(reviewId) : undefined,
        metadata: typeof metadata === 'object' && metadata !== null ? metadata : undefined,
      });

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('[ScorecardController] Failed to record audit event:', err);
      res.status(500).json({ error: 'Failed to record audit event' });
    }
  },
};
