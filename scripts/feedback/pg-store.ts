import { randomUUID } from 'node:crypto';
import { canonical,approvalHash,approvedEnvelope } from './engine';
import { sha256,POLICY_VERSION } from './validator';
import type { Capability,WorkStore,Bundle,PriorDraft } from './ports';
import type { Publication,PublicationStore } from './publisher';
/** Structurally identical to backend QueryDatabase; inject createFeedbackDatabase() after integration. */
export interface QueryDatabase {query<Row=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<{rows:Row[];rowCount:number|null}>;transaction<T>(fn:(tx:QueryDatabase)=>Promise<T>):Promise<T>}
// Named SQL projections; every authority/budget fence below still validates live values.
type Row = {
  [column:string]:unknown;
  id:string; feedback_id:string; input_version:number; current_version:number; version:number; attempt:number;
  approval_hash:string; current_approval:string; base_sha:string; owner_github_id:string|number;
  state:string; feedback_state:string; created_at:string|Date; lease_until:string|Date; lease_job_id:string|null;
  enabled:boolean; allowed_owner_id:string|number; policy_version:string; fencing_token:string|number;
  daily_reserved:string|number; daily_charged:string|number; reserved_cost:string|number; charged_cost:string|number;
  max_attempts:string|number; max_turns:string|number; max_tokens:string|number; max_wall_seconds:string|number;
  max_job_usd:string|number; max_day_usd:string|number;
  payload:{feedbackId:string;inputVersion:number;approvalHash:string;publicTask:Capability['publicTask'];publicContext:Capability['publicContext']};
  bundle:Bundle; digest:string; candidate_ref:string; candidate_digest:string; receipt_digest:string;
  pr_head_sha:string|null; pr_number:number|null; branch:string; phase:string; commit_sha:string; expected_head_sha:string|null;
  upper_tokens:number; upper_usd:string|number; actual_usd:string|number|null; instance_id:string;
};
const date=(d:unknown)=>new Date(d as string).getTime();
const validLimits=(c:Row)=>c.policy_version===POLICY_VERSION && Number.isSafeInteger(Number(c.allowed_owner_id)) && Number(c.allowed_owner_id)>0 && ['max_job_usd','max_day_usd','max_tokens','max_turns','max_wall_seconds','max_attempts'].every(k=>Number.isFinite(Number(c[k]))&&Number(c[k])>0) && Number(c.max_attempts)<=2 && Number(c.max_wall_seconds)<=600;
const fenced=():never=>{throw new Error('fenced')};
export class PgWorkStore implements WorkStore,PublicationStore {
  constructor(private db:QueryDatabase,private options:{trustedBaseSha:string;publisherInstanceId?:string}) {}
  private async control(tx:QueryDatabase):Promise<Row> {const c=(await tx.query<Row>('SELECT * FROM atlas_feedback.control WHERE singleton=true FOR UPDATE')).rows[0];if(!c)fenced();return c;}
  private async current(tx:QueryDatabase,cap:Capability,enabled=true):Promise<{c:Row;j:Row}> {
    const c=await this.control(tx);
    const j=(await tx.query<Row>(`SELECT j.*,f.version AS current_version,f.approval_hash AS current_approval,f.owner_github_id,f.state AS feedback_state FROM atlas_feedback.jobs j JOIN atlas_feedback.feedback f ON f.id=j.feedback_id WHERE j.id=$1 FOR UPDATE OF j,f`,[cap.jobId])).rows[0];
    if(!j || (enabled&&(!c.enabled||!validLimits(c))) || Number(j.owner_github_id)!==Number(c.allowed_owner_id) || j.feedback_id!==cap.feedbackId || j.input_version!==cap.inputVersion || j.current_version!==cap.inputVersion || j.approval_hash!==cap.approvalHash || j.current_approval!==cap.approvalHash || Number(j.fencing_token)!==cap.fence || j.base_sha!==cap.baseSha)fenced();
    const completed=j.state==='completed'&&j.feedback_state==='pr_ready';
    if(!completed && (c.lease_job_id!==cap.jobId || Number(c.fencing_token)!==cap.fence || date(c.lease_until)<=Date.now() || date(j.lease_until)<=Date.now() || !['leased','working','validating','publishing'].includes(j.state)))fenced();
    if(Number(j.attempt)>Math.min(2,Number(c.max_attempts)) || Number(c.daily_reserved)+Number(c.daily_charged)>Number(c.max_day_usd)+1e-10 || Number(j.reserved_cost)+Number(j.charged_cost)>Number(c.max_job_usd)+1e-10)fenced();
    if(cap.priorDraft) {
      const p=(await tx.query<Row>('SELECT * FROM atlas_feedback.publications WHERE feedback_id=$1 FOR UPDATE',[cap.feedbackId])).rows[0],prior=cap.priorDraft;
      if(!p || p.phase!=='pr_ready' || p.version!==prior.version || p.commit_sha!==prior.headSha || p.candidate_digest!==prior.candidateDigest || p.receipt_digest!==prior.receiptDigest)fenced();
    }
    return {c,j};
  }
  async acquire():Promise<Capability|null> {
    if(!/^[0-9a-f]{40}$/.test(this.options.trustedBaseSha))return null;
    return this.db.transaction(async tx=>{
      let c=await this.control(tx);if(c.enabled!==true||!validLimits(c))return null;
      if(c.lease_job_id && date(c.lease_until)>Date.now())return null;
      if(c.lease_job_id) {
        await tx.query("UPDATE atlas_feedback.jobs SET state='parked',last_reason_code='lease_expired',updated_at=now() WHERE id=$1 AND state IN ('leased','working','validating','publishing')",[c.lease_job_id]);
        await tx.query("UPDATE atlas_feedback.feedback f SET state='needs_human_review',last_reason_code='lease_expired',updated_at=now() FROM atlas_feedback.jobs j WHERE j.id=$1 AND f.id=j.feedback_id AND f.version=j.input_version AND f.state IN ('working','validating','publishing','queued')",[c.lease_job_id]);
      }
      // Retain outstanding/ambiguous reservations across midnight. Never reset money still at risk.
      await tx.query('UPDATE atlas_feedback.control SET daily_charged=0,accounting_day=CURRENT_DATE WHERE accounting_day<>CURRENT_DATE AND daily_reserved=0');
      c=await this.control(tx);
      if(Number(c.daily_reserved)+Number(c.daily_charged)>=Number(c.max_day_usd))return null;
      const j=(await tx.query<Row>(`SELECT j.*,f.owner_github_id,f.pr_head_sha,f.pr_number FROM atlas_feedback.jobs j JOIN atlas_feedback.feedback f ON f.id=j.feedback_id WHERE j.state='pending' AND j.attempt<$1 AND f.version=j.input_version AND f.approval_hash=j.approval_hash AND f.owner_github_id=$2 AND f.state IN ('queued','received') ORDER BY j.created_at,j.id LIMIT 1 FOR UPDATE OF j,f`,[Math.min(2,Number(c.max_attempts)),c.allowed_owner_id])).rows[0];
      if(!j)return null;
      const publication=(await tx.query<Row>('SELECT * FROM atlas_feedback.publications WHERE feedback_id=$1 FOR UPDATE',[j.feedback_id])).rows[0];
      if(publication && (publication.phase!=='pr_ready' || publication.version>=j.input_version)) {
        await tx.query("UPDATE atlas_feedback.jobs SET state='parked',last_reason_code='partial_publication_followup',updated_at=now() WHERE id=$1",[j.id]);
        await tx.query("UPDATE atlas_feedback.feedback SET state='needs_human_review',last_reason_code='partial_publication_followup',updated_at=now() WHERE id=$1",[j.feedback_id]);
        return null;
      }
      if(!publication && (j.pr_head_sha!==null || j.pr_number!==null)) {
        await tx.query("UPDATE atlas_feedback.jobs SET state='parked',last_reason_code='followup_history_unverified',updated_at=now() WHERE id=$1",[j.id]);
        await tx.query("UPDATE atlas_feedback.feedback SET state='needs_human_review',last_reason_code='followup_history_unverified',updated_at=now() WHERE id=$1",[j.feedback_id]);
        return null;
      }
      let priorDraft:PriorDraft|undefined;
      if(publication) {
        const old=(await tx.query<Row>("SELECT j.*,b.bundle,b.digest FROM atlas_feedback.jobs j JOIN atlas_feedback.worker_bundles b ON b.job_id=j.id WHERE j.feedback_id=$1 AND j.input_version=$2 AND j.state='completed'",[j.feedback_id,publication.version])).rows[0];
        const b=old?.bundle as Bundle|undefined;
        if(!b || old!.digest!==old!.candidate_ref || old!.digest!==sha256(canonical(b)) || b.receipt.jobId!==old!.id || b.receipt.feedbackId!==j.feedback_id || b.receipt.inputVersion!==publication.version || b.receipt.baseSha!==this.options.trustedBaseSha || b.receipt.patchDigest!==publication.candidate_digest || sha256(canonical(b.receipt))!==publication.receipt_digest || publication.commit_sha!==j.pr_head_sha || publication.pr_number!==j.pr_number || !publication.pr_number || !/^[0-9a-f]{40}$/.test(publication.commit_sha??'')) {
          await tx.query("UPDATE atlas_feedback.jobs SET state='parked',last_reason_code='followup_history_unverified',updated_at=now() WHERE id=$1",[j.id]);
          await tx.query("UPDATE atlas_feedback.feedback SET state='needs_human_review',last_reason_code='followup_history_unverified',updated_at=now() WHERE id=$1",[j.feedback_id]);
          return null;
        }
        priorDraft={version:publication.version,headSha:publication.commit_sha,candidateDigest:publication.candidate_digest,receiptDigest:publication.receipt_digest,bundleDigest:old!.digest,bundle:b};
      }
      const p=j.payload;const env=approvedEnvelope(p.publicTask,p.publicContext);
      if(p.feedbackId!==j.feedback_id || p.inputVersion!==j.input_version || p.approvalHash!==j.approval_hash || approvalHash(env.publicTask,env.publicContext)!==j.approval_hash)fenced();
      const fence=Number(c.fencing_token)+1;if(!Number.isSafeInteger(fence))fenced();
      const leaseUntil=Date.now()+Number(c.max_wall_seconds)*1000;
      await tx.query("UPDATE atlas_feedback.jobs SET state='leased',attempt=attempt+1,fencing_token=$2,lease_until=$3,base_sha=$4,updated_at=now() WHERE id=$1",[j.id,fence,new Date(leaseUntil).toISOString(),this.options.trustedBaseSha]);
      await tx.query('UPDATE atlas_feedback.control SET lease_job_id=$1,lease_until=$2,fencing_token=$3 WHERE singleton=true',[j.id,new Date(leaseUntil).toISOString(),fence]);
      return {jobId:j.id,feedbackId:j.feedback_id,inputVersion:j.input_version,approvalHash:j.approval_hash,...env,baseSha:this.options.trustedBaseSha,fence,attempt:j.attempt+1,leaseUntil,...(priorDraft?{priorDraft}:{})};
    });
  }
  async assertActive(capOrBundle:Capability|Bundle):Promise<void> {
    const cap='receipt' in capOrBundle?this.cap(capOrBundle):capOrBundle;
    await this.db.transaction(async tx=>{await this.current(tx,cap);if('receipt' in capOrBundle){if(capOrBundle.receipt.expiresAt<=Date.now())fenced();await this.publisherClaim(tx,capOrBundle);}});
  }
  private cap(b:Bundle):Capability {return {jobId:b.receipt.jobId,feedbackId:b.receipt.feedbackId,inputVersion:b.receipt.inputVersion,approvalHash:b.receipt.approvalHash,publicTask:b.publicTask,publicContext:b.publicContext,baseSha:b.receipt.baseSha,fence:b.receipt.fence,attempt:1,leaseUntil:b.receipt.expiresAt};}
  private async reservations(tx:QueryDatabase,cap:Capability):Promise<Row[]> {return (await tx.query<Row>('SELECT * FROM atlas_feedback.worker_reservations WHERE job_id=$1 ORDER BY ordinal FOR UPDATE',[cap.jobId])).rows;}
  async reserve(cap:Capability,upperUsd:number,upperTokens:number):Promise<string> {
    if(!Number.isFinite(upperUsd)||upperUsd<=0||!Number.isSafeInteger(upperTokens)||upperTokens<=0)throw new Error('budget');
    return this.db.transaction(async tx=>{
      const {c,j}=await this.current(tx,cap);if(j.state==='completed')fenced();
      const reserves=await this.reservations(tx,cap);
      if(reserves.length>=Math.min(2,Number(c.max_attempts),Number(c.max_turns)) || reserves.reduce((n,e)=>n+e.upper_tokens,0)+upperTokens>Number(c.max_tokens))throw new Error('budget');
      const a=await tx.query('UPDATE atlas_feedback.jobs SET reserved_cost=reserved_cost+$2 WHERE id=$1 AND reserved_cost+charged_cost+$2<=$3 RETURNING id',[cap.jobId,upperUsd.toString(),c.max_job_usd]);
      const b=await tx.query('UPDATE atlas_feedback.control SET daily_reserved=daily_reserved+$1 WHERE singleton=true AND daily_reserved+daily_charged+$1<=$2 RETURNING singleton',[upperUsd.toString(),c.max_day_usd]);
      if(!a.rows.length||!b.rows.length)throw new Error('budget');
      const id=randomUUID();await tx.query("INSERT INTO atlas_feedback.worker_reservations(id,job_id,fencing_token,ordinal,upper_usd,upper_tokens,state) VALUES($1,$2,$3,$4,$5,$6,'reserved')",[id,cap.jobId,cap.fence,reserves.length+1,upperUsd.toString(),upperTokens]);return id;
    });
  }
  async reconcile(cap:Capability,id:string,actualUsd:number):Promise<void> {
    await this.db.transaction(async tx=>{
      await this.control(tx); // Accounting remains writable after a kill; output authority does not.
      const r=(await this.reservations(tx,cap)).find(e=>e.id===id && Number(e.fencing_token)===cap.fence);
      if(!r||!Number.isFinite(actualUsd)||actualUsd<0||actualUsd>Number(r.upper_usd))throw new Error('budget');
      if(r.state==='settled'){if(Number(r.actual_usd)!==actualUsd)throw new Error('budget');return;}
      await tx.query('UPDATE atlas_feedback.jobs SET reserved_cost=reserved_cost-$2,charged_cost=charged_cost+$3 WHERE id=$1',[cap.jobId,r.upper_usd,actualUsd.toString()]);
      await tx.query('UPDATE atlas_feedback.control SET daily_reserved=daily_reserved-$1,daily_charged=daily_charged+$2 WHERE singleton=true',[r.upper_usd,actualUsd.toString()]);
      await tx.query("UPDATE atlas_feedback.worker_reservations SET state='settled',actual_usd=$2,updated_at=now() WHERE id=$1",[id,actualUsd.toString()]);
    });
  }
  async unknown(cap:Capability,id:string):Promise<void> {await this.db.transaction(async tx=>{await this.control(tx);const r=(await this.reservations(tx,cap)).find(e=>e.id===id && Number(e.fencing_token)===cap.fence);if(!r)throw new Error('budget');if(r.state==='reserved')await tx.query("UPDATE atlas_feedback.worker_reservations SET state='unknown',updated_at=now() WHERE id=$1",[id]);});}
  async transition(cap:Capability,state:'working'|'validating'|'publishing'):Promise<void> {await this.db.transaction(async tx=>{const {j}=await this.current(tx,cap);const allowed:Record<string,string>={working:'leased',validating:'working',publishing:'validating'};if(j.state!==allowed[state])fenced();await tx.query('UPDATE atlas_feedback.jobs SET state=$2,updated_at=now() WHERE id=$1',[cap.jobId,state]);await tx.query('UPDATE atlas_feedback.feedback SET state=$2,updated_at=now() WHERE id=$1',[cap.feedbackId,state]);});}
  async complete(cap:Capability,bundle:Bundle):Promise<void> {await this.db.transaction(async tx=>{const {j}=await this.current(tx,cap);if(j.state!=='publishing'||bundle.receipt.jobId!==cap.jobId||bundle.receipt.fence!==cap.fence||bundle.receipt.patchDigest!==sha256(canonical(bundle.patch)))fenced();const digest=sha256(canonical(bundle));await tx.query('INSERT INTO atlas_feedback.worker_bundles(job_id,digest,bundle) VALUES($1,$2,$3) ON CONFLICT(job_id) DO NOTHING',[cap.jobId,digest,bundle]);const stored=(await tx.query<Row>('SELECT digest FROM atlas_feedback.worker_bundles WHERE job_id=$1',[cap.jobId])).rows[0];if(stored?.digest!==digest)fenced();await tx.query('UPDATE atlas_feedback.jobs SET candidate_ref=$2,patch_digest=$3,updated_at=now() WHERE id=$1',[cap.jobId,digest,bundle.receipt.patchDigest]);});}
  async loadBundle(jobId:string):Promise<Bundle> {const j=(await this.db.query<Row>("SELECT b.bundle,b.digest,j.candidate_ref FROM atlas_feedback.worker_bundles b JOIN atlas_feedback.jobs j ON j.id=b.job_id WHERE j.id=$1 AND j.state IN ('publishing','completed')",[jobId])).rows[0];if(!j||j.digest!==j.candidate_ref||sha256(canonical(j.bundle))!==j.digest)fenced();return j.bundle;}
  private async publisherClaim(tx:QueryDatabase,b:Bundle):Promise<void> {
    const instance=this.options.publisherInstanceId;if(!instance||!/^[0-9a-f-]{36}$/.test(instance))throw new Error('publisher_claimed');
    const now=Date.now(),until=Math.min(b.receipt.expiresAt,now+30000);
    if(until<=now)fenced();
    await tx.query('INSERT INTO atlas_feedback.publisher_claims(job_id,instance_id,lease_until) VALUES($1,$2,$3) ON CONFLICT(job_id) DO NOTHING',[b.receipt.jobId,instance,new Date(until).toISOString()]);
    const claim=(await tx.query<Row>('SELECT * FROM atlas_feedback.publisher_claims WHERE job_id=$1 FOR UPDATE',[b.receipt.jobId])).rows[0];
    if(claim.instance_id!==instance && date(claim.lease_until)+15000>=now)throw new Error('publisher_claimed');
    // Wait a full max HTTP timeout after prior claim expiry before takeover: old writes cannot remain in flight.
    await tx.query('UPDATE atlas_feedback.publisher_claims SET instance_id=$2,lease_until=$3,fencing_token=fencing_token+CASE WHEN instance_id=$2 THEN 0 ELSE 1 END,updated_at=now() WHERE job_id=$1',[b.receipt.jobId,instance,new Date(until).toISOString()]);
    const stored=(await tx.query<Row>('SELECT digest,bundle FROM atlas_feedback.worker_bundles WHERE job_id=$1',[b.receipt.jobId])).rows[0];if(!stored||stored.digest!==sha256(canonical(b))||sha256(canonical(stored.bundle))!==stored.digest)fenced();
  }
  async park(cap:Capability,reason:'needs_human_review'|'failed'|'cancelled'):Promise<void> {await this.db.transaction(async tx=>{await this.current(tx,cap,false);await tx.query('UPDATE atlas_feedback.jobs SET state=$2,last_reason_code=$3,updated_at=now() WHERE id=$1',[cap.jobId,reason==='needs_human_review'?'parked':reason,reason]);await tx.query('UPDATE atlas_feedback.feedback SET state=$2,last_reason_code=$2,updated_at=now() WHERE id=$1',[cap.feedbackId,reason]);await tx.query('UPDATE atlas_feedback.control SET lease_job_id=NULL,lease_until=NULL WHERE singleton=true AND lease_job_id=$1',[cap.jobId]);});}
  async open(bundle:Bundle):Promise<Publication> {const cap=this.cap(bundle);return this.db.transaction(async tx=>{await this.current(tx,cap);await this.publisherClaim(tx,bundle);const existing=(await tx.query<Row>('SELECT * FROM atlas_feedback.publications WHERE feedback_id=$1 FOR UPDATE',[cap.feedbackId])).rows[0];if(existing){
      if(existing.version===cap.inputVersion){if(existing.candidate_digest!==bundle.receipt.patchDigest||existing.receipt_digest!==sha256(canonical(bundle.receipt)))fenced();return this.publication(existing);}
      if(existing.version>=cap.inputVersion || existing.phase!=='pr_ready' || !existing.pr_number || !/^[0-9a-f]{40}$/.test(existing.commit_sha??''))fenced();
      await tx.query("UPDATE atlas_feedback.publications SET version=$2,candidate_digest=$3,receipt_digest=$4,phase='reserved',expected_head_sha=commit_sha,commit_sha=NULL,updated_at=now() WHERE feedback_id=$1",[cap.feedbackId,cap.inputVersion,bundle.receipt.patchDigest,sha256(canonical(bundle.receipt))]);
      return {branch:existing.branch,version:cap.inputVersion,candidateDigest:bundle.receipt.patchDigest,expectedHeadSha:existing.commit_sha,commitSha:null,prNumber:existing.pr_number,phase:'reserved'};
    }
    await tx.query("INSERT INTO atlas_feedback.publications(feedback_id,branch,candidate_digest,phase,version,receipt_digest) VALUES($1,$2,$3,'reserved',$4,$5)",[cap.feedbackId,'atlas-feedback/'+cap.feedbackId,bundle.receipt.patchDigest,cap.inputVersion,sha256(canonical(bundle.receipt))]);return {branch:'atlas-feedback/'+cap.feedbackId,version:cap.inputVersion,candidateDigest:bundle.receipt.patchDigest,expectedHeadSha:null,commitSha:null,prNumber:null,phase:'reserved'};});}
  private publication(r:Row):Publication{return {branch:r.branch,version:r.version,candidateDigest:r.candidate_digest,expectedHeadSha:r.expected_head_sha,commitSha:r.commit_sha,prNumber:r.pr_number,phase:r.phase};}
  async save(bundle:Bundle,next:Publication):Promise<void> {const cap=this.cap(bundle);await this.db.transaction(async tx=>{await this.current(tx,cap);await this.publisherClaim(tx,bundle);const r=(await tx.query<Row>('SELECT * FROM atlas_feedback.publications WHERE feedback_id=$1 FOR UPDATE',[cap.feedbackId])).rows[0];if(!r||r.version!==cap.inputVersion||r.candidate_digest!==bundle.receipt.patchDigest||next.branch!==r.branch||next.version!==r.version||next.candidateDigest!==r.candidate_digest)fenced();await tx.query('UPDATE atlas_feedback.publications SET phase=$2,commit_sha=$3,pr_number=$4,updated_at=now() WHERE feedback_id=$1',[cap.feedbackId,next.phase,next.commitSha,next.prNumber]);if(next.phase==='pr_ready') {if(!next.prNumber||!next.commitSha)fenced();await tx.query("UPDATE atlas_feedback.feedback SET state='pr_ready',pr_number=$2,pr_head_sha=$3,updated_at=now() WHERE id=$1",[cap.feedbackId,next.prNumber,next.commitSha]);await tx.query("UPDATE atlas_feedback.jobs SET state='completed',updated_at=now() WHERE id=$1",[cap.jobId]);await tx.query('UPDATE atlas_feedback.control SET lease_job_id=NULL,lease_until=NULL WHERE singleton=true AND lease_job_id=$1',[cap.jobId]);}});}
}
