import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { Submission } from '../models/Submission';
import { Person } from '../models/Person';
import { Faculty } from '../models/Faculty';
import { requireAuth, type AuthUser } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { submit } from '../services/kiosk';

const router = Router();
const EDITABLE = ['name', 'year', 'fac', 'contact', 'spec', 'pos', 'bio', 'mentor', 'students', 'photoUrl', 'media'] as const;
const asLoc = (v: unknown) => typeof v === 'string' ? { ru: v.trim() } : v;
function canActOn(user: AuthUser, fac: unknown): boolean {
  return user.role === 'admin' || (user.role === 'moderator' && !!user.fac && fac === user.fac);
}
function validText(v: unknown, required = false): boolean {
  if (typeof v === 'string') return v.length <= 20000 && (!required || !!v.trim());
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const entries = Object.entries(v);
  return entries.length > 0 && entries.every(([k, value]) => ['ru', 'kz', 'en'].includes(k) && typeof value === 'string' && value.length <= 20000)
    && (!required || entries.some(([,value]) => (value as string).trim()));
}
const safeUrl = (v: unknown) => typeof v === 'string' && (v === '' || /^\/media\/[a-zA-Z0-9_.-]+$/.test(v) || /^https?:\/\/[^\s]+$/.test(v));
function validationError(body: Record<string, unknown>): string | undefined {
  if (!validText(body.name, true)) return 'name is required';
  if (typeof body.fac !== 'string' || !body.fac.trim() || body.fac.length > 200) return 'faculty is required';
  if (body.year != null && (!Number.isInteger(body.year) || (body.year as number) < 1900 || (body.year as number) > new Date().getFullYear())) return 'invalid graduation year';
  for (const field of ['spec', 'pos', 'bio']) if (body[field] != null && !validText(body[field])) return `invalid ${field}`;
  for (const field of ['contact', 'mentor', 'students']) if (body[field] != null && (typeof body[field] !== 'string' || (body[field] as string).length > 20000)) return `invalid ${field}`;
  if (body.photoUrl != null && !safeUrl(body.photoUrl)) return 'invalid photo URL';
  if (body.media != null && (!Array.isArray(body.media) || body.media.length > 20 || body.media.some((m) => !m || !['image', 'video'].includes(m.kind) || !safeUrl(m.url) || !m.url || typeof m.name !== 'string'))) return 'invalid media';
}
router.post('/', asyncHandler(async (req, res) => {
  const { doc, created } = await submit(req.body);
  const response = req.body.clientSubmissionId
    ? {id:String(doc._id),status:doc.status,submittedAt:doc.submittedAt}
    : doc.toJSON();
  res.set('Cache-Control','no-store');
  res.status(created ? 201 : 200).json(response);
}));
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const list = await Submission.find(user.role === 'admin' ? {} : { fac: user.fac ?? '__none__' }).sort({ _id: -1 });
  res.json(list.map(d => d.toJSON()));
}));
router.param('id', (req, res, next, id) => {
  if (!isValidObjectId(id)) return res.status(400).json({ error: 'invalid submission id' });
  next();
});
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = await Submission.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  if (!canActOn(req.user!, doc.fac)) return res.status(403).json({ error: 'forbidden' });
  res.json(doc.toJSON());
}));
router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  let doc = await Submission.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  const user = req.user!;
  if (!canActOn(user, doc.fac)) return res.status(403).json({ error: 'forbidden' });
  const body = req.body || {};
  const { action } = body;
  if (action && !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'invalid action' });
  if (action === 'approve') {
    if (doc.status === 'published') return res.json(doc.toJSON());
    if (!['review', 'publishing'].includes(doc.status!)) return res.status(409).json({ error: 'submission is no longer in review' });
    const error = validationError(doc.toObject());
    if (error) return res.status(400).json({ error });
    if (!await Faculty.exists({ id: doc.fac })) return res.status(400).json({ error: 'resolve faculty before publishing' });
    // Claim a frozen snapshot before creating a Person. A publishing record can
    // be retried after interruption; its deterministic unique Person id prevents duplicates.
    if (doc.status === 'review') {
      const claimed = await Submission.findOneAndUpdate({ _id: doc._id, status: 'review', __v: doc.__v }, { $set: { status: 'publishing' }, $inc: { __v: 1 } }, { new: true });
      if (!claimed) return res.status(409).json({ error: 'submission changed; refresh and retry' });
      doc = claimed;
    }
    const id = `a-submission-${doc._id}`;
    try {
      await Person.updateOne({ id }, { $setOnInsert: {
        id, kind: 'alumnus', fac: doc.fac, accent: '#1B5AA6', featured: false, video: false,
        mentorText: doc.mentor, studentsText: doc.students,
        name: asLoc(doc.name), year: doc.year ?? undefined, spec: asLoc(doc.spec), pos: asLoc(doc.pos), bio: asLoc(doc.bio),
        photoUrl: doc.photoUrl || undefined, media: doc.media, createdBy: user.username, createdAt: new Date().toISOString(),
      } }, { upsert: true, runValidators: true });
    } catch (error) {
      if ((error as {code?: number}).code !== 11000 || !await Person.exists({ id })) throw error;
    }
    const published = await Submission.findOneAndUpdate({ _id: doc._id, status: 'publishing' }, { $set: { status: 'published' } }, { new: true });
    return res.json((published ?? await Submission.findById(doc._id))!.toJSON());
  }
  if (action === 'reject' && doc.status === 'rejected') return res.json(doc.toJSON());
  if (doc.status !== 'review') return res.status(409).json({ error: 'submission is no longer in review' });
  let update: Record<string, unknown>;
  if (action === 'reject') update = { status: 'rejected' };
  else {
    update = Object.fromEntries(EDITABLE.filter(f => f in body).map(f => [f, body[f]]));
    if (!Object.keys(update).length) return res.status(400).json({ error: 'no editable fields supplied' });
    if ('fac' in update) {
      if (user.role !== 'admin') return res.status(403).json({ error: 'only admins may reassign faculty' });
      if (typeof update.fac !== 'string' || !await Faculty.exists({ id: update.fac })) return res.status(400).json({ error: 'unknown faculty' });
    }
    const error = validationError({ ...doc.toObject(), ...update });
    if (error) return res.status(400).json({ error });
  }
  const result = await Submission.findOneAndUpdate({ _id: doc._id, status: 'review', __v: doc.__v }, { $set: update, $inc: { __v: 1 } }, { new: true });
  if (!result) return res.status(409).json({ error: 'submission changed; refresh and retry' });
  res.json(result.toJSON());
}));
export default router;
