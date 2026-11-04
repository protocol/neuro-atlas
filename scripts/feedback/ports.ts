import type { KeyLike } from 'node:crypto';
import type { Patch } from './validator';
import type { Meter, ModelInput } from './model';
export type PublicTask={title:string;summary:string;acceptance:string[]};
export type PublicContext={route:string;targetId?:string;chartId?:string;scenario?:string;viewport:{width:number;height:number};theme:'light'|'dark'|'system';deployedRevision?:string};
export type Capability={jobId:string;feedbackId:string;inputVersion:number;approvalHash:string;publicTask:PublicTask;publicContext:PublicContext;baseSha:string;fence:number;attempt:number;leaseUntil:number};
export type CheckReceipt={phase:'baseline'|'candidate';passed:true;commands:string[];digest:string};
export type Receipt={policyVersion:'atlas-feedback-v1';jobId:string;feedbackId:string;inputVersion:number;approvalHash:string;baseSha:string;fence:number;patchDigest:string;checksDigest:string;expiresAt:number};
export type Bundle={receipt:Receipt;signature:string;publicTask:PublicTask;publicContext:PublicContext;patch:Patch;checks:{baseline:CheckReceipt;candidate:CheckReceipt}};
/** Production implementation must be durable/transactional, not a JS mutex or memory fallback. */
export interface WorkStore {
  /** Lock singleton control + job + feedback; validate enabled, finite positive limits, owner,
   * current version/approval; take one GLOBAL lease; monotonically fence; increment attempt <=2.
   * Never reclaim before a hard wall-clock expiry or confirmed termination. Base is trusted main. */
  acquire():Promise<Capability|null>;
  /** Check current control (including budgets), job/global fences, current inputVersion/approval,
   * lease and hard deadline atomically. Failure MUST reject; never return a stale boolean. */
  assertActive(cap:Capability):Promise<void>;
  /** Under same locks reserve worst-case USD against charged+reserved job/day totals BEFORE HTTP. */
  reserve(cap:Capability,upperUsd:number,upperTokens:number):Promise<string>;
  /** Idempotent reservation settlement, never charge > reserved; stale output cannot release spend. */
  reconcile(cap:Capability,id:string,actualUsd:number):Promise<void>;
  /** Unknown network/usage: retain full reservation; no retry/refund of ambiguous spend. */
  unknown(cap:Capability,id:string):Promise<void>;
  transition(cap:Capability,state:'working'|'validating'|'publishing'):Promise<void>;
  /** Atomically persist immutable bundle/outbox + state, checking fence. Publisher retains control checks. */
  complete(cap:Capability,bundle:Bundle):Promise<void>;
  park(cap:Capability,reason:'needs_human_review'|'failed'|'cancelled'):Promise<void>;
}
export type WorkerOptions={enabled?:boolean;store:WorkStore;cwd:string;model:{generate(input:ModelInput,meter:Meter,signal?:AbortSignal):Promise<{patch:unknown;chargedUsd:number}>};signingKey:KeyLike;checks?:(cwd:string,phase:'baseline'|'candidate',signal?:AbortSignal)=>Promise<CheckReceipt>;maxWallMs:number};
