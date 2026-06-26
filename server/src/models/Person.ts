import { Schema, model } from 'mongoose';
import { LocSchema, stripTransform } from './common';

/**
 * Single collection holding alumni (kind:'alumnus') and the
 * teacher/laureate/veteran collections. Permissive enough to store
 * every field used by any of those record types.
 */
const PersonSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    kind: {
      type: String,
      enum: ['alumnus', 'teacher', 'laureate', 'veteran'],
      required: true,
      index: true,
    },
    fac: { type: String, index: true },
    dept: { type: String },
    year: { type: Number },
    featured: { type: Boolean, default: false },
    video: { type: Boolean, default: false },
    accent: { type: String },
    tag: { type: String },

    name: { type: LocSchema },
    spec: { type: LocSchema },
    pos: { type: LocSchema },
    org: { type: LocSchema },
    bio: { type: LocSchema },
    badge: { type: LocSchema },
    highlight: { type: LocSchema },
    meta: { type: LocSchema },

    awards: { type: [LocSchema], default: undefined },
    mentors: { type: [String], default: undefined },
    students: { type: [String], default: undefined },
  },
  { toJSON: stripTransform, toObject: stripTransform }
);

export const Person = model('Person', PersonSchema);
