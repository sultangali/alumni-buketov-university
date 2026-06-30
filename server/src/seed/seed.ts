import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../db';
import {
  ADMIN_USERNAME,
  ADMIN_WEEKS,
  currentEntry,
  generateWeeklyPasswords,
  toCsv,
  toHashedEntries,
  todayStr,
} from '../auth/weeklyPasswords';
import { Faculty } from '../models/Faculty';
import { Person } from '../models/Person';
import { TeacherRef } from '../models/TeacherRef';
import { Audit } from '../models/Audit';
import { Moderator } from '../models/Moderator';
import { StaffUser } from '../models/StaffUser';
import { Submission } from '../models/Submission';

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
    Submission.deleteMany({}),
  ]);

  // Faculties.
  const faculties = await Faculty.insertMany(data.FAC);

  // People: only the honoured collections (teachers/laureates/veterans) are
  // seeded. No test alumni — moderators populate their own faculty's alumni.
  const people = await Person.insertMany([
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

  // No test audit log — the admin audit is derived from real record authorship.

  // Staff users. Only the admin account is seeded — the admin creates and
  // manages moderators from the panel, so no test moderators are pre-seeded.
  // The admin (login: alumni_admin) uses weekly-rotating passwords delivered
  // as a dated CSV; the static passwordHash is an unused throwaway.
  const weeks = generateWeeklyPasswords(ADMIN_WEEKS, new Date());
  const weeklyHashes = await toHashedEntries(weeks);
  const throwaway = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  const staff = await StaffUser.insertMany([
    { username: ADMIN_USERNAME, passwordHash: throwaway, role: 'admin', weeklyPasswords: weeklyHashes },
  ]);

  const csvPath = path.resolve(__dirname, '../../admin-passwords.csv');
  fs.writeFileSync(csvPath, toCsv(weeks), 'utf-8');
  const current = currentEntry(weeks, todayStr());

  console.log('[seed] inserted:');
  console.log(`  faculties:   ${faculties.length}`);
  console.log(`  people:      ${people.length} (no alumni, teachers ${data.TEACHERS.length}, laureates ${data.LAUREATES.length}, veterans ${data.VETERANS.length})`);
  console.log(`  teacherrefs: ${refs.length}`);
  console.log(`  staffusers:  ${staff.length} (login: ${ADMIN_USERNAME}, ${ADMIN_WEEKS} weekly passwords)`);
  console.log(`  admin CSV:   ${csvPath}`);
  if (current) {
    console.log(`  this week:   ${ADMIN_USERNAME} / ${current.password}  (valid ${current.start} … ${current.end})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
