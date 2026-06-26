import { Schema, model } from 'mongoose';
import { LocSchema, stripTransform } from './common';

const DeptSchema = new Schema(
  {
    id: { type: String, required: true },
    est: { type: Number },
    count: { type: Number },
    grad: { type: String },
    name: { type: LocSchema },
    head: { type: LocSchema },
    hist: { type: LocSchema },
  },
  { _id: false }
);

const FacultySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    est: { type: Number },
    grad: { type: String },
    abbr: { type: String },
    name: { type: LocSchema },
    hist: { type: LocSchema },
    depts: { type: [DeptSchema], default: [] },
  },
  { toJSON: stripTransform, toObject: stripTransform }
);

export const Faculty = model('Faculty', FacultySchema);
