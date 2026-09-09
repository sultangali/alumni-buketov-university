import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { StaffUser } from '../src/models/StaffUser';
import { Faculty } from '../src/models/Faculty';
import { Submission } from '../src/models/Submission';
import { Person } from '../src/models/Person';
const db = `alumni_test_${Date.now()}_${process.pid}`;
// Deliberately ignore MONGO_URI: tests can only touch their own unique local database.
const uri = `mongodb://127.0.0.1:27017/${db}`;
if (!/^alumni_test_\d+_\d+$/.test(db) || !uri.endsWith('/'+db)) throw Error('unsafe test database');
let child: ChildProcess, token: string;
const port = String(42000 + process.pid % 15000);
const base = `http://127.0.0.1:${port}/api`;
async function request(path: string, method='GET', body?: unknown, auth=token) {
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status, body:await r.json() as any};
}
const valid={name:{ru:'Test Person'},year:2005,fac:'mit',spec:'Math',contact:'private@example.test',mentor:'Original mentor',students:'Original students'};
before(async()=>{
 await mongoose.connect(uri); await Promise.all([StaffUser.init(),Person.init()]);
 await StaffUser.create({username:'admin',passwordHash:await bcrypt.hash('test-pass',4),role:'admin'});
 await Faculty.create({id:'mit',name:{ru:'MIT'}});
 child=spawn('./node_modules/.bin/tsx',['src/index.ts'],{env:{...process.env,MONGO_URI:uri,PORT:port,JWT_SECRET:'test-secret'},stdio:'pipe'});
 for(let i=0;i<100;i++){try{if((await request('/health','GET',undefined,'')).status===200)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 token=(await request('/auth/login','POST',{username:'admin',password:'test-pass'},'')).body.token;
 assert.ok(token);
});
after(async()=>{child?.kill(); if (mongoose.connection.name !== db || !/^alumni_test_\d+_\d+$/.test(mongoose.connection.name)) throw Error('refusing unsafe cleanup'); await mongoose.connection.dropDatabase();await mongoose.disconnect();});
test('auth reflects live role/scope and invalidates suspended/deleted/reset sessions',async()=>{
 const staff=await StaffUser.create({username:'mod',passwordHash:await bcrypt.hash('pass',4),role:'moderator',fac:'mit'});
 const login=()=>request('/auth/login','POST',{username:'mod',password:'pass'},'');
 const t=(await login()).body.token;
 assert.equal((await request('/auth/me','GET',undefined,t)).body.fac,'mit');
 await StaffUser.updateOne({_id:staff._id},{$set:{fac:'law'}});
 assert.equal((await request('/auth/me','GET',undefined,t)).body.fac,'law');
 assert.equal((await request('/moderators','GET',undefined,t)).status,403);
 await StaffUser.updateOne({_id:staff._id},{$set:{role:'admin'}});
 assert.equal((await request('/moderators','GET',undefined,t)).status,200);
 await StaffUser.updateOne({_id:staff._id},{$set:{role:'moderator'}});
 assert.equal((await request('/moderators','GET',undefined,t)).status,403);
 await request('/moderators/'+staff._id,'PATCH',{password:'new-pass'});
 assert.equal((await request('/auth/me','GET',undefined,t)).status,401);
 const t2=(await request('/auth/login','POST',{username:'mod',password:'new-pass'},'')).body.token;
 await StaffUser.updateOne({_id:staff._id},{$set:{status:'suspended'}});
 assert.equal((await request('/submissions','GET',undefined,t2)).status,401);
 await StaffUser.deleteOne({_id:staff._id});
 assert.equal((await request('/submissions','GET',undefined,t2)).status,401);
});
test('contact survives approval privately and concurrent approvals publish once',async()=>{
 const made=await request('/submissions','POST',valid,''); assert.equal(made.status,201); assert.equal(made.body.contact,valid.contact);
 const id=made.body.id;
 const results=await Promise.all(Array.from({length:8},()=>request('/submissions/'+id,'PATCH',{action:'approve'})));
 assert.ok(results.every(r=>[200,409].includes(r.status)));
 const stored=await Submission.findById(id);assert.equal(stored?.get('contact'),valid.contact);assert.equal(stored?.get('mentor'),valid.mentor);
 assert.equal(await Person.countDocuments({'name.ru':valid.name.ru}),1);
 const people=(await request('/bootstrap','GET',undefined,'')).body.alumni;
 assert.ok(!JSON.stringify(people).includes(valid.contact));
 assert.equal((await request('/submissions/'+id,'PATCH',{action:'reject'})).status,409);
 assert.equal((await request('/submissions/'+id,'PATCH',{bio:'late change'})).status,409);
});
test('validation and unresolved faculty review',async()=>{
 for(const body of [{},{...valid,year:1.5},{...valid,contact:{}},{...valid,name:{$ne:null}},{...valid,photoUrl:'javascript:alert(1)'}]) assert.equal((await request('/submissions','POST',body,'')).status,400);
 const other=await request('/submissions','POST',{...valid,fac:'other'},'');assert.equal(other.status,201);
 assert.equal((await request('/submissions/'+other.body.id,'PATCH',{action:'approve'})).status,400);
 assert.equal((await request('/submissions/'+other.body.id,'PATCH',{fac:'mit'})).status,200);
 assert.equal((await request('/submissions/'+other.body.id,'PATCH',{action:'reject'})).status,200);
 assert.equal((await request('/submissions/'+other.body.id,'PATCH',{action:'approve'})).status,409);
 assert.equal((await request('/submissions/not-an-id')).status,400);
});
test('publishing recovery retains relationship text without inventing ids',async()=>{
 const made=await request('/submissions','POST',{...valid,name:'Recovery'},'');
 await Submission.updateOne({_id:made.body.id},{$set:{status:'publishing'}});
 assert.equal((await request('/submissions/'+made.body.id,'PATCH',{action:'approve'})).status,200);
 const person=await Person.findOne({id:`a-submission-${made.body.id}`});
 assert.equal(person?.get('mentorText'),valid.mentor);assert.equal(person?.get('studentsText'),valid.students);assert.equal(person?.get('mentors'),undefined);
 const direct=await request('/people','POST',{...valid,mentorText:'A mentor',studentsText:'A student'});
 assert.equal(direct.body.mentorText,'A mentor');
 assert.equal((await request('/people/'+direct.body.id,'PATCH',{mentorText:'Corrected',studentsText:''})).body.mentorText,'Corrected');
});
test('unsupported media returns 415',async()=>{
 const data=new FormData();data.set('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'test.svg');
 assert.equal((await fetch(base+'/media',{method:'POST',body:data})).status,415);
});
test('logout revokes token',async()=>{
 const t=(await request('/auth/login','POST',{username:'admin',password:'test-pass'},'')).body.token;
 assert.equal((await request('/auth/logout','POST',{},t)).status,200);
 assert.equal((await request('/auth/me','GET',undefined,t)).status,401);
});
