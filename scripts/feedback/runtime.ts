import { createPrivateKey,createPublicKey,randomUUID } from 'node:crypto';
import { mkdtemp,rm,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git,loadSnapshot } from './git-sandbox';
import { AnthropicModel,type ModelConfig } from './model';
import { PgWorkStore,type QueryDatabase } from './pg-store';
import { runOne } from './engine';
import { publishBundle,verifyBundle } from './publisher';
import { boundedJson } from './http';
type DrainOptions={enabled?:boolean;maxJobs:number;next:()=>Promise<{state:string}>};
export async function drainWorker(o:DrainOptions):Promise<{state:string}[]> {
  if(o.enabled!==true)return [];
  if(!Number.isSafeInteger(o.maxJobs)||o.maxJobs<1||o.maxJobs>10)throw new Error('runtime_disabled');
  const results:{state:string}[]=[];
  for(let i=0;i<o.maxJobs;i++){const result=await o.next();results.push(result);if(['idle','disabled'].includes(result.state))break;}
  return results;
}
export const drainPublisher=drainWorker;
async function trustedMain():Promise<string> {
  const response=await fetch('https://api.github.com/repos/protocol/neuro-atlas/git/ref/heads/main',{redirect:'error',headers:{accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
  const value=await boundedJson(response,8192) as {ref?:string;object?:{sha?:string}};
  if(value.ref!=='refs/heads/main'||!/^[0-9a-f]{40}$/.test(value.object?.sha??''))throw new Error('runtime_disabled');return value.object!.sha!;
}
async function withCheckout<T>(repo:string,base:string,dependencies:boolean,fn:(cwd:string)=>Promise<T>):Promise<T> {
  const directory=await mkdtemp(path.join(tmpdir(),'atlas-feedback-runtime-')),cwd=path.join(directory,'checkout');let added=false;
  try {await git(repo,['worktree','add','--detach',cwd,base]);added=true;if(dependencies)await symlink(path.join(repo,'node_modules'),path.join(cwd,'node_modules'),'dir');return await fn(cwd);}
  finally {if(added)await git(repo,['worktree','remove','--force',cwd]).catch(()=>{});await rm(directory,{force:true,recursive:true});}
}
function required(name:string):string {const value=process.env[name];if(!value)throw new Error('runtime_disabled');return value;}
function positive(name:string):number {const n=Number(required(name));if(!Number.isFinite(n)||n<=0)throw new Error('runtime_disabled');return n;}
/** Actual process entrypoint. Not a server route, cron, Actions workflow, or automatically started service. */
export async function runtimeMain(role:string):Promise<{state:string;processed?:number}> {
  const enabled=process.env.FEEDBACK_ENABLED==='true' && process.env[role==='worker'?'FEEDBACK_WORKER_ENABLED':'FEEDBACK_PUBLISHER_ENABLED']==='true';
  if(!enabled)return {state:'disabled'};
  if(!['worker','publisher'].includes(role))throw new Error('runtime_disabled');
  const repo=path.resolve(required('FEEDBACK_TRUSTED_REPOSITORY'));
  const maxJobs=positive('FEEDBACK_DRAIN_MAX_JOBS');
  if(!Number.isInteger(maxJobs)||maxJobs>10)throw new Error('runtime_disabled');
  if(role==='worker' && ['FEEDBACK_GITHUB_INSTALLATION_TOKEN','GITHUB_TOKEN','GH_TOKEN'].some(k=>process.env[k]))throw new Error('runtime_disabled');
  if(role==='publisher' && ['FEEDBACK_ANTHROPIC_API_KEY','ANTHROPIC_API_KEY','FEEDBACK_RECEIPT_PRIVATE_KEY'].some(k=>process.env[k]))throw new Error('runtime_disabled');
  // Fixed reviewed factory; never load a user/model-supplied module or broad fallback database.
  const databaseUrl=new URL('../../src/lib/feedback/database.ts',import.meta.url).href;
  const factory=await import(databaseUrl) as {createFeedbackDatabase:(s:string)=>QueryDatabase&{close():Promise<void>}};
  const db=factory.createFeedbackDatabase(required('FEEDBACK_DATABASE_URL'));
  try {
    if(role==='worker') {
      const signingKey=createPrivateKey(required('FEEDBACK_RECEIPT_PRIVATE_KEY'));
      if(signingKey.asymmetricKeyType!=='ed25519')throw new Error('runtime_disabled');
      const config:ModelConfig={enabled:true,origin:'https://api.anthropic.com',model:required('FEEDBACK_MODEL'),inputUsdPerMillion:positive('FEEDBACK_MODEL_INPUT_USD_PER_MILLION'),outputUsdPerMillion:positive('FEEDBACK_MODEL_OUTPUT_USD_PER_MILLION'),maxInputTokens:positive('FEEDBACK_MODEL_MAX_INPUT_TOKENS'),maxOutputTokens:positive('FEEDBACK_MODEL_MAX_OUTPUT_TOKENS'),maxBodyBytes:positive('FEEDBACK_MODEL_MAX_BODY_BYTES'),maxResponseBytes:positive('FEEDBACK_MODEL_MAX_RESPONSE_BYTES'),timeoutMs:positive('FEEDBACK_MODEL_TIMEOUT_MS')};
      const maxWallMs=positive('FEEDBACK_WORKER_MAX_WALL_MS');
      const model=new AnthropicModel(config,()=>required('FEEDBACK_ANTHROPIC_API_KEY'));
      const rows=await drainWorker({enabled:true,maxJobs,next:async()=>{const base=await trustedMain();return withCheckout(repo,base,true,async cwd=>runOne({enabled:true,store:new PgWorkStore(db,{trustedBaseSha:base}),cwd,model,signingKey,maxWallMs}));}});
      return {state:rows.at(-1)?.state??'idle',processed:rows.filter(r=>r.state==='publishing').length};
    }
    const publicKey=createPublicKey(required('FEEDBACK_RECEIPT_PUBLIC_KEY'));
    if(publicKey.asymmetricKeyType!=='ed25519')throw new Error('runtime_disabled');
    const instance=randomUUID();
    const rows=await drainPublisher({enabled:true,maxJobs,next:async()=>{
      const job=(await db.query<{id:string; base_sha:string}>("SELECT id,base_sha FROM atlas_feedback.jobs WHERE state='publishing' AND candidate_ref IS NOT NULL ORDER BY created_at,id LIMIT 1")).rows[0];if(!job)return {state:'idle'};
      const store=new PgWorkStore(db,{trustedBaseSha:job.base_sha,publisherInstanceId:instance});const bundle=await store.loadBundle(job.id);
      // Read signed receipt and exact trusted files before lazy publisher-only token access.
      return withCheckout(repo,bundle.receipt.baseSha,false,async cwd=>{const sources=await loadSnapshot(cwd,bundle.receipt.baseSha);verifyBundle(bundle,publicKey,sources);await publishBundle({enabled:true,bundle,publicKey,sources,store,github:{origin:'https://api.github.com',token:()=>required('FEEDBACK_GITHUB_INSTALLATION_TOKEN')}});return {state:'pr_ready'};});
    }});return {state:rows.at(-1)?.state??'idle',processed:rows.filter(r=>r.state==='pr_ready').length};
  } finally {await db.close();}
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  runtimeMain(process.argv[2]??'').then(result=>{process.stdout.write(JSON.stringify(result)+'\n')}).catch(()=>{process.stderr.write('{"state":"blocked"}\n');process.exitCode=1;});
}
