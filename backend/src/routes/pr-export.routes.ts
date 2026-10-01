import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { prExportController } from '../controllers/pr-export.controller';

const router = Router();

// Route to generate and download audit report
router.get('/report', requireAuth, (req, res) => prExportController.exportReport(req, res));

// Route to trigger webhook notification for CI/CD integrations
router.post('/webhook', requireAuth, (req, res) => prExportController.dispatchWebhook(req, res));

export default router;
