import mongoose, { Document, Schema } from 'mongoose';

export type Severity = 'bug' | 'security' | 'smell' | 'nit';

export interface IComment extends Document {
  reviewId: mongoose.Types.ObjectId;
  filePath: string;
  lineNumber: number;
  severity: Severity;
  message: string;
  upvotes: mongoose.Types.ObjectId[];
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
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
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
