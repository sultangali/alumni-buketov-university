import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'crypto';
import mongoose from 'mongoose';
import type { Server } from 'http';
import { createApp } from '../src/index';
import { Submission } from '../src/models/Submission';
import { Person } from '../src/models/Person';
import { Faculty } from '../src/models/Faculty';
import { KioskHandoff } from '../src/models/KioskHandoff';
import { canonical,sha256 } from '../src/services/kiosk';
import { snapshot } from '../src/services/kiosk';
import { mkdtemp,writeFile,symlink,rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const db = `alumni_test_${Date.now()}_${process.pid}`;
const uri = `mongodb://127.0.0.1:27017/${db}`;
let server: Server, base: string;
const valid = {name:{ru:'Kiosk test',en:'Test'},fac:'mit',contact:'secret@example.test',bio:'Biography',year:2005};
async function request(route: string,method='GET',body?:unknown,headers:Record<string,string>={}) {
  const response = await fetch(base+route,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,headers:response.headers,body:response.status===304?undefined:await response.json() as any};
}
before(async()=>{
  if (!/^alumni_test_\d+_\d+$/.test(db)) throw Error('unsafe database');
  await mongoose.connect(uri,{serverSelectionTimeoutMS:5000});
  await Promise.all([Submission.init(),Person.init(),KioskHandoff.init()]);
  process.env.CORS_ORIGINS='https://alumni.example.test';
  server=createApp().listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api`;
});
after(async()=>{
  if (server) {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  if (mongoose.connection.readyState===1) {
    if (mongoose.connection.name !== db || !/^alumni_test_\d+_\d+$/.test(db)) throw Error('unsafe cleanup');
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});
test('simultaneous retries create exactly one record; canonical keys and UUID casing are stable',async()=>{
  const id=randomUUID();
  const results=await Promise.all(Array.from({length:16},(_,i)=>request('/submissions','POST',{...valid,name:i%2?{en:'Test',ru:'Kiosk test'}:valid.name,clientSubmissionId:i%2?id.toUpperCase():id})));
  assert.equal(results.filter(r=>r.status===201).length,1);
  assert.ok(results.every(r=>[200,201].includes(r.status)));
  assert.equal(new Set(results.map(r=>r.body.id)).size,1);
  assert.equal(await Submission.countDocuments({clientSubmissionId:id}),1);
  assert.ok(results.every(r=>!('clientSubmissionId' in r.body)&&!('payloadFingerprint' in r.body)));
  assert.ok(results.every(r=>Object.keys(r.body).sort().join(',')==='id,status,submittedAt'));
  assert.equal((await request('/submissions','POST',{...valid,contact:'different',clientSubmissionId:id})).status,409);
  assert.equal((await request('/submissions','POST',{...valid,clientSubmissionId:'bad'})).status,400);
});
test('conflicting first-use race has exactly one winner and preserves its payload',async()=>{
  const clientSubmissionId=randomUUID();
  const results=await Promise.all(['first','second'].map(contact=>request('/submissions','POST',{...valid,contact,clientSubmissionId})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal(await Submission.countDocuments({clientSubmissionId}),1);
});
test('legacy clients without id remain compatible',async()=>{
  const a=await request('/submissions','POST',valid),b=await request('/submissions','POST',valid);
  assert.equal(a.status,201);assert.equal(a.body.contact,valid.contact);assert.notEqual(a.body.id,b.body.id);
});
test('snapshot has verified bytes, stable revision and no staff/contact metadata',async()=>{
  await Person.collection.insertOne({id:'snapshot-person',kind:'alumnus',name:{ru:'Public',contact:'nested secret'},contact:'private contact',createdBy:'private staff',createdAt:'private creation',photoUrl:'https://external.invalid/do-not-fetch.jpg',media:[{name:'Bad traversal',kind:'image',url:'/media/../secret.png'}]});
  const first=await request('/kiosk/snapshot');assert.equal(first.status,200);
  assert.equal(first.body.schemaVersion,1);
  assert.equal(createHash('sha256').update(first.body.payload).digest('hex'),first.body.sha256);
  assert.equal(first.body.revision,first.body.sha256);
  assert.equal(first.body.media.length,0);
  for(const secret of ['nested secret','private contact','private staff','private creation','createdBy','createdAt']) assert.ok(!first.body.payload.includes(secret));
  assert.equal(JSON.parse(first.body.payload).alumni[0].name.ru,'Public');
  const second=await request('/kiosk/snapshot');assert.equal(second.body.revision,first.body.revision);
  assert.equal((await request('/kiosk/snapshot','GET',undefined,{'If-None-Match':first.headers.get('etag')!})).status,304);
});
test('handoffs hash tokens, validate drafts, expire on access and consume once under concurrency',async()=>{
  assert.equal((await request('/kiosk/handoffs','POST',{draft:{contact:{bad:true}}})).status,400);
  const made=await request('/kiosk/handoffs','POST',{draft:{name:'Draft',contact:valid.contact}});
  assert.equal(made.status,201);assert.match(made.body.token,/^[a-f0-9]{64}$/);
  const stored=await KioskHandoff.findOne({tokenHash:sha256(made.body.token)}).lean();
  assert.ok(stored);assert.ok(!JSON.stringify(stored).includes(made.body.token));
  const route='/kiosk/handoffs/'+made.body.token;
  assert.equal((await request(route)).body.draft.contact,valid.contact);
  const results=await Promise.all(Array.from({length:12},()=>request(route+'/submit','POST',valid)));
  assert.ok(results.every(r=>r.status===200));assert.equal(new Set(results.map(r=>r.body.id)).size,1);
  assert.ok(results.every(r=>Object.keys(r.body).sort().join(',')==='id,status,submittedAt'));
  assert.equal(await Submission.countDocuments({clientSubmissionId:stored.clientSubmissionId}),1);
  assert.equal((await request(route)).status,410);
  const retry=await request(route+'/submit','POST',{contact:'new payload'});assert.deepEqual(retry.body,results[0].body);
  assert.equal((await KioskHandoff.findById(stored._id))?.draft,undefined);
  await KioskHandoff.updateOne({_id:stored._id},{$set:{expiresAt:new Date(Date.now()-1)}});
  assert.equal((await request(route)).status,410);assert.equal((await request(route+'/submit','POST',valid)).status,410);
});
test('snapshot manifest hashes local media and refuses symlinks and traversal',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'alumni-kiosk-media-'));
  try {
    await writeFile(path.join(directory,'photo.png'),'image-test-bytes');
    await symlink(path.join(directory,'photo.png'),path.join(directory,'link.png'));
    await Person.create({id:'manifest-person',kind:'teacher',photoUrl:'/media/photo.png',media:[{name:'link',kind:'image',url:'/media/link.png'},{name:'traversal',kind:'image',url:'/media/../photo.png'}]});
    const result=await snapshot(directory);
    assert.deepEqual(result.media,[{path:'/media/photo.png',sha256:sha256('image-test-bytes'),size:16,kind:'image'}]);
  } finally {await rm(directory,{recursive:true,force:true});await Person.deleteOne({id:'manifest-person'});}
});
test('snapshot tolerates nullable legacy media and department collections',async()=>{
  await Person.create([
    {id:'nullable-media',kind:'alumnus',media:[null,{name:'Public photo',kind:'image',url:'/media/missing-legacy.png'}]},
    {id:'null-media-array',kind:'alumnus',media:null},
  ]);
  await Faculty.create([
    {id:'null-departments',depts:null},
    {id:'nullable-department-entry',depts:[null,{id:'real-dept',name:{ru:'Real department'}}]},
  ]);
  const response=await request('/kiosk/snapshot');
  assert.equal(response.status,200);
  assert.equal(sha256(response.body.payload),response.body.sha256);
  const payload=JSON.parse(response.body.payload);
  assert.deepEqual(payload.alumni.find((p:any)=>p.id==='nullable-media').media,[{name:'Public photo',kind:'image',url:'/media/missing-legacy.png'}]);
  assert.deepEqual(payload.alumni.find((p:any)=>p.id==='null-media-array').media,[]);
  assert.deepEqual(payload.faculties.find((f:any)=>f.id==='null-departments').depts,[]);
  assert.deepEqual(payload.faculties.find((f:any)=>f.id==='nullable-department-entry').depts,[{id:'real-dept',name:{ru:'Real department'}}]);
});
test('claimed handoff recovers after interruption, conflicting retry does not change submission',async()=>{
  const made=await request('/kiosk/handoffs','POST',{draft:{}});
  const hash=sha256(made.body.token);
  await KioskHandoff.updateOne({tokenHash:hash},{$set:{fingerprint:sha256(canonical(valid))},$unset:{draft:1}});
  const route='/kiosk/handoffs/'+made.body.token;
  assert.equal((await request(route)).status,410);
  assert.equal((await request(route+'/submit','POST',{...valid,contact:'changed'})).status,409);
  assert.equal((await request(route+'/submit','POST',valid)).status,200);
});
test('health, origin allowlist, bounded bodies and untrusted forwarding rate limits',async()=>{
  assert.equal((await request('/health')).body.database,'ready');
  assert.equal((await request('/health','GET',undefined,{Origin:'https://evil.example'})).headers.get('access-control-allow-origin'),null);
  assert.equal((await request('/health','GET',undefined,{Origin:'https://alumni.example.test'})).headers.get('access-control-allow-origin'),'https://alumni.example.test');
  assert.equal((await request('/submissions','POST',{...valid,bio:'x'.repeat(300000)})).status,413);
  const responses=[];
  for(let i=0;i<31;i++) responses.push(await request('/auth/login','POST',{}, {'X-Forwarded-For':`192.0.2.${i}`}));
  assert.equal(responses.at(-1)?.status,429);
});
