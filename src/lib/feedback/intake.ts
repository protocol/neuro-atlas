import {randomUUID} from "node:crypto";
import {z} from "zod";
import type {QueryDatabase} from "./database";
import type {Actor} from "./service";
import {hash} from "./service";
import {FeedbackError,invalid,unavailable} from "./errors";
import {FEEDBACK_TARGET_IDS,FEEDBACK_CHART_IDS,FEEDBACK_SCENARIOS,FEEDBACK_POLICY_VERSION,type FeedbackInput,type FeedbackStatus,type FeedbackReceipt,type FeedbackState} from "./contracts";

const text=(max:number)=>z.string().min(1).max(max).refine(s=>s.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s));
const shape={
  privateComment:text(3000),
  publicTask:z.object({title:text(100),summary:text(1500),acceptance:z.array(text(200)).min(1).max(5)}).strict(),
  publicApproval:z.object({approved:z.literal(true),policyVersion:z.literal(FEEDBACK_POLICY_VERSION)}).strict(),
  context:z.object({route:z.enum(["/","/field-velocity","/funding","/milestones","/ecosystem","/methodology"]),
    targetId:z.enum(FEEDBACK_TARGET_IDS).optional(),chartId:z.enum(FEEDBACK_CHART_IDS).optional(),scenario:z.enum(FEEDBACK_SCENARIOS).optional(),
    viewport:z.object({width:z.number().int().min(1).max(10000),height:z.number().int().min(1).max(10000)}).strict(),
    theme:z.enum(["light","dark","system"]),deployedRevision:z.string().regex(/^[a-f0-9]{40}$/).optional(),
  }).strict(),
};
export const feedbackInputSchema=z.object(shape).strict();
const followupSchema=z.object({...shape,expectedVersion:z.number().int().min(1).max(2147483646)}).strict();
const uuid=z.string().uuid();
function canonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value!==null&&typeof value==="object")return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,"en")).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
/** Exact sorted-key JSON, including policy and ALL reviewed public context. No private input. */
export const publicApprovalHash=(input:FeedbackInput)=>hash(canonical({policyVersion:input.publicApproval.policyVersion,publicTask:input.publicTask,publicContext:input.context}));
const conflict=(code:string,message:string):never=>{throw new FeedbackError(409,code,message);};
type StoredStatus={id:string;version:number;state:FeedbackState;created_at:Date|string;updated_at:Date|string;last_reason_code:string|null;clarification:string|null;pr_number:number|null;pr_head_sha:string|null;merged_sha:string|null;live_sha:string|null};
const statusColumns="id,version,state,created_at,updated_at,last_reason_code,clarification,pr_number,pr_head_sha,merged_sha,live_sha";
function statusDTO(row:StoredStatus):FeedbackStatus {
  const result:FeedbackStatus={id:row.id,version:row.version,state:row.state,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()};
  if(row.last_reason_code&&/^[a-z0-9_]{1,64}$/.test(row.last_reason_code))result.reasonCode=row.last_reason_code;
  if(row.clarification)result.clarification=row.clarification.slice(0,1500);
  if(row.pr_number&&row.pr_head_sha&&/^[a-f0-9]{40}$/.test(row.pr_head_sha))result.pr={number:row.pr_number,url:`https://github.com/protocol/neuro-atlas/pull/${row.pr_number}`,headSha:row.pr_head_sha};
  if(row.merged_sha&&/^[a-f0-9]{40}$/.test(row.merged_sha))result.mergedSha=row.merged_sha;
  if(row.live_sha&&/^[a-f0-9]{40}$/.test(row.live_sha))result.liveSha=row.live_sha;
  // No preview is exposed without a separately configured exact-project evidence reader.
  return result;
}
export function createFeedbackIntake(db:QueryDatabase,now:()=>Date) {
  async function intake(actor:Actor,key:string|null,value:unknown,feedbackId?:string):Promise<FeedbackReceipt> {
    if(!uuid.safeParse(key).success || (feedbackId!==undefined&&(!uuid.safeParse(feedbackId).success||feedbackId!==feedbackId.toLowerCase())))return invalid();
    const parsed=feedbackId===undefined?feedbackInputSchema.safeParse(value):followupSchema.safeParse(value);
    if(!parsed.success)return invalid();
    const input=parsed.data, operation=feedbackId?`followup:${feedbackId}`:"create",requestHash=hash(canonical(input));
    return db.transaction(async tx=>{
      const c=await tx.query<Record<string,unknown>>("SELECT * FROM atlas_feedback.control WHERE singleton=true FOR UPDATE");
      const control=c.rows[0];if(!control)return unavailable();
      const previous=await tx.query<{request_hash:string;response_metadata:FeedbackReceipt}>("SELECT request_hash,response_metadata FROM atlas_feedback.idempotency WHERE owner_github_id=$1 AND operation=$2 AND key=$3",[actor.githubId,operation,key]);
      if(previous.rows[0]) {if(previous.rows[0].request_hash!==requestHash)return conflict("idempotency_conflict","This request key was already used for different feedback.");return previous.rows[0].response_metadata;}
      const id=feedbackId??randomUUID(),time=now().toISOString();let version=1,from:FeedbackState|null=null,merged=false;
      if(feedbackId) {
        const current=await tx.query<StoredStatus>(`SELECT ${statusColumns} FROM atlas_feedback.feedback WHERE id=$1 AND owner_github_id=$2 FOR UPDATE`,[id,actor.githubId]);
        const row=current.rows[0];if(!row)throw new FeedbackError(404,"not_found","Feedback not found.");
        if(row.version!==(input as FeedbackInput&{expectedVersion:number}).expectedVersion)return conflict("version_conflict","Feedback changed. Reload its current status.");
        version=row.version+1;from=row.state;merged=row.state==="merged"||row.state==="live"||row.merged_sha!==null;
        await tx.query("UPDATE atlas_feedback.jobs SET state='cancelled',fencing_token=fencing_token+1,lease_until=NULL,updated_at=$2 WHERE feedback_id=$1 AND state IN ('pending','leased','working','validating','publishing')",[id,time]);
        await tx.query("UPDATE atlas_feedback.control SET fencing_token=fencing_token+1,lease_job_id=NULL,lease_until=NULL WHERE lease_job_id IN (SELECT id FROM atlas_feedback.jobs WHERE feedback_id=$1)",[id]);
      }
      const limits=["max_job_usd","max_day_usd","max_tokens","max_turns","max_wall_seconds","max_attempts"];
      const automated=control.enabled===true&&Number(control.allowed_owner_id)===actor.githubId&&control.policy_version===FEEDBACK_POLICY_VERSION&&limits.every(k=>Number.isFinite(Number(control[k]))&&Number(control[k])>0)&&Number(control.max_attempts)<=2;
      const state:FeedbackState=merged?"needs_human_review":automated?"queued":"received";
      const reason=merged?"merged_followup":automated?null:"automation_disabled";
      const approvalHash=publicApprovalHash(input);
      if(feedbackId)await tx.query(`UPDATE atlas_feedback.feedback SET version=$3,state=$4,input_private=$5,approved_public=$6,public_context=$7,approval_hash=$8,approval_version=$9,updated_at=$10,last_reason_code=$11,clarification=NULL,preview_url=NULL,preview_verified_sha=NULL WHERE id=$1 AND owner_github_id=$2`,[id,actor.githubId,version,state,{privateComment:input.privateComment},input.publicTask,input.context,approvalHash,FEEDBACK_POLICY_VERSION,time,reason]);
      else await tx.query(`INSERT INTO atlas_feedback.feedback(id,owner_github_id,version,state,input_private,approved_public,public_context,approval_hash,approval_version,created_at,updated_at,last_reason_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11)`,[id,actor.githubId,version,state,{privateComment:input.privateComment},input.publicTask,input.context,approvalHash,FEEDBACK_POLICY_VERSION,time,reason]);
      await tx.query(`INSERT INTO atlas_feedback.jobs(id,feedback_id,input_version,approval_hash,payload,state,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7)`,[randomUUID(),id,version,approvalHash,{feedbackId:id,inputVersion:version,approvalHash,publicTask:input.publicTask,publicContext:input.context},merged?"parked":"pending",time]);
      await tx.query("INSERT INTO atlas_feedback.events(feedback_id,version,from_state,to_state,actor_service,reason_code,time) VALUES($1,$2,$3,$4,'intake',$5,$6)",[id,version,from,state,reason,time]);
      const receipt={id,state,version};
      await tx.query("INSERT INTO atlas_feedback.idempotency(owner_github_id,operation,key,request_hash,feedback_id,response_metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",[actor.githubId,operation,key,requestHash,id,receipt,time]);
      return receipt;
    });
  }
  return {
    create:(actor:Actor,key:string|null,input:unknown)=>intake(actor,key,input),
    followup:(actor:Actor,id:string,key:string|null,input:unknown)=>intake(actor,key,input,id),
    async status(actor:Actor,id:string) {
      if(!uuid.safeParse(id).success)return invalid();
      const r=await db.query<StoredStatus>(`SELECT ${statusColumns} FROM atlas_feedback.feedback WHERE id=$1 AND owner_github_id=$2`,[id,actor.githubId]);
      if(!r.rows[0])throw new FeedbackError(404,"not_found","Feedback not found.");return statusDTO(r.rows[0]);
    },
    async list(actor:Actor,limit:number) {
      const r=await db.query<StoredStatus>(`SELECT ${statusColumns} FROM atlas_feedback.feedback WHERE owner_github_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2`,[actor.githubId,limit]);
      return {items:r.rows.map(statusDTO)};
    },
  };
}
