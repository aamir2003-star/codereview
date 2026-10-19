import mongoose, { Document, Schema } from 'mongoose';

export interface IUsageRecord extends Document {
  organizationId: mongoose.Types.ObjectId;
  year: number;
  month: number;
  totalTokensUsed: number;
  reviewsTriggered: number;
  commentsGenerated: number;
  storageBytesUsed: number;
  updatedAt: Date;
}

const UsageRecordSchema = new Schema<IUsageRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    totalTokensUsed: { type: Number, default: 0 },
    reviewsTriggered: { type: Number, default: 0 },
    commentsGenerated: { type: Number, default: 0 },
    storageBytesUsed: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

UsageRecordSchema.index({ organizationId: 1, year: 1, month: 1 }, { unique: true });

export const UsageRecord = mongoose.model<IUsageRecord>('UsageRecord', UsageRecordSchema);
