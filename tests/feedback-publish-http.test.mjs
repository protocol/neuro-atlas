import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import { createHash,generateKeyPairSync,sign } from 'node:crypto';
import { fixture } from './feedback-worker-git.test.mjs';
import { loadSnapshot } from '../scripts/feedback/git-sandbox.ts';
import { sha256 } from '../scripts/feedback/validator.ts';
import { canonical,approvalHash } from '../scripts/feedback/engine.ts';
const h=s=>createHash('sha1').update(s).digest('hex');
const blob=s=>h(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(s)}\0`),Buffer.from(s)]));

export async function githubFixture(t,base,crash='') {
  const trees=new Map([['b'.repeat(40),{sha:'b'.repeat(40),truncated:false,tree:[{path:'src/components/landing.css',mode:'100644',type:'blob',sha:blob('.card { gap: 8px; }\n')},{path:'src/proxy.ts',mode:'100644',type:'blob',sha:blob('PRIVATE_CANARY_DO_NOT_EXPORT')}]}]]),commits=new Map([[base,{sha:base,tree:{sha:'b'.repeat(40)},parents:[]}]]),refs=new Map([['main',base]]),prs=[];const writes=[];let crashed=false;
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://fixture.invalid');const p=url.pathname.replace('/repos/protocol/neuro-atlas','');let body='';for await(const c of req)body+=c;
    const data=body?JSON.parse(body):{};let value,code=200;
    if(req.method!=='GET')writes.push({p,data});
    if(p.startsWith('/git/ref/heads/')&&req.method==='GET'){const branch=p.slice('/git/ref/heads/'.length);value=refs.has(branch)?{ref:'refs/heads/'+branch,object:{sha:refs.get(branch)}}:undefined;}
    else if(p==='/git/trees'&&req.method==='POST'){const sha=h(body);trees.set(sha,{sha,truncated:false,tree:[...(trees.get(data.base_tree)?.tree??[]).filter(f=>!data.tree.some(n=>n.path===f.path)),...data.tree.map(f=>({path:f.path,mode:f.mode,type:f.type,sha:blob(f.content)}))]});value={sha};}
    else if(p.startsWith('/git/trees/')&&req.method==='GET')value=trees.get(p.split('/').at(-1));
    else if(p==='/git/commits'&&req.method==='POST'){const normalize=identity=>({...identity,date:new Date(Math.floor(Date.parse(identity.date)/1000)*1000).toISOString()});const normalized={...data,author:normalize(data.author),committer:normalize(data.committer)};const sha=h(JSON.stringify(normalized));value={sha,tree:{sha:data.tree},parents:data.parents.map(sha=>({sha})),message:data.message,author:normalized.author,committer:normalized.committer};commits.set(sha,value);}
    else if(p.startsWith('/git/commits/')&&req.method==='GET')value=commits.get(p.split('/').at(-1));
    else if(p==='/git/refs'&&req.method==='POST'){const branch=data.ref.replace('refs/heads/','');if(refs.has(branch)){code=422;value={};}else{refs.set(branch,data.sha);value={ref:data.ref,object:{sha:data.sha}};}}
    else if(p.startsWith('/git/refs/heads/')&&req.method==='PATCH'){const branch=p.slice('/git/refs/heads/'.length);assert.equal(data.force,false);refs.set(branch,data.sha);value={ref:'refs/heads/'+branch,object:{sha:data.sha}};}
    else if(p==='/pulls'&&req.method==='GET')value=prs;
    else if(p==='/pulls'&&req.method==='POST'){value={number:1,html_url:'https://github.com/protocol/neuro-atlas/pull/1',draft:data.draft,state:'open',title:data.title,body:data.body,base:{ref:data.base,repo:{full_name:'protocol/neuro-atlas'}},head:{ref:data.head,sha:refs.get(data.head),repo:{full_name:'protocol/neuro-atlas'}}};prs.push(value);}
    else if(p==='/pulls/1'&&req.method==='GET'){value=prs[0];if(value)value.head.sha=refs.get(value.head.ref);}
    else if(p==='/pulls/1'&&req.method==='PATCH'){Object.assign(prs[0],data);value=prs[0];}
    if(req.method!=='GET'&&p===crash&&!crashed){crashed=true;req.socket.destroy();return;}
    res.writeHead(value===undefined?404:code,{'content-type':'application/json'});res.end(JSON.stringify(value??{}));
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  return {origin:`http://127.0.0.1:${server.address().port}`,refs,prs,writes,trees,commits};
}
export async function bundleFixture(t) {
  const {cwd,base}=await fixture(t);const sources=await loadSnapshot(cwd,base);const keys=generateKeyPairSync('ed25519');
  const publicTask={title:'Spacing',summary:'Increase spacing',acceptance:['Readable']};const publicContext={route:'/',viewport:{width:1000,height:800},theme:'light'};
  const patch={baseSha:base,files:[{path:'src/components/landing.css',beforeSha256:sha256(sources['src/components/landing.css']),content:'.card { gap: 12px; }\n'}]};
  const checks={baseline:{phase:'baseline',passed:true,commands:['test','typecheck','build'],digest:sha256('baseline')},candidate:{phase:'candidate',passed:true,commands:['test','typecheck','build'],digest:sha256('candidate')}};
  const receipt={policyVersion:'atlas-feedback-v1',jobId:'job1',feedbackId:'16d0cd59-21ec-4cb0-83e0-31395208603d',inputVersion:1,approvalHash:approvalHash(publicTask,publicContext),baseSha:base,fence:1,patchDigest:sha256(canonical(patch)),checksDigest:sha256(canonical(checks)),expiresAt:Date.now()+60000};
  return {cwd,base,sources,keys,bundle:{receipt,signature:sign(null,Buffer.from(canonical(receipt)),keys.privateKey).toString('base64'),publicTask,publicContext,patch,checks}};
}
export function publicationStore() {
  let row=null;let enabled=true;
  return {assertActive:async()=>{if(!enabled)throw new Error('disabled')},open:async(b)=>row??(row={branch:'atlas-feedback/'+b.receipt.feedbackId,version:b.receipt.inputVersion,candidateDigest:b.receipt.patchDigest,expectedHeadSha:null,commitSha:null,prNumber:null,phase:'reserved'}),save:async(_b,next)=>{row={...next}},disable:()=>{enabled=false},row:()=>row};
}
test('separate publisher reconciles synthetic GitHub HTTP crashes without duplicate branch/draft PR; readbacks exact files',async t=>{
  const { publishBundle }=await import('../scripts/feedback/publisher.ts');
  for(const crash of ['/git/trees','/git/commits','/git/refs','/pulls']) {
    await t.test(crash,async t=>{
      const f=await bundleFixture(t),remote=await githubFixture(t,f.base,crash),store=publicationStore();let loads=0;
      const options={enabled:true,bundle:f.bundle,publicKey:f.keys.publicKey,sources:f.sources,store,github:{origin:remote.origin,fixture:true,token:()=>{loads++;return 'SYNTHETIC_INSTALLATION_TOKEN'}}};
      await assert.rejects(publishBundle(options));
      const result=await publishBundle(options);assert.equal(result.number,1);assert.equal(result.headSha,remote.refs.get(store.row().branch));assert.equal(remote.prs.length,1);
      const before=remote.writes.length;await publishBundle(options);assert.equal(remote.writes.length,before);
      assert.equal(remote.prs[0].draft,true);assert.equal(remote.prs[0].base.ref,'main');assert.ok(!JSON.stringify(remote.writes).includes('PRIVATE_CANARY'));
      assert.ok(loads>0);
    });
  }
});
test('tampered bundle, disabled control and unexpected head cannot load credentials or write',async t=>{
  const { publishBundle }=await import('../scripts/feedback/publisher.ts');const f=await bundleFixture(t),remote=await githubFixture(t,f.base),store=publicationStore();let loads=0;
  const options={enabled:true,bundle:f.bundle,publicKey:f.keys.publicKey,sources:f.sources,store,github:{origin:remote.origin,fixture:true,token:()=>{loads++;return 'SYNTHETIC_TOKEN'}}};
  await assert.rejects(publishBundle({...options,bundle:{...f.bundle,patch:{...f.bundle.patch,files:[]}}}));assert.equal(loads,0);
  await assert.rejects(publishBundle({...options,enabled:false}));assert.equal(loads,0);
  remote.refs.set('atlas-feedback/'+f.bundle.receipt.feedbackId,'c'.repeat(40));await assert.rejects(publishBundle(options));assert.equal(remote.writes.length,0);
  store.disable();await assert.rejects(publishBundle(options));assert.equal(remote.writes.length,0);
});

test('publisher rejects a matching presentation blob hidden in a commit with extra unrelated changes',async t=>{
  const { publishBundle }=await import('../scripts/feedback/publisher.ts');
  const f=await bundleFixture(t),remote=await githubFixture(t,f.base),store=publicationStore();
  const row=await store.open(f.bundle);const date=new Date(Math.floor(f.bundle.receipt.expiresAt/1000)*1000).toISOString();const identity={name:'Atlas Feedback',email:'atlas-feedback@users.noreply.github.com',date};
  const sha='d'.repeat(40),tree='e'.repeat(40);
  remote.trees.set(tree,{sha:tree,truncated:false,tree:[{path:'src/components/landing.css',type:'blob',mode:'100644',sha:blob(f.bundle.patch.files[0].content)},{path:'src/proxy.ts',type:'blob',mode:'100644',sha:'f'.repeat(40)}]});
  remote.commits.set(sha,{sha,tree:{sha:tree},parents:[{sha:f.base}],message:'Atlas feedback presentation update',author:identity,committer:identity});remote.refs.set(row.branch,sha);
  await assert.rejects(publishBundle({enabled:true,bundle:f.bundle,publicKey:f.keys.publicKey,sources:f.sources,store,github:{origin:remote.origin,fixture:true,token:()=> 'SYNTHETIC'}}));
  assert.equal(remote.writes.length,0);
});

test('GitHub adapter has no merge/deployment/arbitrary write endpoint even with a token callback',async()=>{
  const { GitHubRest }=await import('../scripts/feedback/github.ts');let loads=0;
  const api=new GitHubRest({origin:'http://127.0.0.1:1',fixture:true,token:()=>{loads++;return 'NEVER_LOAD'}},async()=>{});
  await assert.rejects(api.request('POST','/pulls/1/merge',{}),/publisher_rejected/);
  await assert.rejects(api.request('POST','/deployments',{}),/publisher_rejected/);assert.equal(loads,0);
});


test('Git-second commit readback works with fractional receipt expiry; actual Git confirms precision',async t=>{
  const {publishBundle}=await import('../scripts/feedback/publisher.ts');
  const f=await bundleFixture(t),expiry=Math.floor((Date.now()+60000)/1000)*1000+789;
  f.bundle.receipt.expiresAt=expiry;f.bundle.signature=sign(null,Buffer.from(canonical(f.bundle.receipt)),f.keys.privateKey).toString('base64');
  const env={PATH:'/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_AUTHOR_NAME:'Synthetic',GIT_AUTHOR_EMAIL:'synthetic@example.invalid',GIT_COMMITTER_NAME:'Synthetic',GIT_COMMITTER_EMAIL:'synthetic@example.invalid',GIT_AUTHOR_DATE:new Date(expiry).toISOString(),GIT_COMMITTER_DATE:new Date(expiry).toISOString()};
  const tree=execFileSync('/usr/bin/git',['rev-parse','HEAD^{tree}'],{cwd:f.cwd,env,encoding:'utf8'}).trim();
  const commit=execFileSync('/usr/bin/git',['commit-tree',tree,'-m','precision fixture'],{cwd:f.cwd,env,encoding:'utf8'}).trim();
  const actual=execFileSync('/usr/bin/git',['show','-s','--format=%aI',commit],{cwd:f.cwd,env,encoding:'utf8'}).trim();
  assert.equal(Date.parse(actual),Math.floor(expiry/1000)*1000);
  const remote=await githubFixture(t,f.base),store=publicationStore();
  const result=await publishBundle({enabled:true,bundle:f.bundle,publicKey:f.keys.publicKey,sources:f.sources,store,github:{origin:remote.origin,fixture:true,token:()=> 'SYNTHETIC_TOKEN'}});
  assert.equal(result.number,1);assert.equal(remote.prs.length,1);assert.equal(Date.parse(remote.commits.get(result.headSha).author.date),Math.floor(expiry/1000)*1000);assert.equal(f.bundle.receipt.expiresAt,expiry);
});
