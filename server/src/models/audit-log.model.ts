import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    entity: { type: String, required: true, trim: true, maxlength: 40 },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    reason: {
      category: { type: String, trim: true, maxlength: 60 },
      note: { type: String, trim: true, maxlength: 1000 },
    },
    ip: { type: String, trim: true, maxlength: 60 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDocument = HydratedDocument<AuditLog>;

export const AuditLogModel = model("AuditLog", auditLogSchema);