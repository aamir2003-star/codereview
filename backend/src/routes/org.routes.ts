import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { orgController } from '../controllers/org.controller';

const router = Router();

router.use(requireAuth);

router.post('/', orgController.createOrg);
router.get('/', orgController.getUserOrgs);
router.get('/:orgId', requireOrgRole('member'), orgController.getOrgById);
router.patch('/:orgId/members/role', requireOrgRole('admin'), orgController.updateMemberRole);
router.delete('/:orgId/members/:memberId', requireOrgRole('admin'), orgController.removeMember);

export default router;
