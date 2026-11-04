import { sign } from 'node:crypto';
import { loadSnapshot, applyValidatedPatch, verifyAppliedPatch } from './git-sandbox';
import { runTrustedChecks } from './checks';
import { sha256, validatePatch, POLICY_VERSION, exactKeys } from './validator';
import type { PublicTask, PublicContext, WorkerOptions, Bundle, Receipt } from './ports';
export function canonical(value:unknown):string {
  if (value===null || typeof value!=='object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).filter(k=>(value as Record<string,unknown>)[k]!==undefined).sort((a,b)=>a.localeCompare(b,'en')).map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
}
export function approvalHash(publicTask:PublicTask,publicContext:PublicContext):string {return sha256(canonical({policyVersion:POLICY_VERSION,publicTask,publicContext}));}
export function approvedEnvelope(task:PublicTask,context:PublicContext):{publicTask:PublicTask;publicContext:PublicContext} {
  if (!exactKeys(task,['title','summary','acceptance']) || typeof task.title!=='string' || !task.title.length || task.title.length>100 || typeof task.summary!=='string' || !task.summary.length || task.summary.length>1500 || !Array.isArray(task.acceptance) || task.acceptance.length<1 || task.acceptance.length>5 || task.acceptance.some(s=>typeof s!=='string'||!s.length||s.length>200)) throw new Error('needs_human_review');
  const allowed=['route','targetId','chartId','scenario','viewport','theme','deployedRevision'];
  if (!context || Object.keys(context).some(k=>!allowed.includes(k)) || !['/','/field-velocity','/funding','/milestones','/ecosystem','/methodology'].includes(context.route) || !['light','dark','system'].includes(context.theme) || !exactKeys(context.viewport,['width','height']) || ![context.viewport.width,context.viewport.height].every(n=>Number.isInteger(n)&&n>0&&n<=10000)) throw new Error('needs_human_review');
  for (const key of ['targetId','chartId','scenario'] as const) if (context[key]!==undefined && !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(context[key]!)) throw new Error('needs_human_review');
  if (context.deployedRevision!==undefined && !/^[0-9a-f]{40}$/.test(context.deployedRevision)) throw new Error('needs_human_review');
  return JSON.parse(JSON.stringify({publicTask:task,publicContext:context}));
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
    if (approvalHash(envelope.publicTask,envelope.publicContext)!==cap.approvalHash) throw new Error('needs_human_review');
    const sources=await loadSnapshot(options.cwd,cap.baseSha);
    await store.transition(cap,'working');
    const checks=options.checks??((cwd,phase,signal)=>runTrustedChecks(cwd,phase,{timeoutMs:Math.min(options.maxWallMs,300000),signal}));
    const baseline=await checks(options.cwd,'baseline',abort.signal);
    await active();
    // Baseline commands may generate files, but cannot change any tracked source or publishable input.
    const fresh=await loadSnapshot(options.cwd,cap.baseSha);
    if (canonical(fresh)!==canonical(sources)) throw new Error('needs_human_review');
    const result=await options.model.generate({...envelope,sources,baseSha:cap.baseSha},{assertActive:active,reserve:(cost,tokens)=>store.reserve(cap,cost,tokens),reconcile:(id,cost)=>store.reconcile(cap,id,cost),unknown:id=>store.unknown(cap,id)},abort.signal);
    await active();await store.transition(cap,'validating');
    const patch=validatePatch(result.patch,sources,cap.baseSha);
    await applyValidatedPatch(options.cwd,patch,cap.baseSha);
    const candidate=await checks(options.cwd,'candidate',abort.signal);
    await active();validatePatch(patch,sources,cap.baseSha);await verifyAppliedPatch(options.cwd,patch);
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
