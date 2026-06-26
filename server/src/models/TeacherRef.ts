import { Schema, model } from 'mongoose';
import { LocSchema, stripTransform } from './common';

/**
 * Entries from the TEACH map. The map key becomes `id`; the original
 * optional `id` field (a link to another person) is stored as `link`.
 */
const TeacherRefSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: LocSchema },
    role: { type: LocSchema },
    link: { type: String },
  },
  { toJSON: stripTransform, toObject: stripTransform }
);

export const TeacherRef = model('TeacherRef', TeacherRefSchema);
