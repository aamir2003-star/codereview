import { Router } from 'express';
import { repoController } from '../controllers/repo.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All repo routes require authentication
router.use(requireAuth);

router.get('/', repoController.listRepos);
router.get('/:owner/:repo/prs', repoController.listPullRequests);
router.get('/:owner/:repo/prs/:number/diff', repoController.getPullRequestDiff);

export default router;
