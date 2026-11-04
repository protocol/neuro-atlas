import {createHash, createHmac, timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {elementReferenceSchema, feedbackText, publicContextSchema} from '../../feedback/schema';
import {FeedbackError} from '../../feedback/errors';
import {LINEAR_FEEDBACK_POLICY_VERSION, type LinearFeedbackPrivateRecord} from '../contracts';
import {type LinearConfig, UUID_V4, UUID} from './config';
import {derivedKey} from './crypto';

export const PRIVATE_PURPOSE = 'atlas-linear-private-v1';
export const linearInputSchema = z.object({feedback:feedbackText(3000),processingConsent:z.object({approved:z.literal(true),policyVersion:z.literal(LINEAR_FEEDBACK_POLICY_VERSION)}).strict(),context:publicContextSchema.extend({element:elementReferenceSchema.optional()}).strict()}).strict();
export const linearFollowupSchema = linearInputSchema.extend({expectedVersion:z.number().int().min(1).max(999)}).strict();
const recordSchema = z.object({schema:z.literal('atlas-linear-feedback-v1'),feedbackId:z.string().regex(UUID_V4),version:z.number().int().min(1).max(1000),operationId:z.string().regex(UUID_V4),ownerLinearId:z.string().regex(UUID),requestHash:z.string().regex(/^[a-f0-9]{64}$/),previousRecordHash:z.string().regex(/^[a-f0-9]{64}$/).optional(),createdAt:z.iso.datetime(),input:linearInputSchema,signature:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export function corrupt(): never {throw new FeedbackError(409,'record_unverifiable','Feedback history could not be verified. Human review is required.');}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
const sha = (value:string)=>createHash('sha256').update(value).digest('hex');
export function requestHash(record: Pick<LinearFeedbackPrivateRecord,'feedbackId'|'version'|'operationId'|'input'>) {
  return sha(canonical({feedbackId:record.feedbackId,version:record.version,operationId:record.operationId,input:record.input}));
}
export function privateRecordHash(record: LinearFeedbackPrivateRecord): string {return sha(canonical(record));}
export function managedCommentId(feedbackId:string, version:number): string {
  const bytes=createHash('sha256').update(`${PRIVATE_PURPOSE}:comment:${feedbackId}:${version}`).digest().subarray(0,16);
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const h=bytes.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function signature(config:LinearConfig, record:Omit<LinearFeedbackPrivateRecord,'signature'>) {
  return createHmac('sha256',derivedKey(config,PRIVATE_PURPOSE)).update(canonical(record)).digest('hex');
}
export function signPrivateRecord(config:LinearConfig, value:Omit<LinearFeedbackPrivateRecord,'signature'>): LinearFeedbackPrivateRecord {
  return verifyPrivateRecord(config,{...value,signature:signature(config,value)});
}
export function verifyPrivateRecord(config:LinearConfig, value:unknown): LinearFeedbackPrivateRecord {
  const parsed=recordSchema.safeParse(value);if(!parsed.success)return corrupt();
  const {signature:given,...record}=parsed.data;
  if (record.ownerLinearId!==config.ownerId || record.requestHash!==requestHash(record) || (record.version===1 ? record.previousRecordHash!==undefined || record.operationId!==record.feedbackId : record.previousRecordHash===undefined) || !timingSafeEqual(Buffer.from(given,'hex'),Buffer.from(signature(config,record),'hex')))return corrupt();
  return parsed.data;
}
export function renderPrivateComment(record:LinearFeedbackPrivateRecord):string {return PRIVATE_PURPOSE+'\n```json\n'+canonical(record)+'\n```';}
export function parsePrivateComment(config:LinearConfig, body:string):LinearFeedbackPrivateRecord {
  const match=/^atlas-linear-private-v1\n```json\n([\s\S]+)\n```$/.exec(body);
  if(!match || body.length>16384)return corrupt();
  let value:unknown;try{value=JSON.parse(match[1]);}catch{return corrupt();}
  return verifyPrivateRecord(config,value);
}
