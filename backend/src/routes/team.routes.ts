import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireOrgRole } from '../middleware/rbac.middleware';
import { teamController } from '../controllers/team.controller';

const router = Router();

router.use(requireAuth);

router.post('/:orgId', requireOrgRole('admin'), teamController.createTeam);
router.get('/:orgId', requireOrgRole('member'), teamController.getOrgTeams);
router.post('/teams/:teamId/members', teamController.addMemberToTeam);
router.delete('/teams/:teamId/members/:memberId', teamController.removeMemberFromTeam);

export default router;
