import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,signIn,input} from './feedback-linear-server-fixture.test.mjs';
import {createLinearIntake} from '../src/lib/feedback-linear/server/intake.ts';
import {createLinearProvider} from '../src/lib/feedback-linear/server/provider.ts';
import {httpWitness} from './feedback-linear-witness-http-fixture.test.mjs';
import {witnessOperation} from '../src/lib/feedback-linear/server/witness.ts';
import {parsePrivateComment,managedCommentId,signPrivateRecord,requestHash,renderPrivateComment} from '../src/lib/feedback-linear/server/records.ts';
function realProvider(f){return createLinearProvider(f.config,{authorizeUrl:'https://linear.app/oauth/authorize',tokenUrl:`${f.peer.url}/token`,revokeUrl:`${f.peer.url}/revoke`,graphqlUrl:`${f.peer.url}/graphql`});}
export async function intakeFixture(t,witnessConfig){const f=await fixture(t),{auth}=await signIn(f),actor=await f.service.actor(auth.session),provider=realProvider(f),config={...f.config,testMode:false,...(witnessConfig?{witness:witnessConfig}:{})};return {...f,actor,provider,config,intake:createLinearIntake(config,provider,()=>new Date(f.state.clock))};}
test('missing independent witness blocks production create followup status list before Linear effects',async t=>{
 const f=await intakeFixture(t),id=randomUUID();
 const calls=[()=>f.intake.create(f.actor,id,input()),()=>f.intake.followup(f.actor,id,randomUUID(),{...input(),expectedVersion:1}),()=>f.intake.status(f.actor,id),()=>f.intake.list(f.actor,20)];
 const count=f.state.requests.length;
 for(const call of calls)await assert.rejects(call(),e=>e.status===503);
 assert.equal(f.state.requests.length,count);assert.equal(f.state.issues.size,0);
});

export async function witnessedIntake(t){
 const h=await httpWitness(t),f=await intakeFixture(t),config={...f.config,testMode:true,witness:{url:h.url,token:h.writeToken}},mutations=[];
 const provider={...f.provider,async graphql(token,name,query,variables){
  if(name==='AtlasIssueCreate'||name==='AtlasCommentCreate'){
   const id=name==='AtlasIssueCreate'?variables.input.id:variables.input.issueId,rows=await h.w.read(id);
   assert(rows.length>0,'reservation BEFORE any provider mutation');assert.equal(rows.at(-1).state,'reserved');mutations.push({name,rows});
  }
  return f.provider.graphql(token,name,query,variables);
 }};
 return {...f,h,config,mutations,intake:createLinearIntake(config,provider,()=>new Date(f.state.clock))};
}
test('website reserves canonical operation BEFORE first Linear mutation and completes only after exact readback, with timestamp-stable retry',async t=>{
 const f=await witnessedIntake(t),id=randomUUID(),send=()=>f.intake.create(f.actor,id,input());
 const first=await send();assert.equal(first.version,1);assert.equal(f.mutations.length,2);
 const saved=parsePrivateComment(f.config,f.state.comments.get(managedCommentId(id,1)).body);
 assert.deepEqual((await f.h.w.read(id))[0],{...witnessOperation(saved),state:'committed',effects:['issue','comment']});
 f.state.clock+=10000;assert.deepEqual(await send(),first);assert.equal(f.mutations.length,2,'exact retry has no mutation');
 await assert.rejects(f.intake.create(f.actor,id,input('changed')),e=>e.status===409);
 assert.equal((await f.intake.status(f.actor,id)).version,1);assert.equal((await f.intake.list(f.actor,20)).items.length,1);
});

test('correction is independently reserved before Linear write; exact retry survives clocks and deleted correction between worker polls blocks every path',async t=>{
 const f=await witnessedIntake(t),id=randomUUID();await f.intake.create(f.actor,id,input());
 const key=randomUUID(),body={...input('correction'),expectedVersion:1};
 assert.equal((await f.intake.followup(f.actor,id,key,body)).version,2);
 f.state.clock+=5000;assert.equal((await f.intake.followup(f.actor,id,key,body)).version,2);assert.equal(f.mutations.length,3);
 await f.intake.followup(f.actor,id,randomUUID(),{...input('third'),expectedVersion:2});
 assert.equal((await f.intake.followup(f.actor,id,key,body)).version,2,'old exact operation retry after later versions');
 f.state.comments.delete(managedCommentId(id,3));f.state.comments.delete(managedCommentId(id,2));
 const writes=f.mutations.length;
 for(const call of [()=>f.intake.status(f.actor,id),()=>f.intake.list(f.actor,20),()=>f.intake.create(f.actor,id,input()),()=>f.intake.followup(f.actor,id,key,body),()=>f.intake.followup(f.actor,id,randomUUID(),body)])await assert.rejects(call());
 assert.equal(f.mutations.length,writes,'rollback is never repaired by recreating records');
});

test('unknown comment effect is parked forever rather than replayed after partial failure, while exact actual readback can complete',async t=>{
 const f=await witnessedIntake(t),id=randomUUID();f.state.failComment=true;
 await assert.rejects(f.intake.create(f.actor,id,input()));
 assert.equal((await f.h.w.read(id))[0].state,'reserved');
 const writes=f.mutations.length;f.state.failComment=false;f.state.clock+=10000;
 await assert.rejects(f.intake.create(f.actor,id,input()));assert.equal(f.mutations.length,writes,'never repeat an uncertain provider mutation');
 await assert.rejects(f.intake.create(f.actor,id,input('changed')),e=>e.status===409);
 await assert.rejects(f.intake.status(f.actor,id));await assert.rejects(f.intake.list(f.actor,20));
 const intended=f.state.requests.map(r=>{try{return JSON.parse(r.body);}catch{return {};}}).find(r=>r.operationName==='AtlasCommentCreate').variables.input;
 f.state.comments.set(intended.id,{id:intended.id,body:intended.body,issue:{id},user:{id:f.config.ownerId},parent:null,externalThread:null,syncedWith:[],archivedAt:null,createdAt:new Date(f.state.clock).toISOString()});
 assert.equal((await f.intake.create(f.actor,id,input())).version,1);assert.equal(f.mutations.length,writes);
});

test('list reconciles every witnessed identity even beyond requested limit or an entirely deleted issue',async t=>{
 const f=await witnessedIntake(t),a=randomUUID(),b=randomUUID();await f.intake.create(f.actor,a,input());await f.intake.create(f.actor,b,input('second'));
 f.state.issues.delete(b);
 await assert.rejects(f.intake.list(f.actor,1),'limit cannot hide a deleted witnessed identity');
 f.state.issues.delete(a);await assert.rejects(f.intake.list(f.actor,20),'empty source is not evidence of no intake');
});

test('committed whole-issue deletion never recreates identity even when synthetic provider allows reuse',async t=>{
 const f=await witnessedIntake(t),id=randomUUID();await f.intake.create(f.actor,id,input());const before=f.mutations.length;
 f.state.issues.delete(id);f.state.comments.clear();f.state.reservedComments.clear();
 await assert.rejects(f.intake.create(f.actor,id,input()));assert.equal(f.mutations.length,before);assert.equal(f.state.issues.size,0);
});

test('ambiguous successful comment response remains reserved until exact source readback is visible; retry performs no write',async t=>{
 const f=await witnessedIntake(t),id=randomUUID();f.state.hideComments=true;await assert.rejects(f.intake.create(f.actor,id,input()));
 assert.equal(f.state.comments.size,1);assert.equal((await f.h.w.read(id))[0].state,'reserved');const before=f.mutations.length;
 f.state.hideComments=false;await assert.rejects(f.intake.status(f.actor,id));f.state.clock+=10000;
 assert.equal((await f.intake.create(f.actor,id,input())).version,1);assert.equal(f.mutations.length,before);assert.equal((await f.h.w.read(id))[0].state,'committed');
});

test('pending followup never authorizes earlier prefix and cannot be bypassed with another operation or changed body',async t=>{
 const f=await witnessedIntake(t),id=randomUUID(),key=randomUUID(),body={...input('pending correction'),expectedVersion:1};await f.intake.create(f.actor,id,input());f.state.failComment=true;
 await assert.rejects(f.intake.followup(f.actor,id,key,body));const before=f.mutations.length;
 f.state.failComment=false;f.state.clock+=10000;
 await assert.rejects(f.intake.followup(f.actor,id,key,body));
 await assert.rejects(f.intake.followup(f.actor,id,randomUUID(),body),e=>e.status===409);
 await assert.rejects(f.intake.followup(f.actor,id,key,{...body,feedback:'changed'}),e=>e.status===409);
 await assert.rejects(f.intake.status(f.actor,id));await assert.rejects(f.intake.list(f.actor,20));assert.equal(f.mutations.length,before);
});

test('intake reconstructs exact signed bytes from a competing canonical reservation made after its first witness read',async t=>{
 const f=await witnessedIntake(t),id=randomUUID(),createdAt=new Date(f.state.clock-1000).toISOString();let seeded=false;
 const base={schema:'atlas-linear-feedback-v1',feedbackId:id,operationId:id,ownerLinearId:f.config.ownerId,version:1,createdAt,input:input()},canonical=signPrivateRecord(f.config,{...base,requestHash:requestHash(base)});
 const provider={...f.provider,async graphql(...args){if(args[1]==='AtlasIssue'&&!seeded){seeded=true;await f.h.client.reserve(witnessOperation(canonical));}return f.provider.graphql(...args);}};
 const intake=createLinearIntake(f.config,provider,()=>new Date(f.state.clock));assert.equal((await intake.create(f.actor,id,input())).version,1);
 const actual=parsePrivateComment(f.config,f.state.comments.get(managedCommentId(id,1)).body);assert.deepEqual(actual,canonical);assert.equal((await f.h.w.read(id))[0].state,'committed');
});

test('valid signature and matching request digest with different signed timestamp cannot complete reservation',async t=>{
 const f=await witnessedIntake(t),id=randomUUID();f.state.hideComments=true;await assert.rejects(f.intake.create(f.actor,id,input()));f.state.hideComments=false;
 const comment=f.state.comments.get(managedCommentId(id,1)),saved=parsePrivateComment(f.config,comment.body),{signature,...unsigned}=saved;void signature;
 comment.body=renderPrivateComment(signPrivateRecord(f.config,{...unsigned,createdAt:new Date(Date.parse(saved.createdAt)-1000).toISOString()}));
 await assert.rejects(f.intake.create(f.actor,id,input()));assert.equal((await f.h.w.read(id))[0].state,'reserved');
});
