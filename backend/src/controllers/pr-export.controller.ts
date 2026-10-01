import { Request, Response } from 'express';
import { prExportService } from '../services/pr-export.service';

export class PrExportController {
  /**
   * GET /export/report?repo=owner/repo&pr=123
   * Export Markdown / JSON security & quality audit report.
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const repo = req.query.repo as string;
      const prNumber = parseInt(req.query.pr as string, 10);

      if (!repo || isNaN(prNumber)) {
        res.status(400).json({ error: 'Missing required query parameters: repo and pr' });
        return;
      }

      const report = await prExportService.generateAuditReport(repo, prNumber);

      const format = (req.query.format as string) || 'json';
      if (format === 'markdown') {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit-report-${prNumber}.md"`);
        res.send(report.markdownSummary);
        return;
      }

      res.status(200).json({ success: true, report });
    } catch (error) {
      console.error('[PrExportController.exportReport] Error:', error);
      res.status(500).json({ error: 'Failed to generate audit report' });
    }
  }

  /**
   * POST /export/webhook
   * Dispatch audit results to custom webhook URL.
   *
   * TRICKY BUG 1: SSRF (Server-Side Request Forgery)
   * The endpoint accepts any unvalidated URL directly from req.body and performs an HTTP POST,
   * allowing internal port scanning, accessing AWS metadata (http://169.254.169.254), or local services.
   */
  async dispatchWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { targetWebhookUrl, repo, prNumber } = req.body;

      if (!targetWebhookUrl || !repo || !prNumber) {
        res.status(400).json({ error: 'targetWebhookUrl, repo, and prNumber are required' });
        return;
      }

      const report = await prExportService.generateAuditReport(repo, Number(prNumber));

      // Unsafe direct fetch to user-provided URL without private IP / domain validation
      const response = await fetch(targetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'audit.completed',
          timestamp: new Date().toISOString(),
          report,
        }),
      });

      res.status(200).json({
        success: true,
        dispatched: true,
        remoteStatus: response.status,
      });
    } catch (error) {
      console.error('[PrExportController.dispatchWebhook] Error:', error);
      res.status(500).json({ error: 'Failed to dispatch webhook' });
    }
  }
}

export const prExportController = new PrExportController();
