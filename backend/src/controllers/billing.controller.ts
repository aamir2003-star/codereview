import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { meteringService } from '../billing/metering.service';
import { Subscription } from '../models/Subscription';
import mongoose from 'mongoose';

export const billingController = {
  async getBillingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const quotaInfo = await meteringService.checkQuota(orgId);
      const subscription = await Subscription.findOne({
        organizationId: new mongoose.Types.ObjectId(orgId),
      });

      res.status(200).json({
        plan: subscription ? subscription.plan : 'free',
        status: subscription ? subscription.status : 'active',
        features: subscription ? subscription.features : {},
        quota: quotaInfo,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch billing status' });
    }
  },

  async upgradePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const { planTier } = req.body;

      if (!['starter', 'pro', 'enterprise'].includes(planTier)) {
        res.status(400).json({ error: 'Invalid plan tier' });
        return;
      }

      const subscription = await Subscription.findOneAndUpdate(
        { organizationId: new mongoose.Types.ObjectId(orgId) },
        {
          plan: planTier,
          status: 'active',
          monthlyTokenQuota: planTier === 'pro' ? 1000000 : planTier === 'enterprise' ? 10000000 : 250000,
        },
        { new: true, upsert: true }
      );

      res.status(200).json({ success: true, subscription });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to upgrade plan' });
    }
  },
};
