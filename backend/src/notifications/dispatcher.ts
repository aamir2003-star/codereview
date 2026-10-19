import { INotificationPayload, IDeliveryResult } from './types';
import { slackNotification } from './slack.service';
import { emailNotification } from './email.service';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';

export class NotificationDispatcher {
  public async dispatch(payload: INotificationPayload): Promise<IDeliveryResult[]> {
    const results: IDeliveryResult[] = [];

    for (const channel of payload.channels) {
      const now = new Date();
      try {
        if (channel === 'in_app' && payload.recipientUserId) {
          await Notification.create({
            recipientId: new mongoose.Types.ObjectId(payload.recipientUserId),
            organizationId: payload.organizationId ? new mongoose.Types.ObjectId(payload.organizationId) : undefined,
            type: 'review.completed',
            title: payload.title,
            message: payload.message,
            metadata: payload.metadata || {},
          });
          results.push({ channel, success: true, deliveredAt: now });
        } else if (channel === 'slack' && payload.slackWebhookUrl) {
          const success = await slackNotification.sendWebhook(payload.slackWebhookUrl, {
            text: `${payload.title}: ${payload.message}`,
          });
          results.push({ channel, success, deliveredAt: now });
        } else if (channel === 'email' && payload.recipientEmail) {
          const success = await emailNotification.sendEmail(
            payload.recipientEmail,
            payload.title,
            payload.message
          );
          results.push({ channel, success, deliveredAt: now });
        }
      } catch (err: any) {
        results.push({
          channel,
          success: false,
          error: err.message,
          deliveredAt: now,
        });
      }
    }

    return results;
  }
}

export const notificationDispatcher = new NotificationDispatcher();
