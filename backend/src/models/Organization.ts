import mongoose, { Document, Schema } from 'mongoose';

export type MemberRole = 'owner' | 'admin' | 'reviewer' | 'member';

export interface IOrgMember {
  userId: mongoose.Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  invitedBy?: mongoose.Types.ObjectId;
}

export interface IOrganization extends Document {
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  members: IOrgMember[];
  allowedDomains: string[];
  billingEmail: string;
  settings: {
    enforceMfa: boolean;
    autoReviewEnabled: boolean;
    defaultBranch: string;
    maxConcurrentReviews: number;
    retentionDays: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMemberSchema = new Schema<IOrgMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'reviewer', 'member'],
      default: 'member',
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String },
    avatarUrl: { type: String },
    members: [OrgMemberSchema],
    allowedDomains: [{ type: String, lowercase: true }],
    billingEmail: { type: String, required: true },
    settings: {
      enforceMfa: { type: Boolean, default: false },
      autoReviewEnabled: { type: Boolean, default: true },
      defaultBranch: { type: String, default: 'main' },
      maxConcurrentReviews: { type: Number, default: 5 },
      retentionDays: { type: Number, default: 90 },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ 'members.userId': 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
