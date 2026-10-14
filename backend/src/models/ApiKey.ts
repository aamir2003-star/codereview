import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    prefix: { type: String, required: true },
    keyHash: { type: String, required: true },
    scopes: [{ type: String, default: ['read:review', 'write:review'] }],
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

ApiKeySchema.index({ prefix: 1, isActive: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
