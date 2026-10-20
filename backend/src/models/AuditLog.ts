import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'review_triggered'
  | 'review_completed'
  | 'comment_resolved'
  | 'comment_upvoted'
  | 'github_published';

export interface IAuditLog extends Document {
  action: AuditAction;
  reviewId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  owner: string;
  repo: string;
  pullNumber: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: [
        'review_triggered',
        'review_completed',
        'comment_resolved',
        'comment_upvoted',
        'github_published',
      ],
      required: true,
      index: true,
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    repo: {
      type: String,
      required: true,
      trim: true,
    },
    pullNumber: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast audit querying
AuditLogSchema.index({ owner: 1, repo: 1, pullNumber: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
