import {z} from 'zod';
import {digest, sha, uuid, hostPayload, type InputPolicy} from './input';
import {publicContextSchema} from '../../src/lib/feedback/schema';
export const captureSchema = z.object({
  captureId: uuid, at: z.number().int(), candidateDigest: digest, revision: z.literal(1), baseSha: sha, patchDigest: digest, checksDigest: digest,
  route: publicContextSchema.shape.route, theme: z.enum(['light','dark','system']), browser: z.literal('trusted-parent-browser'),
  before: z.object({digest, width: z.number().int().positive().max(10000), height: z.number().int().positive().max(10000)}).strict(),
  after: z.object({digest, width: z.number().int().positive().max(10000), height: z.number().int().positive().max(10000)}).strict(),
}).strict();
export type Capture = z.infer<typeof captureSchema>;
export type Proposal = {schema: 1; revision: 1; candidateDigest: string; captureDigest: string; beforeDigest: string; afterDigest: string; channelId: string; inputHash: string; baseSha: string; patchDigest: string; checksDigest: string; expiresAt: number};
/** Pixels are supplied only by the separately trusted parent capture adapter. No renderer stub. */
export function assertPng(bytes: Buffer, expected: Capture['before']) {
  if (bytes.length < 45 || bytes.length > 16 * 1024 * 1024 || bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii',12,16) !== 'IHDR' || bytes.readUInt32BE(16) !== expected.width || bytes.readUInt32BE(20) !== expected.height) throw new Error('review_blocked');
}

const message = z.string().regex(/^[0-9]{10,16}\.[0-9]{6}$/);
export const deliverySchema = z.object({eventId:uuid,at:z.number().int(),channelId:z.string().min(1).max(100),threadId:message,proposalDigest:digest,beforeDigest:digest,afterDigest:digest,messageIds:z.tuple([message,message]),linearCommentId:uuid}).strict();
export const decisionSchema = z.object({eventId:uuid,at:z.number().int(),channelId:z.string().min(1).max(100),threadId:message,messageId:message,proposalDigest:digest,decision:z.enum(['approve','reject']),speakerId:z.string().min(1).max(100),speakerType:z.literal('human'),linearCommentId:uuid}).strict();

export const threadRequestSchema = z.object({nonce:uuid,requestedAt:z.number().int(),channelId:z.string(),threadId:message,proposalDigest:digest}).strict();
export type ThreadRequest = z.infer<typeof threadRequestSchema>;
export const threadSchema = z.object({request:threadRequestSchema,readAt:z.number().int(),messages:z.array(z.object({messageId:message,speakerId:z.string().min(1),speakerType:z.enum(['human','bot']),text:z.string().max(3000)}).strict()).min(1).max(1000),messageCount:z.number().int().positive(),nextCursor:z.null()}).strict();

// No fake Linear identifiers: v2 private receipts are disjoint from strict ordinary v1.
export const witnessedDeliverySchema=deliverySchema.omit({linearCommentId:true}).extend({schema:z.literal('atlas-linear-witnessed-delivery-v2')}).strict();
export const witnessedDecisionSchema=decisionSchema.omit({linearCommentId:true}).extend({schema:z.literal('atlas-linear-witnessed-decision-v2')}).strict();
export const deliveryPurpose=(p:InputPolicy)=>p.authority==='witnessed-intake-v1'?'atlas-linear-witnessed-review-delivery-v2':'atlas-linear-review-delivery-v1';
export const decisionPurpose=(p:InputPolicy)=>p.authority==='witnessed-intake-v1'?'atlas-linear-witnessed-human-decision-v2':'atlas-linear-human-decision-v1';
export function readDelivery(value:unknown,p:InputPolicy){return p.authority==='witnessed-intake-v1'?hostPayload(value,deliveryPurpose(p),p.hostPublicKey,witnessedDeliverySchema):hostPayload(value,deliveryPurpose(p),p.hostPublicKey,deliverySchema);}
export function readDecision(value:unknown,p:InputPolicy){return p.authority==='witnessed-intake-v1'?hostPayload(value,decisionPurpose(p),p.hostPublicKey,witnessedDecisionSchema):hostPayload(value,decisionPurpose(p),p.hostPublicKey,decisionSchema);}
