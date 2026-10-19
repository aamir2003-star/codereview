import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { Organization, MemberRole } from '../models/Organization';
import mongoose from 'mongoose';
import { cache } from '../cache/cache.manager';

export function requireOrgRole(requiredRole: MemberRole) {
  const roleHierarchy: Record<MemberRole, number> = {
    owner: 4,
    admin: 3,
    reviewer: 2,
    member: 1,
  };

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      res.status(400).json({ error: 'Valid organization ID is required' });
      return;
    }

    const cacheKey = `org:role:${req.user.userId}:${orgId}`;
    let userRole = await cache.get<MemberRole>(cacheKey);

    if (!userRole) {
      const org = await Organization.findOne({
        _id: new mongoose.Types.ObjectId(orgId),
        'members.userId': new mongoose.Types.ObjectId(req.user.userId),
      });

      if (!org) {
        res.status(403).json({ error: 'User is not a member of this organization' });
        return;
      }

      const member = org.members.find((m) => m.userId.toString() === req.user!.userId);
      if (!member) {
        res.status(403).json({ error: 'Member record not found' });
        return;
      }

      userRole = member.role;
      await cache.set(cacheKey, userRole, { ttlSeconds: 900, tags: [`org:${orgId}`] });
    }

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 99;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: `Insufficient permissions. Requires '${requiredRole}' role but user has '${userRole}'`,
      });
      return;
    }

    (req as any).orgRole = userRole;
    next();
  };
}
