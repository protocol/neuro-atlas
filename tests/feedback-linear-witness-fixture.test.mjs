import {mkdtemp,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {ids,input} from './feedback-linear-server-fixture.test.mjs';
import {signPrivateRecord,privateRecordHash,requestHash} from '../src/lib/feedback-linear/server/records.ts';
const config={...ids,sessionKey:Buffer.alloc(32,7).toString('base64url')};
export const scope={...ids};
export async function store(t){const {FileIntakeWitness}=await import('../scripts/feedback-linear/witness-store.ts');const root=await mkdtemp('/opt/data/tmp/atlas-witness-');t.after(()=>rm(root,{recursive:true,force:true}));const w=new FileIntakeWitness({root,scope});return {w,root,FileIntakeWitness};}
export function record(id=randomUUID(),version=1,previous){const base={schema:'atlas-linear-feedback-v1',feedbackId:id,operationId:version===1?id:randomUUID(),version,ownerLinearId:ids.ownerId,createdAt:new Date().toISOString(),input:input(),...(previous?{previousRecordHash:privateRecordHash(previous)}:{})};return signPrivateRecord(config,{...base,requestHash:requestHash(base)});}
export const operation=r=>({feedbackId:r.feedbackId,version:r.version,operationId:r.operationId,createdAt:r.createdAt,requestHash:r.requestHash,recordHash:privateRecordHash(r),...(r.previousRecordHash?{previousRecordHash:r.previousRecordHash}:{})});

