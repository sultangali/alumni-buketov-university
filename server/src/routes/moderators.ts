import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { StaffUser } from '../models/StaffUser';
import { Faculty } from '../models/Faculty';
import { Person } from '../models/Person';
import { Submission } from '../models/Submission';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// All moderator management is admin-only.
router.use(requireAuth, requireRole('admin'));

type Loc = { ru?: string; kz?: string; en?: string } | undefined;
const asLoc = (v: unknown): Loc => {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ['ru', 'kz', 'en'] as const) if (typeof o[k] === 'string') out[k] = o[k] as string;
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
};

/**
 * Enrich a moderator with live progress: how many published alumni records
 * sit in their faculty, and how many submissions await their review.
 */
async function withProgress(mods: Array<Record<string, unknown>>) {
  const facs = [...new Set(mods.map((m) => m.fac).filter(Boolean))] as string[];
  const [recordAgg, pendingAgg] = await Promise.all([
    Person.aggregate([{ $match: { kind: 'alumnus', fac: { $in: facs } } }, { $group: { _id: '$fac', n: { $sum: 1 } } }]),
    Submission.aggregate([{ $match: { status: 'review', fac: { $in: facs } } }, { $group: { _id: '$fac', n: { $sum: 1 } } }]),
  ]);
  const recMap = new Map(recordAgg.map((r) => [r._id, r.n]));
  const penMap = new Map(pendingAgg.map((r) => [r._id, r.n]));
  return mods.map((m) => ({
    ...m,
    records: m.fac ? recMap.get(m.fac) ?? 0 : 0,
    pending: m.fac ? penMap.get(m.fac) ?? 0 : 0,
  }));
}

// List all moderators with progress.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const mods = await StaffUser.find({ role: 'moderator' }).sort({ username: 1 });
    res.json(await withProgress(mods.map((m) => m.toJSON())));
  })
);

// Create a moderator account for a faculty.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { username, password, fac } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password.trim()) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (typeof fac !== 'string' || !fac.trim()) {
      return res.status(400).json({ error: 'fac is required' });
    }
    const faculty = await Faculty.findOne({ id: fac });
    if (!faculty) return res.status(400).json({ error: 'unknown faculty' });

    const exists = await StaffUser.findOne({ username: username.trim() });
    if (exists) return res.status(409).json({ error: 'username already taken' });

    const scope = asLoc(req.body?.scope) ?? (faculty.toJSON() as { name?: Loc }).name;
    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await StaffUser.create({
      username: username.trim(),
      passwordHash,
      role: 'moderator',
      fac: fac.trim(),
      scope,
      status: 'active',
    });
    const [enriched] = await withProgress([doc.toJSON()]);
    res.status(201).json(enriched);
  })
);

// Update a moderator: faculty, scope, status, or reset password.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const update: Record<string, unknown> = {};
    const { fac, status, password } = req.body || {};
    if (typeof fac === 'string' && fac.trim()) {
      const faculty = await Faculty.findOne({ id: fac });
      if (!faculty) return res.status(400).json({ error: 'unknown faculty' });
      update.fac = fac.trim();
    }
    const scope = asLoc(req.body?.scope);
    if (scope) update.scope = scope;
    if (status === 'active' || status === 'suspended') update.status = status;
    if (typeof password === 'string' && password.trim()) {
      update.passwordHash = await bcrypt.hash(password, 10);
    }
    const doc = await StaffUser.findOneAndUpdate({ _id: req.params.id, role: 'moderator' }, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'not found' });
    const [enriched] = await withProgress([doc.toJSON()]);
    res.json(enriched);
  })
);

// Remove a moderator account.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await StaffUser.findOneAndDelete({ _id: req.params.id, role: 'moderator' });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, id: req.params.id });
  })
);

export default router;
