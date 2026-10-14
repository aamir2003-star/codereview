import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { policyController } from '../controllers/policy.controller';

const router = Router();

router.use(requireAuth);

router.get('/:orgId', requireOrgRole('member'), policyController.getPolicy);
router.put('/:orgId', requireOrgRole('admin'), policyController.updatePolicy);
router.post('/:orgId/evaluate', requireOrgRole('member'), policyController.evaluateDiff);

export default router;
