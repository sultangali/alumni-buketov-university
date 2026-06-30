import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Weekly-rotating admin passwords.
 *
 * A fixed set of strong, single-week passwords is generated up front and handed
 * to the administrator as a dated CSV. Each password is valid only during its
 * [start, end) week window; the login route accepts whichever one matches the
 * current date, so the effective admin password rotates automatically every
 * week with no further action.
 */

export const ADMIN_USERNAME = 'alumni_admin';
/** How many weeks of passwords to generate (≈ one year). */
export const ADMIN_WEEKS = 52;

// Unambiguous alphabet — no 0/O/1/I/L to avoid transcription mistakes.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface WeeklyPassword {
  week: number;
  /** Inclusive start date, YYYY-MM-DD. */
  start: string;
  /** Exclusive end date, YYYY-MM-DD. */
  end: string;
  password: string;
}

export interface WeeklyHash {
  start: string;
  end: string;
  hash: string;
}

/** A grouped, human-typable password, e.g. "K7MQ-2F9X-RT4P-WLZ8" (~99 bits). */
function randomPassword(groups = 4, perGroup = 4): string {
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    let s = '';
    for (let i = 0; i < perGroup; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
    parts.push(s);
  }
  return parts.join('-');
}

const fmt = (d: Date): string => d.toISOString().slice(0, 10);

/** Monday (UTC) of the week containing `d`. */
function mondayOf(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0=Sun … 6=Sat
  x.setUTCDate(x.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

/** Generate `weeks` consecutive weekly passwords starting the week of `startFrom`. */
export function generateWeeklyPasswords(weeks: number, startFrom: Date): WeeklyPassword[] {
  const base = mondayOf(startFrom);
  const rows: WeeklyPassword[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() + i * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    rows.push({ week: i + 1, start: fmt(start), end: fmt(end), password: randomPassword() });
  }
  return rows;
}

/** Bcrypt-hash each generated password for storage (plaintext is never stored). */
export async function toHashedEntries(rows: WeeklyPassword[]): Promise<WeeklyHash[]> {
  return Promise.all(
    rows.map(async (r) => ({ start: r.start, end: r.end, hash: await bcrypt.hash(r.password, 10) }))
  );
}

/** CSV the administrator keeps: one row per week with its date window + password. */
export function toCsv(rows: WeeklyPassword[]): string {
  const header = 'week,start_date,end_date,password';
  const lines = rows.map((r) => `${r.week},${r.start},${r.end},${r.password}`);
  return [header, ...lines].join('\n') + '\n';
}

/** The entry whose [start, end) window contains `today` (YYYY-MM-DD), if any. */
export function currentEntry<T extends { start: string; end: string }>(
  entries: T[],
  today: string
): T | undefined {
  return entries.find((e) => today >= e.start && today < e.end);
}

/** Today's date as YYYY-MM-DD (UTC). */
export const todayStr = (): string => new Date().toISOString().slice(0, 10);
