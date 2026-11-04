import { createHash,verify,type KeyLike } from 'node:crypto';
import { canonical,approvalHash,approvedEnvelope } from './engine';
import { validatePatch,sha256,POLICY_VERSION,exactKeys } from './validator';
import { GitHubRest,REPOSITORY,type GitHubConfig } from './github';
import type { Bundle } from './ports';
type GitIdentity={name:string;email:string;date:string};
type GitCommit={sha:string;tree:{sha:string};parents:{sha:string}[];message:string;author:GitIdentity;committer:GitIdentity};
type GitTree={sha:string;truncated:boolean;tree:{path:string;mode:string;type:string;sha:string}[]};
type GitPr={number:number;html_url:string;state:string;draft:boolean;title:string;body:string;base:{ref:string;repo:{full_name:string}};head:{ref:string;sha:string;repo:{full_name:string}}};
export type Publication={branch:string;version:number;candidateDigest:string;expectedHeadSha:string|null;commitSha:string|null;prNumber:number|null;phase:string};
export interface PublicationStore {
  /** Check singleton enabled, all caps, owner, version, approval, BOTH fencing tokens, lease and receipt expiry. */
  assertActive(bundle:Bundle):Promise<void>;
  /** Durable outbox insert/lock, unique feedback branch; returns prior expected head. New version must be explicitly admitted. */
  open(bundle:Bundle):Promise<Publication>;
  /** Durable CAS by version/digest. Must reject stale publication writer. */
  save(bundle:Bundle,next:Publication):Promise<void>;
}
export type PublishOptions={enabled?:boolean;bundle:Bundle;publicKey:KeyLike;sources:Readonly<Record<string,string>>;store:PublicationStore;github:GitHubConfig};
function fail():never {throw new Error('publisher_rejected');}
const hex=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);
export function verifyBundle(bundle:Bundle,publicKey:KeyLike,sources:Readonly<Record<string,string>>):void {
  try {
    if(!exactKeys(bundle,['receipt','signature','publicTask','publicContext','patch','checks']))fail();
    const r=bundle.receipt;
    if(!exactKeys(r,['policyVersion','jobId','feedbackId','inputVersion','approvalHash','baseSha','fence','patchDigest','checksDigest','expiresAt']) || r.policyVersion!==POLICY_VERSION || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r.feedbackId) || !Number.isSafeInteger(r.inputVersion)||r.inputVersion<1 || !Number.isSafeInteger(r.fence)||r.fence<1 || !hex(r.baseSha)||!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=Date.now() || r.expiresAt>Date.now()+600000 || !verify(null,Buffer.from(canonical(r)),publicKey,Buffer.from(bundle.signature,'base64')))fail();
    const envelope=approvedEnvelope(bundle.publicTask,bundle.publicContext);
    if(approvalHash(envelope.publicTask,envelope.publicContext)!==r.approvalHash || sha256(canonical(bundle.patch))!==r.patchDigest || sha256(canonical(bundle.checks))!==r.checksDigest)fail();
    for(const phase of ['baseline','candidate'] as const) {const c=bundle.checks[phase];if(!exactKeys(c,['phase','passed','commands','digest']) || c.phase!==phase || c.passed!==true || canonical(c.commands)!==canonical(['test','typecheck','build']) || !/^[0-9a-f]{64}$/.test(c.digest))fail();}
    validatePatch(bundle.patch,sources,r.baseSha,envelope.publicTask.origin==='private-feedback-v1'?'css-only':'legacy');
  }catch{fail();}
}
function blobSha(content:string):string {return createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(content)}\0`)).update(content).digest('hex');}
export function publicPrBody(bundle:Bundle):string {
  // JSON escapes preserve exact approved text while preventing mentions, HTML or fence breakout.
  const task=JSON.stringify(bundle.publicTask,null,2).replace(/[<>&`@]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  return 'Approved public task (verbatim JSON):\n\n```json\n'+task+'\n```\n\nPresentation-only automated draft. Trusted baseline and candidate test, typecheck, and build passed. No merge or deployment requested.\n\nValidation digest: `'+bundle.receipt.patchDigest+'`\n';
}
export async function publishBundle(o:PublishOptions):Promise<{number:number;url:string;headSha:string}> {
  if(o.enabled!==true)throw new Error('publisher_disabled');
  verifyBundle(o.bundle,o.publicKey,o.sources); // Before loading ANY installation credential.
  const {bundle,store}=o,r=bundle.receipt;
  await store.assertActive(bundle);
  const guard=async()=>{verifyBundle(bundle,o.publicKey,o.sources);await store.assertActive(bundle);if(await api.ref('main')!==r.baseSha)fail();};
  const api=new GitHubRest(o.github,guard);
  let row=await store.open(bundle);
  const branch='atlas-feedback/'+r.feedbackId;
  if(row.branch!==branch || row.version!==r.inputVersion || row.candidateDigest!==r.patchDigest || (row.expectedHeadSha!==null&&!hex(row.expectedHeadSha)) || (row.commitSha!==null&&!hex(row.commitSha)))fail();
  await guard();
  let remoteHead=await api.ref(branch);
  const title='Atlas feedback: '+bundle.publicTask.title,body=publicPrBody(bundle);
  if(row.prNumber!==null) {
    const prior=await api.request<GitPr>('GET','/pulls/'+row.prNumber);
    if(prior.number!==row.prNumber||prior.state!=='open'||prior.draft!==true||prior.head?.ref!==branch||prior.head?.repo?.full_name!==REPOSITORY||prior.base?.ref!=='main'||prior.base?.repo?.full_name!==REPOSITORY||![row.expectedHeadSha,row.commitSha].includes(prior.head?.sha))fail();
  }
  const initialPhase=row.phase;
  const parent=row.expectedHeadSha??r.baseSha;
  // Git stores author/committer time in whole seconds; receipt expiry remains exact.
  const commitTime=Math.floor(r.expiresAt/1000)*1000;
  const identity={name:'Atlas Feedback',email:'atlas-feedback@users.noreply.github.com',date:new Date(commitTime).toISOString()};
  async function verifyCommit(sha:string):Promise<boolean> {
    const c=await api.request<GitCommit>('GET','/git/commits/'+sha,undefined,true);
    if(!c || c.sha!==sha || !hex(c.tree?.sha) || c.parents?.length!==1 || c.parents[0].sha!==parent || c.message!=='Atlas feedback presentation update' || c.author?.name!==identity.name || c.author?.email!==identity.email || new Date(c.author?.date).getTime()!==commitTime || c.committer?.name!==identity.name || c.committer?.email!==identity.email || new Date(c.committer?.date).getTime()!==commitTime)return false;
    const tree=await api.request<GitTree>('GET','/git/trees/'+c.tree.sha+'?recursive=1');
    if(tree.sha!==c.tree.sha || tree.truncated!==false || !Array.isArray(tree.tree))return false;
    const baseCommit=await api.request<GitCommit>('GET','/git/commits/'+r.baseSha);
    if(baseCommit.sha!==r.baseSha||!hex(baseCommit.tree?.sha))return false;
    const original=await api.request<GitTree>('GET','/git/trees/'+baseCommit.tree.sha+'?recursive=1');
    if(original.sha!==baseCommit.tree.sha||original.truncated!==false||!Array.isArray(original.tree))return false;
    const leaves=(entries:GitTree['tree']):Map<string,string>|null=>{const map=new Map<string,string>();for(const e of entries){if(e.type==='tree')continue;if(typeof e.path!=='string'||map.has(e.path)||!hex(e.sha)||!['blob','commit'].includes(e.type))return null;map.set(e.path,canonical({mode:e.mode,type:e.type,sha:e.sha}));}return map;};
    const expected=leaves(original.tree),actual=leaves(tree.tree);if(!expected||!actual)return false;
    for(const f of bundle.patch.files)expected.set(f.path,canonical({mode:'100644',type:'blob',sha:blobSha(f.content)}));
    return expected.size===actual.size && [...expected].every(([path,value])=>actual.get(path)===value);
  }
  if(remoteHead && remoteHead!==row.expectedHeadSha) {
    // Reconcile crash after ref write, but never overwrite human/unrecognized commits.
    if(!(await verifyCommit(remoteHead)))fail();
    if(row.commitSha && remoteHead!==row.commitSha)fail();
    row={...row,commitSha:remoteHead,phase:row.phase==='pr_ready'?'pr_ready':'ref_written'};if(row.phase!=='pr_ready')await store.save(bundle,row);
  }
  if(!row.commitSha) {
    if(remoteHead!==row.expectedHeadSha)fail();
    const base=await api.request<GitCommit>('GET','/git/commits/'+r.baseSha);
    if(base.sha!==r.baseSha || !hex(base.tree?.sha))fail();
    const tree=await api.request<{sha:string}>('POST','/git/trees',{base_tree:base.tree.sha,tree:bundle.patch.files.map(f=>({path:f.path,mode:'100644',type:'blob',content:f.content}))});
    if(!hex(tree.sha))fail();
    const commit=await api.request<GitCommit>('POST','/git/commits',{message:'Atlas feedback presentation update',tree:tree.sha,parents:[parent],author:identity,committer:identity});
    if(!hex(commit.sha)||!(await verifyCommit(commit.sha)))fail();
    row={...row,commitSha:commit.sha,phase:'commit_created'};await store.save(bundle,row);
  }
  if(!(await verifyCommit(row.commitSha!)))fail();
  remoteHead=await api.ref(branch);
  if(remoteHead!==row.commitSha) {
    if(remoteHead!==row.expectedHeadSha)fail();
    if(remoteHead===null)await api.request('POST','/git/refs',{ref:'refs/heads/'+branch,sha:row.commitSha});
    else await api.request('PATCH','/git/refs/heads/'+branch,{sha:row.commitSha,force:false});
    if(await api.ref(branch)!==row.commitSha)fail();
  }
  row={...row,phase:row.phase==='pr_ready'?'pr_ready':'ref_written'};if(row.phase!=='pr_ready')await store.save(bundle,row);
  const prs=await api.request<GitPr[]>('GET','/pulls?state=all&head='+encodeURIComponent('protocol:'+branch)+'&base=main&per_page=100');
  if(!Array.isArray(prs)||prs.length>1)fail();
  let number:number;
  if(prs.length) {
    if(!Number.isSafeInteger(prs[0].number)||prs[0].number<1)fail();number=prs[0].number;
    const existing=await api.request<GitPr>('GET','/pulls/'+number);
    if(existing.state!=='open'||existing.draft!==true||existing.head?.sha!==row.commitSha||existing.head?.ref!==branch||existing.base?.ref!=='main'||existing.base?.repo?.full_name!==REPOSITORY||existing.head?.repo?.full_name!==REPOSITORY)fail();
    if(existing.title!==title||existing.body!==body) {
      // Only a previously recorded owned draft may be updated; unknown PR prose is a human conflict.
      if(row.prNumber!==number||initialPhase==='pr_ready')fail();
      await api.request('PATCH','/pulls/'+number,{title,body});
    }
  } else {
    if(row.prNumber!==null)fail();
    const pr=await api.request<GitPr>('POST','/pulls',{title,body,head:branch,base:'main',draft:true,maintainer_can_modify:false});
    if(!Number.isSafeInteger(pr.number)||pr.number<1)fail();number=pr.number;
  }
  const pr=await api.request<GitPr>('GET','/pulls/'+number);
  if(pr.number!==number || pr.html_url!==`https://github.com/${REPOSITORY}/pull/${number}` || pr.state!=='open' || pr.draft!==true || pr.head?.sha!==row.commitSha || pr.head?.ref!==branch || pr.head?.repo?.full_name!==REPOSITORY || pr.base?.ref!=='main' || pr.base?.repo?.full_name!==REPOSITORY || pr.title!==title || pr.body!==body || await api.ref(branch)!==row.commitSha)fail();
  await store.assertActive(bundle);
  await store.save(bundle,{...row,prNumber:number,phase:'pr_ready'});
  return {number,url:`https://github.com/${REPOSITORY}/pull/${number}`,headSha:row.commitSha!};
}
