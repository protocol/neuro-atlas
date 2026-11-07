import {createHmac, timingSafeEqual, verify, type KeyLike} from 'node:crypto';
import {z} from 'zod';
import {canonical} from '../feedback/engine';
import {sha256} from '../feedback/validator';
import {feedbackText, publicContextSchema, elementReferenceSchema} from '../../src/lib/feedback/schema';
import {managedCommentId} from '../../src/lib/feedback-linear/server/records';
import {LINEAR_FEEDBACK_POLICY_VERSION} from '../../src/lib/feedback-linear/contracts';

export const uuid = z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
const actorUuid = z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
// Exact backend byte-order canonicalization for website record signatures.
export function nativeCanonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(nativeCanonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => JSON.stringify(k) + ':' + nativeCanonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const sha = z.string().regex(/^[a-f0-9]{40}$/);
const recordSchema = z.object({
  schema: z.literal('atlas-linear-feedback-v1'), feedbackId: uuid, version: z.number().int().min(1).max(1000), operationId: uuid, ownerLinearId: actorUuid,
  requestHash: digest, previousRecordHash: digest.optional(), createdAt: z.string().datetime(),
  input: z.object({feedback: feedbackText(3000), processingConsent: z.object({approved: z.literal(true), policyVersion: z.literal(LINEAR_FEEDBACK_POLICY_VERSION)}).strict(), context: publicContextSchema.extend({element: elementReferenceSchema.optional()}).strict()}).strict(),
  signature: digest,
}).strict();
const nativeSchema = z.object({readAt: z.number().int(), workspace: z.string().min(1).max(100), issue: z.object({id: uuid, identifier: z.string().regex(/^[A-Z][A-Z0-9]*-[1-9][0-9]*$/), url: z.string().url().max(300), projectId: actorUuid, teamId: actorUuid}).strict(), records: z.array(recordSchema).min(1).max(1000)}).strict();
export type InputPolicy = {ownerId: string; workspace: string; projectId: string; teamId: string; hostPublicKey: KeyLike; recordKey: Buffer} & ({authority?: 'ordinary-v1'} | {authority: 'witnessed-intake-v1'; workspaceId: string; issueId: string});
// This is a distinct provenance authority, NOT evidence of current non-sync privacy.
const witnessedObservationSchema = z.object({commentId:actorUuid,authorId:actorUuid,parentId:z.null(),quotedText:z.null(),issue:z.object({id:actorUuid}).strict().optional(),parent:z.null().optional(),externalThread:z.null().optional(),syncedWith:z.union([z.null(),z.array(z.unknown()).max(0)]).optional(),archivedAt:z.null().optional(),onBehalfOf:z.null().optional()}).strict();
const witnessedNativeSchema = nativeSchema.extend({schema:z.literal('atlas-linear-witnessed-native-read-v1'),authority:z.literal('witnessed-intake-v1'),workspaceId:actorUuid,observations:z.array(witnessedObservationSchema).min(1).max(1000)}).strict();
export const nativePurpose = (policy:InputPolicy) => policy.authority==='witnessed-intake-v1'?'atlas-linear-witnessed-native-read-v1':'atlas-linear-native-read-v1';
export type Signed<T> = {payload: T; signature: string};
/** Called only with a configured HOST trust key, never a key supplied in input/model/issue. */
export function hostPayload<T>(value: unknown, purpose: string, key: KeyLike, schema: z.ZodType<T>): T {
  const wrapper = z.object({payload: z.unknown(), signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/)}).strict().parse(value);
  const payload = schema.parse(wrapper.payload);
  if (!verify(null, Buffer.from(canonical({purpose, payload})), key, Buffer.from(wrapper.signature, 'base64'))) throw new Error('host_signature_rejected');
  return payload;
}
export function fresh(at: number, maxAge = 300000) {
  if (!Number.isSafeInteger(at) || at > Date.now() + 1000 || at < Date.now() - maxAge) throw new Error('stale_evidence');
}
export function validateNative(value: unknown, policy: InputPolicy) {
  try {
    const native = policy.authority==='witnessed-intake-v1'
      ?hostPayload(value,nativePurpose(policy),policy.hostPublicKey,witnessedNativeSchema)
      :hostPayload(value,nativePurpose(policy),policy.hostPublicKey,nativeSchema);
    if(policy.authority==='witnessed-intake-v1') {
      const observed=witnessedNativeSchema.parse(native);
      if(observed.workspaceId!==policy.workspaceId||observed.issue.id!==policy.issueId||observed.observations.length!==observed.records.length)throw new Error();
      for(const [i,o] of observed.observations.entries())if(o.commentId!==managedCommentId(policy.issueId,i+1)||o.authorId!==policy.ownerId||(o.issue&&o.issue.id!==policy.issueId))throw new Error();
    }
    fresh(native.readAt);
    const url = new URL(native.issue.url), parts = url.pathname.split('/');
    if (native.workspace !== policy.workspace || native.issue.projectId !== policy.projectId || native.issue.teamId !== policy.teamId || url.origin !== 'https://linear.app' || url.username || url.password || url.search || url.hash || parts[1] !== policy.workspace || parts[2] !== 'issue' || parts[3] !== native.issue.identifier || parts.length < 4 || parts.length > 5 || (parts.length === 5 && !/^[a-z0-9-]+$/.test(parts[4]))) throw new Error();
    let previous: string | undefined;
    for (const [index, record] of native.records.entries()) {
      const {signature, ...unsigned} = record;
      const expected = createHmac('sha256', policy.recordKey).update(nativeCanonical(unsigned)).digest();
      if (policy.recordKey.length !== 32 || !timingSafeEqual(expected, Buffer.from(signature, 'hex')) || record.ownerLinearId !== policy.ownerId || record.feedbackId !== native.issue.id || record.version !== index + 1 || record.previousRecordHash !== previous || record.requestHash !== sha256(nativeCanonical({feedbackId:record.feedbackId,version:record.version,operationId:record.operationId,input:record.input})) || (record.version === 1 && record.operationId !== record.feedbackId) || Date.parse(record.createdAt) > native.readAt + 1000) throw new Error();
      previous = sha256(nativeCanonical(record));
    }
    return {native, record: native.records.at(-1)!, recordHash: previous!};
  } catch {throw new Error('native_input_rejected');}
}
