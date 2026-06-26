import { Schema } from 'mongoose';

/** Reusable localized-string sub-schema: { ru?, kz?, en? } */
export const LocSchema = new Schema(
  {
    ru: { type: String },
    kz: { type: String },
    en: { type: String },
  },
  { _id: false }
);

/** Standard toJSON transform: strip _id and __v from output. */
export const stripTransform = {
  virtuals: false,
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};
