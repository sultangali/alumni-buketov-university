import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../db';
import { Faculty } from '../models/Faculty';
import { Person } from '../models/Person';
import { TeacherRef } from '../models/TeacherRef';
import { Audit } from '../models/Audit';
import { Moderator } from '../models/Moderator';
import { StaffUser } from '../models/StaffUser';

interface SeedData {
  FAC: any[];
  ALU: any[];
  TEACH: Record<string, any>;
  TEACHERS: any[];
  LAUREATES: any[];
  VETERANS: any[];
  AUDIT: any[];
  MODS: any[];
}

function loadData(): SeedData {
  const file = path.resolve(__dirname, '../../seed/data.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as SeedData;
}

async function run() {
  const data = loadData();
  await connectDb();

  // Wipe collections.
  await Promise.all([
    Faculty.deleteMany({}),
    Person.deleteMany({}),
    TeacherRef.deleteMany({}),
    Audit.deleteMany({}),
    Moderator.deleteMany({}),
    StaffUser.deleteMany({}),
  ]);

  // Faculties.
  const faculties = await Faculty.insertMany(data.FAC);

  // People: alumni (kind:'alumnus') + teachers/laureates/veterans (kind already set).
  const alumni = data.ALU.map((a) => ({ ...a, kind: 'alumnus' }));
  const people = await Person.insertMany([
    ...alumni,
    ...data.TEACHERS,
    ...data.LAUREATES,
    ...data.VETERANS,
  ]);

  // TeacherRefs from the TEACH map (key -> id, original val.id -> link).
  const teacherRefs = Object.entries(data.TEACH).map(([id, val]) => {
    const { id: link, ...rest } = val || {};
    return { id, ...rest, ...(link ? { link } : {}) };
  });
  const refs = await TeacherRef.insertMany(teacherRefs);

  const audits = await Audit.insertMany(data.AUDIT);
  const mods = await Moderator.insertMany(data.MODS);

  // Staff users.
  const adminHash = await bcrypt.hash('admin123', 10);
  const modHash = await bcrypt.hash('moder123', 10);
  await StaffUser.insertMany([
    { username: 'admin', passwordHash: adminHash, role: 'admin' },
    { username: 'moderator', passwordHash: modHash, role: 'moderator', fac: 'mit' },
  ]);

  console.log('[seed] inserted:');
  console.log(`  faculties:   ${faculties.length}`);
  console.log(`  people:      ${people.length} (alumni ${alumni.length}, teachers ${data.TEACHERS.length}, laureates ${data.LAUREATES.length}, veterans ${data.VETERANS.length})`);
  console.log(`  teacherrefs: ${refs.length}`);
  console.log(`  audits:      ${audits.length}`);
  console.log(`  moderators:  ${mods.length}`);
  console.log(`  staffusers:  2 (admin/admin123, moderator/moder123)`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
