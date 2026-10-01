import mongoose, { Document, Schema } from 'mongoose';

export type Severity = 'bug' | 'security' | 'smell' | 'nit';

export interface IComment extends Document {
  reviewId: mongoose.Types.ObjectId;
  filePath: string;
  lineNumber: number;
  severity: Severity;
  message: string;
  suggestedFix?: string;
  upvotes: mongoose.Types.ObjectId[];
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  publishedToGithub?: boolean;
  githubCommentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      index: true,
    },
    filePath: { type: String, required: true },
    lineNumber: { type: Number, required: true },
    severity: {
      type: String,
      enum: ['bug', 'security', 'smell', 'nit'],
      required: true,
    },
    message: { type: String, required: true },
    suggestedFix: { type: String, default: null },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedToGithub: { type: Boolean, default: false },
    githubCommentUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Matches the review detail query and its file/line sort order.
CommentSchema.index({ reviewId: 1, filePath: 1, lineNumber: 1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
