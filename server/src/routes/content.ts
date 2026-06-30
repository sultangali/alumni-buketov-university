import { Router } from 'express';
import { Faculty } from '../models/Faculty';
import { Person } from '../models/Person';
import { TeacherRef } from '../models/TeacherRef';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

// kind value used by the frontend collection routes -> stored Person.kind
const COLLECTION_KIND: Record<string, string> = {
  teacher: 'teacher',
  laureate: 'laureate',
  veteran: 'veteran',
};

async function teachMap() {
  const refs = await TeacherRef.find().lean();
  const map: Record<string, { name?: unknown; role?: unknown; id?: string }> = {};
  for (const r of refs as Array<Record<string, unknown>>) {
    const key = r.id as string;
    const entry: { name?: unknown; role?: unknown; id?: string } = {
      name: r.name,
      role: r.role,
    };
    if (r.link) entry.id = r.link as string;
    map[key] = entry;
  }
  return map;
}

function clean<T extends Record<string, unknown>>(doc: T): T {
  delete doc._id;
  delete doc.__v;
  return doc;
}

/** Single endpoint that hydrates the whole frontend. */
router.get(
  '/bootstrap',
  asyncHandler(async (_req, res) => {
    const [faculties, people, teach] = await Promise.all([
      Faculty.find().lean(),
      Person.find().lean(),
      teachMap(),
    ]);
    const list = (people as Array<Record<string, unknown>>).map(clean);
    const byKind = (k: string) => list.filter((p) => p.kind === k);
    res.json({
      faculties: (faculties as Array<Record<string, unknown>>).map(clean),
      alumni: byKind('alumnus'),
      teach,
      teachers: byKind('teacher'),
      laureates: byKind('laureate'),
      veterans: byKind('veteran'),
    });
  })
);

router.get(
  '/faculties',
  asyncHandler(async (_req, res) => {
    const faculties = (await Faculty.find().lean()) as Array<Record<string, unknown>>;
    res.json(faculties.map(clean));
  })
);

router.get(
  '/faculties/:id',
  asyncHandler(async (req, res) => {
    const fac = await Faculty.findOne({ id: req.params.id }).lean();
    if (!fac) return res.status(404).json({ error: 'not found' });
    res.json(clean(fac as Record<string, unknown>));
  })
);

router.get(
  '/faculties/:id/alumni',
  asyncHandler(async (req, res) => {
    const people = (await Person.find({
      kind: 'alumnus',
      fac: req.params.id,
    }).lean()) as Array<Record<string, unknown>>;
    res.json(people.map(clean));
  })
);

router.get(
  '/feat',
  asyncHandler(async (_req, res) => {
    const people = (await Person.find({
      kind: 'alumnus',
      featured: true,
    }).lean()) as Array<Record<string, unknown>>;
    res.json(people.map(clean));
  })
);

router.get(
  '/collections/:kind',
  asyncHandler(async (req, res) => {
    const kind = COLLECTION_KIND[req.params.kind];
    if (!kind) return res.status(400).json({ error: 'unknown collection' });
    const people = (await Person.find({ kind }).lean()) as Array<Record<string, unknown>>;
    res.json(people.map(clean));
  })
);

router.get(
  '/people/:id',
  asyncHandler(async (req, res) => {
    const person = await Person.findOne({ id: req.params.id }).lean();
    if (!person) return res.status(404).json({ error: 'not found' });
    res.json(clean(person as Record<string, unknown>));
  })
);

const hasLoc = (v: unknown): boolean =>
  !!v && typeof v === 'object' && (['ru', 'kz', 'en'] as const).some((k) => {
    const s = (v as Record<string, unknown>)[k];
    return typeof s === 'string' && s.trim().length > 0;
  });

// Staff: publish a new alumnus record directly (no review queue). A moderator
// is locked to their own faculty; an admin must name the faculty. This is the
// counterpart to the public /submissions flow, which IS reviewed.
router.post(
  '/people',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const body = (req.body || {}) as Record<string, unknown>;

    // Resolve faculty under the caller's authority.
    let fac: string | undefined;
    if (user.role === 'admin') {
      fac = typeof body.fac === 'string' ? body.fac : undefined;
    } else if (user.role === 'moderator' && user.fac) {
      fac = user.fac;
    } else {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!fac) return res.status(400).json({ error: 'fac is required' });
    const faculty = await Faculty.findOne({ id: fac });
    if (!faculty) return res.status(400).json({ error: 'unknown faculty' });

    if (!hasLoc(body.name)) return res.status(400).json({ error: 'name is required' });

    const doc = await Person.create({
      id: `a-${randomUUID().slice(0, 8)}`,
      kind: 'alumnus',
      fac,
      accent: '#1B5AA6',
      featured: false,
      video: false,
      name: body.name,
      year: Number.isFinite(Number(body.year)) ? Number(body.year) : undefined,
      spec: hasLoc(body.spec) ? body.spec : undefined,
      pos: hasLoc(body.pos) ? body.pos : undefined,
      org: hasLoc(body.org) ? body.org : undefined,
      bio: hasLoc(body.bio) ? body.bio : undefined,
      photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl : undefined,
      media: Array.isArray(body.media) ? body.media : undefined,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(doc.toJSON());
  })
);

// Staff: edit an existing person record (moderator/admin). Only a whitelist of
// content fields can be changed; id/kind/fac are immutable here.
const EDITABLE = ['name', 'year', 'spec', 'pos', 'org', 'bio'] as const;
router.patch(
  '/people/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    // Load the target first so we can enforce role + faculty scope before any
    // mutation (the client-side list is scoped, but the API must not trust it).
    const person = await Person.findOne({ id: req.params.id });
    if (!person) return res.status(404).json({ error: 'not found' });

    // Admins may edit any record; a faculty moderator may edit only records in
    // their own faculty. Anyone else (or a scopeless moderator) is forbidden.
    if (user.role !== 'admin') {
      if (user.role !== 'moderator' || !user.fac || person.fac !== user.fac) {
        return res.status(403).json({ error: 'forbidden' });
      }
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    for (const f of EDITABLE) {
      if (f in body) {
        if (f === 'year') {
          const n = Number(body.year);
          if (Number.isFinite(n)) update.year = n;
        } else if (body[f] && typeof body[f] === 'object') {
          update[f] = body[f];
        }
      }
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'no editable fields supplied' });
    }
    person.set(update);
    await person.save();
    res.json(person.toJSON());
  })
);

export default router;
