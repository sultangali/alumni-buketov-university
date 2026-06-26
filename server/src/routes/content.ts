import { Router } from 'express';
import { Faculty } from '../models/Faculty';
import { Person } from '../models/Person';
import { TeacherRef } from '../models/TeacherRef';
import { asyncHandler } from '../middleware/asyncHandler';

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

export default router;
