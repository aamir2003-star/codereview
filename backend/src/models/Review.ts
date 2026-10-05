import mongoose, { Document, Schema } from 'mongoose';

export type ReviewStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface PrArchitectureSummary {
  highLevelSummary: string;
  architectureOverview: string;
  keyComponentsChanged: Array<{
    component: string;
    purpose: string;
    impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  sequenceFlowOrDiagram?: string;
  walkthrough: Array<{
    file: string;
    changes: string;
  }>;
  potentialRisks: string[];
}

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
  architectureSummary?: PrArchitectureSummary;
  publishedToGithub?: boolean;
  githubReviewUrl?: string;
  errorMessage?: string;
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
    errorMessage: { type: String, default: '' },
    totalFiles: { type: Number, default: 0 },
    filesReviewed: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    architectureSummary: {
      highLevelSummary: { type: String, default: '' },
      architectureOverview: { type: String, default: '' },
      keyComponentsChanged: [
        {
          component: { type: String, default: '' },
          purpose: { type: String, default: '' },
          impactLevel: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'LOW' },
        },
      ],
      sequenceFlowOrDiagram: { type: String, default: '' },
      walkthrough: [
        {
          file: { type: String, default: '' },
          changes: { type: String, default: '' },
        },
      ],
      potentialRisks: [{ type: String }],
    },
    publishedToGithub: { type: Boolean, default: false },
    githubReviewUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for quick lookups per PR
ReviewSchema.index({ owner: 1, repo: 1, pullNumber: 1 });
ReviewSchema.index({ requestedBy: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
