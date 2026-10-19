import mongoose, { Document, Schema } from 'mongoose';

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ISubscription extends Document {
  organizationId: mongoose.Types.ObjectId;
  plan: PlanTier;
  monthlyTokenQuota: number;
  maxSeats: number;
  features: {
    customRules: boolean;
    priorityWorkerPool: boolean;
    slackIntegration: boolean;
    pdfExport: boolean;
    auditLogRetentionDays: number;
  };
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    monthlyTokenQuota: { type: Number, default: 50000 },
    maxSeats: { type: Number, default: 3 },
    features: {
      customRules: { type: Boolean, default: false },
      priorityWorkerPool: { type: Boolean, default: false },
      slackIntegration: { type: Boolean, default: false },
      pdfExport: { type: Boolean, default: false },
      auditLogRetentionDays: { type: Number, default: 14 },
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing'],
      default: 'active',
    },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
