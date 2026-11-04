import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {LinearFeedbackPrivateRecord} from '../contracts';
import {canonical, privateRecordHash} from './records';
import {UUID, UUID_V4} from './config';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const witnessScopeSchema=z.object({workspaceId:z.string().regex(UUID),projectId:z.string().regex(UUID),teamId:z.string().regex(UUID),ownerId:z.string().regex(UUID)}).strict();
export type WitnessScope=z.infer<typeof witnessScopeSchema>;
export const witnessOperationSchema=z.object({feedbackId:z.string().regex(UUID_V4),operationId:z.string().regex(UUID_V4),version:z.number().int().min(1).max(1000),requestHash:digest,recordHash:digest,previousRecordHash:digest.optional(),createdAt:z.iso.datetime()}).strict().refine(r=>r.version===1?r.operationId===r.feedbackId&&r.previousRecordHash===undefined:r.previousRecordHash!==undefined);
export type WitnessOperation=z.infer<typeof witnessOperationSchema>;
export const witnessRowSchema=witnessOperationSchema.safeExtend({state:z.enum(['reserved','committed'])});
export type WitnessRow=z.infer<typeof witnessRowSchema>;
export interface IntakeWitness {readonly identity:string;readonly policyDigest:string;assertAvailable():Promise<void>;read(id:string):Promise<WitnessRow[]>;reserve(op:WitnessOperation):Promise<WitnessRow[]>;complete(op:WitnessOperation):Promise<WitnessRow[]>;assertLatest(records:LinearFeedbackPrivateRecord[]):Promise<void>}
export const witnessDigest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
export function witnessPolicyDigest(scope:WitnessScope){return witnessDigest({protocol:'atlas-intake-witness-v1',scope:witnessScopeSchema.parse(scope)});}
export function witnessOperation(record:LinearFeedbackPrivateRecord):WitnessOperation {return witnessOperationSchema.parse({feedbackId:record.feedbackId,operationId:record.operationId,version:record.version,requestHash:record.requestHash,recordHash:privateRecordHash(record),previousRecordHash:record.previousRecordHash,createdAt:record.createdAt});}
export function assertWitnessChain(rows:WitnessRow[],records:LinearFeedbackPrivateRecord[],ownerId:string):void {
 if(!records.length||rows.length!==records.length)throw new Error('witness_history_mismatch');
 for(const [i,record] of records.entries()){
  const {state,...op}=rows[i];
  if(state!=='committed'||record.ownerLinearId!==ownerId||record.feedbackId!==records[0].feedbackId||record.version!==i+1||record.previousRecordHash!==(i?privateRecordHash(records[i-1]):undefined)||canonical(op)!==canonical(witnessOperation(record)))throw new Error('witness_history_mismatch');
 }
}
