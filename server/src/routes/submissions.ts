import { Router } from 'express';
import { randomUUID } from 'crypto';
import { Submission } from '../models/Submission';
import { Person } from '../models/Person';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import type { AuthUser } from '../middleware/auth';

const router = Router();

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

// Submission text fields arrive as plain strings from the public form; wrap
// them as a localized object when converting to a Person record.
const asLoc = (v: unknown) => {
  if (v && typeof v === 'object') return v;
  if (typeof v === 'string' && v.trim()) return { ru: v.trim() };
  return undefined;
};

// A moderator may only act on submissions for their own faculty; admins on all.
function canActOn(user: AuthUser, fac: unknown): boolean {
  if (user.role === 'admin') return true;
  return user.role === 'moderator' && !!user.fac && fac === user.fac;
}

// Public: create a submission (apply form).
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const doc = await Submission.create({
      ...body,
      status: 'review',
      submittedAt: nowStamp(),
    });
    res.status(201).json(doc.toJSON());
  })
);

// Staff: list submissions (scoped to faculty for moderators), newest first.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const filter = user.role === 'admin' ? {} : { fac: user.fac ?? '__none__' };
    const list = await Submission.find(filter).sort({ _id: -1 });
    res.json(list.map((d) => d.toJSON()));
  })
);

// Staff: a single submission for the full review page (scoped).
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await Submission.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    if (!canActOn(req.user!, doc.get('fac'))) return res.status(403).json({ error: 'forbidden' });
    res.json(doc.toJSON());
  })
);

// Fields a moderator may correct in place before publishing.
const EDITABLE = ['name', 'year', 'spec', 'pos', 'bio', 'mentor', 'students', 'photoUrl', 'media'] as const;

// Staff: edit in place / approve (publish) / reject.
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const doc = await Submission.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    if (!canActOn(user, doc.get('fac'))) return res.status(403).json({ error: 'forbidden' });

    const { action } = req.body || {};

    // Approve = publish: materialise the (possibly moderator-corrected)
    // submission into a real alumnus record in the archive.
    if (action === 'approve') {
      if (doc.get('status') === 'review') {
        await Person.create({
          id: `a-${randomUUID().slice(0, 8)}`,
          kind: 'alumnus',
          fac: doc.get('fac'),
          accent: '#1B5AA6',
          featured: false,
          video: false,
          name: doc.get('name'),
          year: typeof doc.get('year') === 'number' ? doc.get('year') : undefined,
          spec: asLoc(doc.get('spec')),
          pos: asLoc(doc.get('pos')),
          bio: asLoc(doc.get('bio')),
          photoUrl: doc.get('photoUrl') || undefined,
          media: (doc.get('media') || []).length ? doc.get('media') : undefined,
          createdBy: user.username,
          createdAt: new Date().toISOString(),
        });
      }
      doc.set('status', 'published');
      await doc.save();
      return res.json(doc.toJSON());
    }

    if (action === 'reject') {
      doc.set('status', 'rejected');
      await doc.save();
      return res.json(doc.toJSON());
    }

    // Otherwise: in-place field correction (incl. removing bad photos/media).
    const body = (req.body || {}) as Record<string, unknown>;
    let touched = false;
    for (const f of EDITABLE) {
      if (f in body) {
        doc.set(f, body[f]);
        touched = true;
      }
    }
    if (!touched) return res.status(400).json({ error: 'no editable fields supplied' });
    await doc.save();
    res.json(doc.toJSON());
  })
);

export default router;
