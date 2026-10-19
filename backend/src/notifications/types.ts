export type NotificationChannel = 'in_app' | 'slack' | 'email' | 'webhook';

export interface INotificationPayload {
  title: string;
  message: string;
  recipientEmail?: string;
  recipientUserId?: string;
  organizationId?: string;
  slackWebhookUrl?: string;
  webhookUrl?: string;
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
}

export interface IDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  deliveredAt: Date;
}
