import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { prExportController } from '../controllers/pr-export.controller';

const router = Router();

// Route to generate and download audit report
router.get('/report', requireAuth, (req, res, next) => prExportController.exportReport(req, res, next));

// Route to trigger webhook notification for CI/CD integrations
router.post('/webhook', requireAuth, (req, res, next) => prExportController.dispatchWebhook(req, res, next));

export default router;
