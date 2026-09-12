import { createHash, randomBytes, randomUUID } from 'crypto';
import { constants, createReadStream } from 'fs';
import { open } from 'fs/promises';
import path from 'path';
import { Submission } from '../models/Submission';
import { KioskHandoff } from '../models/KioskHandoff';
import { Faculty } from '../models/Faculty';
import { Person } from '../models/Person';
import { TeacherRef } from '../models/TeacherRef';

export const EDITABLE = ['name', 'year', 'fac', 'contact', 'spec', 'pos', 'bio', 'mentor', 'students', 'photoUrl', 'media'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const failure = (status: number, message: string) => Object.assign(new Error(message), { status });
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
function validText(v: unknown, required = false): boolean {
  if (typeof v === 'string') return v.length <= 20000 && (!required || !!v.trim());
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const entries = Object.entries(v);
  return entries.length > 0 && entries.every(([k, value]) => ['ru', 'kz', 'en'].includes(k) && typeof value === 'string' && value.length <= 20000)
    && (!required || entries.some(([,value]) => (value as string).trim()));
}
const safeUrl = (v: unknown) => typeof v === 'string' && v.length <= 2048 && (v === '' || /^\/media\/[a-zA-Z0-9_.-]+$/.test(v) || /^https?:\/\/[^\s]+$/.test(v));
export function validationError(body: Record<string, unknown>, partial = false): string | undefined {
  if (!partial || body.name !== undefined) if (!validText(body.name, !partial)) return 'name is required';
  if (!partial || body.fac !== undefined) if (typeof body.fac !== 'string' || (!partial && !body.fac.trim()) || body.fac.length > 200) return 'faculty is required';
  if (body.year != null && (!Number.isInteger(body.year) || (body.year as number) < 1900 || (body.year as number) > new Date().getFullYear())) return 'invalid graduation year';
  for (const field of ['spec', 'pos', 'bio']) if (body[field] != null && !validText(body[field])) return `invalid ${field}`;
  for (const field of ['contact', 'mentor', 'students']) if (body[field] != null && (typeof body[field] !== 'string' || (body[field] as string).length > 20000)) return `invalid ${field}`;
  if (body.photoUrl != null && !safeUrl(body.photoUrl)) return 'invalid photo URL';
  if (body.media != null && (!Array.isArray(body.media) || body.media.length > 20 || body.media.some((m) => !m || !['image', 'video'].includes(m.kind) || !safeUrl(m.url) || !m.url || typeof m.name !== 'string' || m.name.length > 500))) return 'invalid media';
}
export function editable(body: unknown, partial = false): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw failure(400, 'invalid application');
  const b = body as Record<string, unknown>;
  const error = validationError(b, partial);
  if (error) throw failure(400, error);
  const fields = Object.fromEntries(EDITABLE.filter(f => Object.prototype.hasOwnProperty.call(b, f)).map(f => [f, b[f]]));
  if (typeof fields.fac === 'string') fields.fac = fields.fac.trim();
  if (Array.isArray(fields.media)) fields.media = fields.media.map(({name, kind, url}) => ({name,kind,url}));
  return fields;
}
export async function submit(body: unknown) {
  const fields = editable(body);
  const suppliedId = (body as Record<string, unknown>).clientSubmissionId;
  if (suppliedId !== undefined && (typeof suppliedId !== 'string' || !uuid.test(suppliedId))) throw failure(400, 'invalid clientSubmissionId');
  const clientSubmissionId = typeof suppliedId === 'string' ? suppliedId.toLowerCase() : undefined;
  const payloadFingerprint = sha256(canonical(fields));
  // Await unique index creation before accepting even the first request.
  await Submission.init();
  try {
    const doc = await Submission.create({ ...fields, ...(clientSubmissionId ? {clientSubmissionId,payloadFingerprint} : {}), status:'review', submittedAt: new Date().toISOString() });
    return {doc, created:true};
  } catch (error) {
    if (!clientSubmissionId || (error as {code?:number}).code !== 11000) throw error;
    const doc = await Submission.findOne({clientSubmissionId});
    if (!doc) throw error;
    if (doc.payloadFingerprint !== payloadFingerprint) throw failure(409, 'clientSubmissionId already used for different application');
    return {doc, created:false};
  }
}
export async function createHandoff(body: unknown) {
  const draft = editable(body, true);
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await KioskHandoff.init();
  await KioskHandoff.create({tokenHash:sha256(token),clientSubmissionId:randomUUID(),draft,expiresAt});
  let url: string | undefined;
  if (process.env.PUBLIC_APP_ORIGIN) {
    try {
      const origin = new URL(process.env.PUBLIC_APP_ORIGIN);
      if (origin.protocol === 'https:' && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash) {
        url = `${origin.origin}/u/apply#handoff=${token}`;
      }
    } catch { /* Invalid public configuration disables the public URL. */ }
  }
  return {token,expiresAt:expiresAt.toISOString(),...(url ? {url} : {})};
}
async function handoff(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw failure(404, 'handoff not found');
  const doc = await KioskHandoff.findOne({tokenHash:sha256(token),expiresAt:{$gt:new Date()}});
  if (!doc) throw failure(410, 'handoff expired or unavailable');
  return doc;
}
export async function readHandoff(token: string) {
  const doc = await handoff(token);
  if (doc.fingerprint || doc.receipt) throw failure(410, 'handoff consumed');
  return {draft:doc.draft,expiresAt:doc.expiresAt.toISOString()};
}
export async function submitHandoff(token: string, body: unknown) {
  const doc = await handoff(token);
  if (doc.receipt) return doc.receipt;
  const fields = editable(body);
  const fingerprint = sha256(canonical(fields));
  // Freeze the first completed payload before submitting. Deterministic client id
  // makes recovery safe if the process stops between insertion and receipt storage.
  const claimed = await KioskHandoff.findOneAndUpdate({_id:doc._id,expiresAt:{$gt:new Date()},$or:[{fingerprint:{$exists:false}},{fingerprint}]},{$set:{fingerprint},$unset:{draft:1}},{new:true});
  if (!claimed) {
    const latest = await handoff(token);
    if (latest.receipt) return latest.receipt;
    throw failure(409, 'handoff submission already in progress');
  }
  const {doc:submission} = await submit({...fields,clientSubmissionId:doc.clientSubmissionId});
  const receipt = {id:String(submission._id),status:submission.status,submittedAt:submission.submittedAt};
  await KioskHandoff.updateOne({_id:doc._id},{$set:{receipt},$unset:{draft:1}});
  return receipt;
}

const pick = (doc: Record<string, unknown>, fields: string[]) => Object.fromEntries(fields.filter(k => doc[k] !== undefined).map(k=>[k,doc[k]]));
const objectEntries = (value: unknown): Record<string, unknown>[] => Array.isArray(value)
  ? value.filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && !Array.isArray(entry))
  : [];
const loc = (v: unknown) => v && typeof v === 'object' ? pick(v as Record<string,unknown>, ['ru','kz','en']) : v;
export async function snapshot(uploadsDir: string) {
  const [faculties,people,refs] = await Promise.all([Faculty.find().sort({id:1}).lean(),Person.find().sort({id:1}).lean(),TeacherRef.find().sort({id:1}).lean()]);
  const list = people.map(p => {
    const result = pick(p, ['id','kind','fac','dept','year','featured','video','accent','tag','name','spec','pos','org','bio','badge','highlight','meta','awards','mentorText','studentsText','mentors','students','photoUrl','media']);
    for (const key of ['name','spec','pos','org','bio','badge','highlight','meta']) if (key in result) result[key] = loc(result[key]);
    if (Array.isArray(result.awards)) result.awards = result.awards.map(loc);
    if ('media' in result) result.media = objectEntries(result.media).map(m=>pick(m,['name','kind','url']));
    return result;
  });
  const publicFaculties = faculties.map(f => {
    const result = pick(f,['id','est','grad','abbr','name','hist','depts']);
    result.name = loc(result.name); result.hist = loc(result.hist);
    result.depts = objectEntries(f.depts).map(d=>{const dept=pick(d,['id','est','count','grad','name','head','hist']);for(const k of ['name','head','hist']) if(k in dept) dept[k]=loc(dept[k]);return dept;});
    return result;
  });
  const teach = Object.fromEntries(refs.map(r=>[r.id,{name:loc(r.name),role:loc(r.role),...(r.link?{id:r.link}:{})}]));
  const byKind = (kind: string) => list.filter(p=>p.kind===kind);
  const payload = canonical({faculties:publicFaculties,alumni:byKind('alumnus'),teach,teachers:byKind('teacher'),laureates:byKind('laureate'),veterans:byKind('veteran')});
  const paths = new Map<string,string>();
  for (const p of list) {
    if (typeof p.photoUrl === 'string') paths.set(p.photoUrl,'image');
    if (Array.isArray(p.media)) for (const m of p.media) if (typeof m.url === 'string' && ['image','video'].includes(m.kind)) paths.set(m.url,m.kind);
  }
  const media: {path:string;sha256:string;size:number;kind:string}[] = [];
  for (const [url,kind] of [...paths.entries()].sort()) {
    if (!/^\/media\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(png|jpg|jpeg|gif|webp|avif|mp4|webm|ogv|mov)$/i.test(url)) continue;
    let file;
    try {
      file = await open(path.join(uploadsDir,path.basename(url)),constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 25*1024*1024) continue;
      const hash = createHash('sha256');
      for await (const chunk of createReadStream('',{fd:file.fd,autoClose:false})) hash.update(chunk);
      media.push({path:url,sha256:hash.digest('hex'),size:stat.size,kind});
    } catch (error) { if (!['ENOENT','ELOOP'].includes((error as NodeJS.ErrnoException).code || '')) throw error; }
    finally { await file?.close(); }
  }
  const digest = sha256(payload);
  return {schemaVersion:1,revision:digest,generatedAt:new Date().toISOString(),payload,sha256:digest,media};
}
