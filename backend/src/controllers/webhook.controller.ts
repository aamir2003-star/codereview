import { Request, Response } from 'express';
import crypto from 'crypto';
import { reviewQueue } from './queue.controller';

export const webhookController = {
  async handleGitHubWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;

    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev_webhook_secret';
    const rawBody = JSON.stringify(req.body);

    const hmac = crypto.createHmac('sha256', secret);
    const computedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    if (!signature || signature !== computedSignature) {
      console.warn('[Webhook] Signature verification mismatch');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    if (event === 'pull_request') {
      const action = req.body.action;
      const pr = req.body.pull_request;
      const repo = req.body.repository;

      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        await reviewQueue.add(
          'auto-review',
          {
            owner: repo.owner.login,
            repo: repo.name,
            pullNumber: pr.number,
            prUrl: pr.html_url,
            prTitle: pr.title,
            triggeredBy: 'webhook',
          },
          { priority: 'high' }
        );
      }
    }

    res.status(200).json({ received: true });
  },
};
