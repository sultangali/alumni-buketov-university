import { Schema, model } from 'mongoose';

/**
 * Submissions have no business `id` field, so expose the stringified
 * `_id` as `id` (and still strip the raw `_id`/`__v`) so clients can
 * reference a submission for the PATCH approve/reject endpoint.
 */
const submissionTransform = {
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const MediaSchema = new Schema(
  {
    name: { type: String },
    kind: { type: String },
  },
  { _id: false }
);

const SubmissionSchema = new Schema(
  {
    name: { type: Schema.Types.Mixed },
    year: { type: Number, default: null },
    fac: { type: String },
    spec: { type: Schema.Types.Mixed },
    pos: { type: Schema.Types.Mixed },
    bio: { type: Schema.Types.Mixed },
    mentor: { type: String },
    students: { type: String },
    photoUrl: { type: String },
    media: { type: [MediaSchema], default: undefined },
    status: { type: String, default: 'review' },
    submittedAt: { type: String },
  },
  { toJSON: submissionTransform, toObject: submissionTransform }
);

export const Submission = model('Submission', SubmissionSchema);
