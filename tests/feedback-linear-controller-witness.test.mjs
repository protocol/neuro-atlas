import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {ReviewController} from '../scripts/feedback-linear/controller.ts';
import {canonical,privateRecordHash,requestHash,signPrivateRecord} from '../src/lib/feedback-linear/server/records.ts';
import {derivedKey} from '../src/lib/feedback-linear/server/crypto.ts';

const ids={ownerId:'11111111-1111-4111-8111-111111111111',workspaceId:'22222222-2222-4222-8222-222222222222',projectId:'33333333-3333-4333-8333-333333333333',teamId:'44444444-4444-4444-8444-444444444444'};
const backend={...ids,sessionKey:Buffer.alloc(32,23).toString('base64url')}; // Synthetic only.
const host=generateKeyPairSync('ed25519');
function record(id=randomUUID(),prior){
 const version=prior?prior.version+1:1;
 const base={schema:'atlas-linear-feedback-v1',feedbackId:id,operationId:prior?randomUUID():id,ownerLinearId:ids.ownerId,version,createdAt:new Date().toISOString(),input:{feedback:'Synthetic card spacing correction',processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/field-velocity',theme:'light',viewport:{width:390,height:844}}},...(prior?{previousRecordHash:privateRecordHash(prior)}:{})};
 return signPrivateRecord(backend,{...base,requestHash:requestHash(base)});
}
const operation=r=>({feedbackId:r.feedbackId,operationId:r.operationId,version:r.version,createdAt:r.createdAt,requestHash:r.requestHash,recordHash:privateRecordHash(r),...(r.previousRecordHash?{previousRecordHash:r.previousRecordHash}:{})});
function receipt(records){
 const payload={readAt:Date.now(),workspace:'synthetic',issue:{id:records[0].feedbackId,identifier:'SYN-1',url:'https://linear.app/synthetic/issue/SYN-1',projectId:ids.projectId,teamId:ids.teamId},records};
 return {payload,signature:sign(null,Buffer.from(canonical({purpose:'atlas-linear-native-read-v1',payload})),host.privateKey).toString('base64')};
}
function config(root,witness,readNative){return {enabled:true,root:root+'/jobs',repo:root,historyWitness:witness,inputPolicy:{ownerId:ids.ownerId,workspace:'synthetic',projectId:ids.projectId,teamId:ids.teamId,hostPublicKey:host.publicKey,recordKey:derivedKey(backend,'atlas-linear-private-v1')},channelId:'C_SYNTHETIC',reviewerIds:['U_SYNTHETIC'],capturePublicKey:host.publicKey,readNative,mainOrigin:'https://api.github.com',maxTokens:10000,maxWallMs:20000,proposalTtlMs:3600000,maxJobUsd:1,maxDayUsd:5,model:{},modelKey:()=>''};}

test('controller admits only the independently witnessed exact latest chain and blocks a correction deleted between native reads',async t=>{
 assert.equal(typeof ReviewController.prototype.assertCurrentInput,'function','controller needs witnessed current-input admission');
 const {FileIntakeWitness}=await import('../scripts/feedback-linear/witness-store.ts');
 const root=await mkdtemp('/opt/data/tmp/atlas-controller-witness-');t.after(()=>rm(root,{recursive:true,force:true}));
 const witness=new FileIntakeWitness({root:root+'/witness',scope:ids});await witness.initialize();
 const a=record(),b=record(a.feedbackId,a);let records=[a],reads=0;
 const c=new ReviewController(config(root,witness,async()=>{reads++;return receipt(records);}));
 await assert.rejects(c.assertCurrentInput());
 await witness.reserve(operation(a));await witness.complete(operation(a));
 assert.equal((await c.assertCurrentInput()).recordHash,privateRecordHash(a));
 await witness.reserve(operation(b)); // New correction, even before its Linear write.
 await assert.rejects(c.assertCurrentInput());
 await witness.complete(operation(b)); // Simulate create+delete entirely between worker polls.
 await assert.rejects(c.assertCurrentInput());
 records=[a,b];assert.equal((await c.assertCurrentInput()).recordHash,privateRecordHash(b));
 await assert.rejects(c.assertCurrentInput(privateRecordHash(a)),/review_blocked/);
 assert.ok(reads>=4);
});

test('witness flags, foreign scope and uninitialized volumes cannot admit native input; cryptographic source verification still precedes witness comparison',async t=>{
 const {FileIntakeWitness}=await import('../scripts/feedback-linear/witness-store.ts');
 const root=await mkdtemp('/opt/data/tmp/atlas-controller-witness-trust-');t.after(()=>rm(root,{recursive:true,force:true}));
 let reads=0;const a=record(),readNative=async()=>{reads++;return receipt([a]);};
 for(const witness of [true,{scope:ids,assertAvailable:async()=>{},assertLatest:async()=>{}},new FileIntakeWitness({root:root+'/foreign',scope:{...ids,ownerId:ids.teamId}})]){
  await assert.rejects(new ReviewController(config(root,witness,readNative)).assertCurrentInput(),/native_history_witness_unavailable/);
 }
 assert.equal(reads,0);
 const witness=new FileIntakeWitness({root:root+'/witness',scope:ids}),c=new ReviewController(config(root,witness,readNative));
 await assert.rejects(c.assertCurrentInput());assert.equal(reads,0,'unavailable independent storage blocks before any source read');
 await witness.initialize();await witness.reserve(operation(a));await witness.complete(operation(a));
 const changed={...a,input:{...a.input,feedback:'Tampered synthetic input'}};
 c.config.readNative=async()=>receipt([changed]);
 await assert.rejects(c.assertCurrentInput(),/native_input_rejected/);
});
