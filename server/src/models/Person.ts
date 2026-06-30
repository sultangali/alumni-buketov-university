import { Schema, model } from 'mongoose';
import { LocSchema, stripTransform } from './common';

const MediaSchema = new Schema(
  {
    name: { type: String },
    kind: { type: String },
    // Served path of the uploaded file, e.g. "/media/photo-123.jpg".
    url: { type: String },
  },
  { _id: false }
);

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

    // Optional profile photo + extra media for records added by staff.
    photoUrl: { type: String },
    media: { type: [MediaSchema], default: undefined },

    // Authorship: which staff account created this record, and when. Used for
    // the admin audit and to attribute each alumnus to a moderator.
    createdBy: { type: String },
    createdAt: { type: String },
  },
  { toJSON: stripTransform, toObject: stripTransform }
);

export const Person = model('Person', PersonSchema);
