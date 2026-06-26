import { Schema, model } from 'mongoose';

const StaffUserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['moderator', 'admin'], required: true },
  fac: { type: String },
});

export const StaffUser = model('StaffUser', StaffUserSchema);
