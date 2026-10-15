import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export const auditController = {
  async getOrgAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 25;
      const action = req.query.action as string;

      const filter: any = { organizationId: new mongoose.Types.ObjectId(orgId) };
      if (action) {
        filter.action = action;
      }

      const total = await AuditLog.countDocuments(filter);
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actorId', 'username email avatarUrl');

      res.status(200).json({
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  },
};
