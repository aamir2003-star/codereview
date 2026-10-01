import { Request, Response, NextFunction } from 'express';
import { prExportService } from '../services/pr-export.service';

/**
 * Validates a webhook URL to prevent Server-Side Request Forgery (SSRF).
 * Rejects private, loopback, and cloud metadata addresses.
 */
function isSafePublicWebhookUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, internal domains, and IPv6 loopback
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      return false;
    }

    // Block IPv4 private & loopback ranges (127.0.0.0/8, 10.0.0.0/8, 172.16-31.0.0/12, 192.168.0.0/16, 169.254.169.254)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [_, o1, o2] = match.map(Number);
      if (o1 === 127) return false; // Loopback
      if (o1 === 10) return false; // Class A private
      if (o1 === 169 && o2 === 254) return false; // Link-local / Cloud metadata (AWS/GCP/Azure)
      if (o1 === 192 && o2 === 168) return false; // Class C private
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false; // Class B private
      if (o1 === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export class PrExportController {
  /**
   * GET /export/report?repo=owner/repo&pr=123
   * Export Markdown / JSON security & quality audit report.
   */
  async exportReport(req: Request, res: Response, next?: NextFunction): Promise<void> {
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
      if (next) next(error);
      else res.status(500).json({ error: 'Failed to generate audit report' });
    }
  }

  /**
   * POST /export/webhook
   * Dispatch audit results to validated public webhook URL.
   */
  async dispatchWebhook(req: Request, res: Response, next?: NextFunction): Promise<void> {
    try {
      const { targetWebhookUrl, repo, prNumber } = req.body;

      if (!targetWebhookUrl || !repo || !prNumber) {
        res.status(400).json({ error: 'targetWebhookUrl, repo, and prNumber are required' });
        return;
      }

      // Strict SSRF validation
      if (!isSafePublicWebhookUrl(targetWebhookUrl)) {
        res.status(400).json({
          error: 'Invalid targetWebhookUrl. Internal, loopback, and metadata URLs are rejected for security.',
        });
        return;
      }

      const report = await prExportService.generateAuditReport(repo, Number(prNumber));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'audit.completed',
          timestamp: new Date().toISOString(),
          report,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      res.status(200).json({
        success: true,
        dispatched: true,
        remoteStatus: response.status,
      });
    } catch (error) {
      console.error('[PrExportController.dispatchWebhook] Error:', error);
      if (next) next(error);
      else res.status(500).json({ error: 'Failed to dispatch webhook' });
    }
  }
}

export const prExportController = new PrExportController();
