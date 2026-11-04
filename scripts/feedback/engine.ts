import {publicTaskSchema,publicContextSchema,approvedPrivateInstruction} from '../../src/lib/feedback/schema';
import { sign, verify, createPublicKey } from 'node:crypto';
import { loadSnapshot, applyValidatedPatch, verifyAppliedPatch } from './git-sandbox';
import { runTrustedChecks } from './checks';
import { sha256, validatePatch, POLICY_VERSION, exactKeys, CSS_PATHS } from './validator';
import type { PublicTask, PublicContext, WorkerOptions, Bundle, Receipt, Capability } from './ports';
export function canonical(value:unknown):string {
  if (value===null || typeof value!=='object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).filter(k=>(value as Record<string,unknown>)[k]!==undefined).sort((a,b)=>a.localeCompare(b,'en')).map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
}
export function approvalHash(publicTask:PublicTask,publicContext:PublicContext):string {return sha256(canonical({policyVersion:POLICY_VERSION,publicTask,publicContext}));}
export function approvedEnvelope(task:PublicTask,context:PublicContext):{publicTask:PublicTask;publicContext:PublicContext} {
  const t=publicTaskSchema.safeParse(task),c=publicContextSchema.safeParse(context);
  if(!t.success||!c.success)throw new Error('needs_human_review');
  return JSON.parse(JSON.stringify({publicTask:t.data,publicContext:c.data}));
}
/** A previous receipt proves source history only, never renewed execution authority.
 * Its signature/digests/policy are checked, but its expired lease is deliberately not reused. */
function draftSources(cap:Capability,sources:Record<string,string>,key:WorkerOptions['signingKey']):Record<string,string> {
  const prior=cap.priorDraft;if(!prior)return sources;
  try {
    const b=prior.bundle,r=b.receipt;
    if(!exactKeys(b,['receipt','signature','publicTask','publicContext','patch','checks']) || !exactKeys(r,['policyVersion','jobId','feedbackId','inputVersion','approvalHash','baseSha','fence','patchDigest','checksDigest','expiresAt']) || r.policyVersion!==POLICY_VERSION || r.baseSha!==cap.baseSha || r.feedbackId!==cap.feedbackId || r.inputVersion!==prior.version || prior.version>=cap.inputVersion || !/^[0-9a-f]{40}$/.test(prior.headSha) || !Number.isSafeInteger(r.fence) || r.fence<1 || !Number.isSafeInteger(r.expiresAt) || !verify(null,Buffer.from(canonical(r)),createPublicKey(key),Buffer.from(b.signature,'base64')))throw new Error();
    const envelope=approvedEnvelope(b.publicTask,b.publicContext);
    if(approvalHash(envelope.publicTask,envelope.publicContext)!==r.approvalHash || sha256(canonical(b))!==prior.bundleDigest || sha256(canonical(r))!==prior.receiptDigest || r.patchDigest!==prior.candidateDigest || sha256(canonical(b.patch))!==r.patchDigest || sha256(canonical(b.checks))!==r.checksDigest)throw new Error();
    for(const phase of ['baseline','candidate'] as const){const c=b.checks[phase];if(!exactKeys(c,['phase','passed','commands','digest']) || c.phase!==phase || c.passed!==true || canonical(c.commands)!==canonical(['test','typecheck','build']) || !/^[0-9a-f]{64}$/.test(c.digest))throw new Error();}
    // Historical public TSX approval cannot be renewed implicitly by a private CSS-only followup.
    // Verify the full cumulative scope before baseline, inference or any reservation.
    const patch=validatePatch(b.patch,sources,cap.baseSha,envelope.publicTask.origin==='private-feedback-v1'||cap.publicTask.origin==='private-feedback-v1'?'css-only':'legacy');
    return {...sources,...Object.fromEntries(patch.files.map(f=>[f.path,f.content]))};
  }catch{throw new Error('needs_human_review');}
}
export async function runOne(options:WorkerOptions):Promise<{state:string}> {
  if (options.enabled!==true) return {state:'disabled'};
  if (!Number.isSafeInteger(options.maxWallMs) || options.maxWallMs<1 || options.maxWallMs>600000) return {state:'disabled'};
  const {store}=options;const cap=await store.acquire();if(!cap)return {state:'idle'};
  const abort=new AbortController();let checking=false;
  const wall=setTimeout(()=>abort.abort(),options.maxWallMs);
  const heartbeat=setInterval(async()=>{if(checking)return;checking=true;try{await store.assertActive(cap)}catch{abort.abort()}finally{checking=false}},100);
  const active=async()=>{abort.signal.throwIfAborted();await store.assertActive(cap);if(Date.now()>=cap.leaseUntil)throw new Error('fenced')};
  try {
    await active();
    if (!Number.isSafeInteger(cap.fence)||cap.fence<1 || !Number.isSafeInteger(cap.attempt)||cap.attempt<1||cap.attempt>2) throw new Error('needs_human_review');
    const envelope=approvedEnvelope(cap.publicTask,cap.publicContext);
    const privateInstruction=approvedPrivateInstruction(envelope.publicTask,envelope.publicContext,cap.privateInstruction);
    const scope=privateInstruction?'css-only':'legacy';
    if (approvalHash(envelope.publicTask,envelope.publicContext)!==cap.approvalHash) throw new Error('needs_human_review');
    const sources=await loadSnapshot(options.cwd,cap.baseSha);
    const modelSources=draftSources(cap,sources,options.signingKey);
    await store.transition(cap,'working');
    const checks=options.checks??((cwd,phase,signal)=>runTrustedChecks(cwd,phase,{timeoutMs:Math.min(options.maxWallMs,300000),signal}));
    const baseline=await checks(options.cwd,'baseline',abort.signal);
    await active();
    // Baseline commands may generate files, but cannot change any tracked source or publishable input.
    const fresh=await loadSnapshot(options.cwd,cap.baseSha);
    if (canonical(fresh)!==canonical(sources)) throw new Error('needs_human_review');
    const result=await options.model.generate({...envelope,...(privateInstruction?{privateInstruction}:{}),sources:privateInstruction?Object.fromEntries(Object.entries(modelSources).filter(([path])=>(CSS_PATHS as readonly string[]).includes(path))):modelSources,baseSha:cap.baseSha},{assertActive:active,reserve:(cost,tokens)=>store.reserve(cap,cost,tokens),reconcile:(id,cost)=>store.reconcile(cap,id,cost),unknown:id=>store.unknown(cap,id)},abort.signal);
    await active();await store.transition(cap,'validating');
    const incremental=validatePatch(result.patch,modelSources,cap.baseSha,scope);
    const candidateSources={...modelSources,...Object.fromEntries(incremental.files.map(f=>[f.path,f.content]))};
    // A cumulative patch keeps original main hashes, not the incremental draft hashes.
    const patch=validatePatch({baseSha:cap.baseSha,files:Object.keys(candidateSources).filter(p=>candidateSources[p]!==sources[p]).sort().map(path=>({path,beforeSha256:sha256(sources[path]),content:candidateSources[path]}))},sources,cap.baseSha,scope);
    await applyValidatedPatch(options.cwd,patch,cap.baseSha);
    const candidate=await checks(options.cwd,'candidate',abort.signal);
    await active();validatePatch(patch,sources,cap.baseSha,scope);await verifyAppliedPatch(options.cwd,patch);
    if (baseline.passed!==true || candidate.passed!==true) throw new Error('checks_failed');
    const receipt:Receipt={policyVersion:POLICY_VERSION,jobId:cap.jobId,feedbackId:cap.feedbackId,inputVersion:cap.inputVersion,approvalHash:cap.approvalHash,baseSha:cap.baseSha,fence:cap.fence,patchDigest:sha256(canonical(patch)),checksDigest:sha256(canonical({baseline,candidate})),expiresAt:Math.min(cap.leaseUntil,Date.now()+600000)};
    const bundle:Bundle={receipt,signature:sign(null,Buffer.from(canonical(receipt)),options.signingKey).toString('base64'),...envelope,patch,checks:{baseline,candidate}};
    await active();await store.transition(cap,'publishing');await store.complete(cap,bundle);
    return {state:'publishing'};
  } catch(error) {
    const reason=abort.signal.aborted?'cancelled':error instanceof Error && ['needs_human_review','provider_unknown_outcome','provider_invalid_output','input_limit','budget','disabled'].includes(error.message)?'needs_human_review':'failed';
    // A fenced writer cannot overwrite a newer version; durable store must reject stale park.
    try{await store.park(cap,reason)}catch{}
    return {state:reason};
  } finally {clearTimeout(wall);clearInterval(heartbeat);}
}
