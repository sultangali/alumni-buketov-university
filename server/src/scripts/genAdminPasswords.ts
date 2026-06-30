import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../db';
import { StaffUser } from '../models/StaffUser';
import {
  ADMIN_USERNAME,
  ADMIN_WEEKS,
  currentEntry,
  generateWeeklyPasswords,
  toCsv,
  toHashedEntries,
  todayStr,
} from '../auth/weeklyPasswords';

/**
 * Regenerate the admin's weekly-rotating passwords and rewrite the dated CSV,
 * without touching any other data. Run with: `npm run admin:passwords`.
 * An optional first argument overrides the number of weeks.
 */
async function run() {
  const weeks = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : ADMIN_WEEKS;
  await connectDb();

  const rows = generateWeeklyPasswords(weeks, new Date());
  const hashes = await toHashedEntries(rows);

  // Upsert the admin account; never overwrite an existing static passwordHash
  // with a known value (a throwaway is only set when creating the account).
  const existing = await StaffUser.findOne({ username: ADMIN_USERNAME });
  if (existing) {
    existing.set('role', 'admin');
    existing.set('status', 'active');
    existing.set('weeklyPasswords', hashes);
    await existing.save();
  } else {
    const throwaway = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    await StaffUser.create({
      username: ADMIN_USERNAME,
      passwordHash: throwaway,
      role: 'admin',
      weeklyPasswords: hashes,
    });
  }

  const csvPath = path.resolve(__dirname, '../../admin-passwords.csv');
  fs.writeFileSync(csvPath, toCsv(rows), 'utf-8');
  const current = currentEntry(rows, todayStr());

  console.log(`[admin:passwords] ${weeks} weekly passwords for "${ADMIN_USERNAME}" written.`);
  console.log(`  CSV: ${csvPath}`);
  if (current) {
    console.log(`  this week: ${ADMIN_USERNAME} / ${current.password}  (valid ${current.start} … ${current.end})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[admin:passwords] failed:', err);
  process.exit(1);
});
