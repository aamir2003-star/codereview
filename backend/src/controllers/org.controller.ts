import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Organization, MemberRole } from '../models/Organization';
import { AuditLog } from '../models/AuditLog';
import { Subscription } from '../models/Subscription';
import mongoose from 'mongoose';
import { cache } from '../cache/cache.manager';

export const orgController = {
  async createOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, slug, billingEmail, description } = req.body;
      if (!name || !slug || !billingEmail) {
        res.status(400).json({ error: 'name, slug, and billingEmail are required' });
        return;
      }

      const existing = await Organization.findOne({ slug });
      if (existing) {
        res.status(409).json({ error: 'Organization slug already in use' });
        return;
      }

      const org = await Organization.create({
        name,
        slug,
        billingEmail,
        description,
        members: [
          {
            userId: new mongoose.Types.ObjectId(req.user.userId),
            role: 'owner',
            joinedAt: new Date(),
          },
        ],
      });

      // Default free tier subscription
      await Subscription.create({
        organizationId: org._id,
        plan: 'free',
        monthlyTokenQuota: 50000,
        maxSeats: 3,
      });

      await AuditLog.create({
        organizationId: org._id,
        actorId: new mongoose.Types.ObjectId(req.user.userId),
        actorEmail: (req.user as any).email || req.user.username,
        action: 'org.create',
        targetType: 'organization',
        targetId: org._id.toString(),
        metadata: { name, slug },
      });

      res.status(201).json({ organization: org });
    } catch (err: any) {
      console.error('[CreateOrg Error]:', err);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  },

  async getUserOrgs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const orgs = await Organization.find({
        'members.userId': new mongoose.Types.ObjectId(req.user.userId),
        isActive: true,
      }).sort({ name: 1 });

      res.status(200).json({ organizations: orgs });
    } catch (err: any) {
      console.error('[GetUserOrgs Error]:', err);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  },

  async getOrgById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = req.params.orgId;
      const org = await Organization.findById(orgId).populate('members.userId', 'username avatarUrl email');

      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      res.status(200).json({ organization: org });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get organization' });
    }
  },

  async updateMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orgId } = req.params;
      const { targetUserId, newRole } = req.body;

      if (!targetUserId || !newRole) {
        res.status(400).json({ error: 'targetUserId and newRole are required' });
        return;
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const member = org.members.find((m) => m.userId.toString() === targetUserId);
      if (!member) {
        res.status(404).json({ error: 'Member not found in organization' });
        return;
      }

      member.role = newRole as MemberRole;
      await org.save();

      // Invalidate cache
      await cache.delete(`org:role:${targetUserId}:${orgId}`);

      res.status(200).json({ success: true, member });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update member role' });
    }
  },

  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orgId, memberId } = req.params;

      const org = await Organization.findById(orgId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      org.members = org.members.filter((m) => m.userId.toString() !== memberId);
      await org.save();

      await cache.delete(`org:role:${memberId}:${orgId}`);

      res.status(200).json({ success: true, message: 'Member removed' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove member' });
    }
  },
};
