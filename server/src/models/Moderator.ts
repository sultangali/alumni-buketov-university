import { Schema, model } from 'mongoose';
import { LocSchema, stripTransform } from './common';

const ModeratorSchema = new Schema(
  {
    login: { type: String },
    fac: { type: String },
    scope: { type: LocSchema },
    records: { type: Number },
    status: { type: String },
  },
  { toJSON: stripTransform, toObject: stripTransform }
);

export const Moderator = model('Moderator', ModeratorSchema);
