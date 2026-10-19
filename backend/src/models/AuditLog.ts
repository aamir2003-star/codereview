import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'org.create'
  | 'org.update'
  | 'org.member_add'
  | 'org.member_remove'
  | 'org.role_change'
  | 'team.create'
  | 'team.update'
  | 'team.delete'
  | 'review.start'
  | 'review.complete'
  | 'review.abort'
  | 'policy.create'
  | 'policy.update'
  | 'policy.delete'
  | 'billing.plan_change'
  | 'apikey.generate'
  | 'apikey.revoke';

export interface IAuditLog extends Document {
  organizationId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v: any) {
          if (!v || typeof v !== 'object') return true;
          for (const key of Object.keys(v)) {
            if (key.includes('.') || key.startsWith('$')) {
              return false;
            }
          }
          return true;
        },
        message: 'Metadata keys cannot contain dots or start with dollar signs',
      },
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.index({ organizationId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
