import { Schema, model } from 'mongoose';
import { LocSchema } from './common';

/**
 * Staff accounts. A moderator is a StaffUser with role:'moderator' bound to a
 * faculty (`fac`); admins create and manage them. `scope` is a localized label
 * shown in the admin panel; `status` gates whether the account may sign in.
 * toJSON exposes `id` (stringified _id) and never leaks the password hash.
 */
const staffTransform = {
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.weeklyPasswords;
    return ret;
  },
};

// One weekly admin-password window: valid for [start, end) (YYYY-MM-DD).
const WeeklyPasswordSchema = new Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
    hash: { type: String, required: true },
  },
  { _id: false }
);

const StaffUserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['moderator', 'admin'], required: true },
    fac: { type: String },
    scope: { type: LocSchema },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    // When set (admin), login accepts the password for the current week instead
    // of the static passwordHash — see routes/auth.ts.
    weeklyPasswords: { type: [WeeklyPasswordSchema], default: undefined },
  },
  { toJSON: staffTransform, toObject: staffTransform }
);

export const StaffUser = model('StaffUser', StaffUserSchema);
