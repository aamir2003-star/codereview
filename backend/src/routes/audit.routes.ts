import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { auditController } from '../controllers/audit.controller';

const router = Router();

router.use(requireAuth);

router.get('/:orgId', requireOrgRole('admin'), auditController.getOrgAuditLogs);

export default router;
