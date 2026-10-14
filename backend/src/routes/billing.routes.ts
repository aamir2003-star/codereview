import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { billingController } from '../controllers/billing.controller';

const router = Router();

router.use(requireAuth);

router.get('/:orgId', requireOrgRole('member'), billingController.getBillingStatus);
router.post('/:orgId/upgrade', requireOrgRole('owner'), billingController.upgradePlan);

export default router;
