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
export const witnessRowSchema=witnessOperationSchema.safeExtend({state:z.enum(['reserved','committed']),effects:z.array(z.enum(['issue','comment'])).max(2).optional()});
export type WitnessRow=z.infer<typeof witnessRowSchema>;
export const WITNESS_PATH='/v1/intake-witness';
export const WITNESS_REQUEST_BYTES=4096, WITNESS_RESPONSE_BYTES=512*1024, WITNESS_TIMEOUT_MS=3000;
export const witnessRequestSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('available'),policyDigest:digest}).strict(),
 z.object({action:z.literal('inventory'),policyDigest:digest}).strict(),
 z.object({action:z.literal('read'),policyDigest:digest,feedbackId:z.string().regex(UUID_V4)}).strict(),
 z.object({action:z.literal('reserve'),policyDigest:digest,operation:witnessOperationSchema}).strict(),
 z.object({action:z.literal('complete'),policyDigest:digest,operation:witnessOperationSchema}).strict(),
 z.object({action:z.literal('claim'),policyDigest:digest,operation:witnessOperationSchema,effect:z.enum(['issue','comment'])}).strict(),
]);
export const witnessResponseSchema=z.object({identity:z.literal('atlas-intake-witness-v1'),policyDigest:digest,rows:z.array(witnessRowSchema).max(1000),claimed:z.boolean().optional(),identities:z.array(z.string().regex(UUID_V4)).max(10000).optional()}).strict();
export interface IntakeWitness {readonly identity:string;readonly policyDigest:string;assertAvailable():Promise<void>;read(id:string):Promise<WitnessRow[]>;identities():Promise<string[]>;reserve(op:WitnessOperation):Promise<WitnessRow[]>;complete(op:WitnessOperation):Promise<WitnessRow[]>;claimEffect(op:WitnessOperation,effect:'issue'|'comment'):Promise<boolean>;assertLatest(records:LinearFeedbackPrivateRecord[]):Promise<void>}
export const witnessDigest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
export function witnessPolicyDigest(scope:WitnessScope){return witnessDigest({protocol:'atlas-intake-witness-v1',scope:witnessScopeSchema.parse(scope)});}
export function witnessOperation(record:LinearFeedbackPrivateRecord):WitnessOperation {return witnessOperationSchema.parse({feedbackId:record.feedbackId,operationId:record.operationId,version:record.version,requestHash:record.requestHash,recordHash:privateRecordHash(record),...(record.previousRecordHash?{previousRecordHash:record.previousRecordHash}:{}),createdAt:record.createdAt});}
export function assertWitnessChain(rows:WitnessRow[],records:LinearFeedbackPrivateRecord[],ownerId:string):void {
 if(!records.length||rows.length!==records.length)throw new Error('witness_history_mismatch');
 for(const [i,record] of records.entries()){
  const {state,effects: _effects,...op}=rows[i];
  void _effects;
  if(state!=='committed'||record.ownerLinearId!==ownerId||record.feedbackId!==records[0].feedbackId||record.version!==i+1||record.previousRecordHash!==(i?privateRecordHash(records[i-1]):undefined)||canonical(op)!==canonical(witnessOperation(record)))throw new Error('witness_history_mismatch');
 }
}
