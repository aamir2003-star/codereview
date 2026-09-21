import mongoose, { Document, Schema } from 'mongoose';

export type ReviewStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface IReview extends Document {
  prUrl: string;
  owner: string;
  repo: string;
  pullNumber: number;
  prTitle: string;
  requestedBy: mongoose.Types.ObjectId;
  status: ReviewStatus;
  totalFiles: number;
  filesReviewed: number;
  totalComments: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    prUrl: { type: String, required: true },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    pullNumber: { type: Number, required: true },
    prTitle: { type: String, default: '' },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'streaming', 'done', 'error'],
      default: 'pending',
    },
    totalFiles: { type: Number, default: 0 },
    filesReviewed: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for quick lookups per PR
ReviewSchema.index({ owner: 1, repo: 1, pullNumber: 1 });
ReviewSchema.index({ requestedBy: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
