import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {ids,input} from './feedback-linear-server-fixture.test.mjs';
import {signPrivateRecord,privateRecordHash,requestHash} from '../src/lib/feedback-linear/server/records.ts';
const config={...ids,sessionKey:Buffer.alloc(32,7).toString('base64url')};
export const scope={...ids};
export async function store(t){const {FileIntakeWitness}=await import('../scripts/feedback-linear/witness-store.ts');const root=await mkdtemp('/opt/data/tmp/atlas-witness-');t.after(()=>rm(root,{recursive:true,force:true}));const w=new FileIntakeWitness({root,scope});return {w,root,FileIntakeWitness};}
export function record(id=randomUUID(),version=1,previous){const base={schema:'atlas-linear-feedback-v1',feedbackId:id,operationId:version===1?id:randomUUID(),version,ownerLinearId:ids.ownerId,createdAt:new Date().toISOString(),input:input(),...(previous?{previousRecordHash:privateRecordHash(previous)}:{})};return signPrivateRecord(config,{...base,requestHash:requestHash(base)});}
export const operation=r=>({feedbackId:r.feedbackId,version:r.version,operationId:r.operationId,createdAt:r.createdAt,requestHash:r.requestHash,recordHash:privateRecordHash(r),...(r.previousRecordHash?{previousRecordHash:r.previousRecordHash}:{})});

test('independent store requires explicit initialization; reserve is blocking until exact commit; deleted unseen tail never accepts old prefix',async t=>{
 const {w,root,FileIntakeWitness}=await store(t);
 await assert.rejects(w.assertAvailable());await w.initialize();await w.assertAvailable();
 const a=record(),b=record(a.feedbackId,2,a);
 await assert.rejects(w.assertLatest([a]));
 await w.reserve(operation(a));await assert.rejects(w.assertLatest([a]));
 await w.complete(operation(a));await w.assertLatest([a]);
 await w.reserve(operation(b));await assert.rejects(w.assertLatest([a]));
 await w.complete(operation(b));
 const restarted=new FileIntakeWitness({root,scope});
 await assert.rejects(restarted.assertLatest([a]));await restarted.assertLatest([a,b]);
});
