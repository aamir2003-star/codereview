import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { policyService } from '../rules/policy.service';
import { ruleEngine } from '../rules/engine';

export const policyController = {
  async getPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const policy = await policyService.getPolicyForOrg(orgId);
      const allRules = ruleEngine.getRegisteredRules();

      res.status(200).json({
        policy,
        availableRules: allRules.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          category: r.category,
          severity: r.severity,
          enabled: policy.rules[r.id]?.enabled ?? r.enabled,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  },

  async updatePolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const updates = req.body;

      const updated = await policyService.updatePolicy(orgId, updates);
      res.status(200).json({ policy: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update policy' });
    }
  },

  async evaluateDiff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const { filename, patch } = req.body;

      if (!filename || !patch) {
        res.status(400).json({ error: 'filename and patch are required' });
        return;
      }

      const policy = await policyService.getPolicyForOrg(orgId);
      const findings = ruleEngine.evaluateFile(filename, patch, policy);

      res.status(200).json({
        filename,
        findings,
        passed: findings.filter((f) => f.severity === 'error').length === 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Policy evaluation failed' });
    }
  },
};
