import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';

export const notificationController = {
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const notifications = await Notification.find({
        recipientId: new mongoose.Types.ObjectId(req.user.userId),
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      const unreadCount = await Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(req.user.userId),
        isRead: false,
      });

      res.status(200).json({ notifications, unreadCount });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await Notification.updateOne(
        {
          _id: new mongoose.Types.ObjectId(id),
          recipientId: new mongoose.Types.ObjectId(req.user.userId),
        },
        {
          $set: { isRead: true, readAt: new Date() },
        }
      );

      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  },

  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await Notification.updateMany(
        {
          recipientId: new mongoose.Types.ObjectId(req.user.userId),
          isRead: false,
        },
        {
          $set: { isRead: true, readAt: new Date() },
        }
      );

      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  },
};
