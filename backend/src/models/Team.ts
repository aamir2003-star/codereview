import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamMember {
  userId: mongoose.Types.ObjectId;
  role: 'lead' | 'member';
  addedAt: Date;
}

export interface ITeam extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  members: ITeamMember[];
  repositories: string[];
  defaultReviewers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['lead', 'member'], default: 'member' },
  addedAt: { type: Date, default: Date.now },
});

const TeamSchema = new Schema<ITeam>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String },
    members: [TeamMemberSchema],
    repositories: [{ type: String }],
    defaultReviewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

TeamSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
