import { Schema, model } from 'mongoose';

const schema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  clientSubmissionId: { type: String, required: true },
  draft: { type: Schema.Types.Mixed },
  expiresAt: { type: Date, required: true, expires: 0 },
  fingerprint: String,
  receipt: { type: Schema.Types.Mixed },
});

export const KioskHandoff = model('KioskHandoff', schema);
