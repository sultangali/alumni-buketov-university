import { Schema, model } from 'mongoose';
import { LocSchema, stripTransform } from './common';

const AuditSchema = new Schema(
  {
    who: { type: String },
    act: { type: LocSchema },
    obj: { type: String },
    t: { type: String },
    tag: { type: String },
  },
  { toJSON: stripTransform, toObject: stripTransform }
);

export const Audit = model('Audit', AuditSchema);
