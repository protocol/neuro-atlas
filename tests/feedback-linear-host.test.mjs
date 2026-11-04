import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHmac,createHash,randomUUID} from 'node:crypto';
import {requestHash,signPrivateRecord,renderPrivateComment,managedCommentId,privateRecordHash} from '../src/lib/feedback-linear/server/records.ts';
import {validateNative} from '../scripts/feedback-linear/input.ts';
const moduleUrl=new URL('../scripts/feedback-linear/host.ts',import.meta.url);
const ids={issue:'44444444-4444-4444-8444-444444444444',owner:'11111111-1111-4111-8111-111111111111',project:'22222222-2222-4222-8222-222222222222',team:'33333333-3333-4333-8333-333333333333',workspace:'55555555-5555-4555-8555-555555555555'};
const keys=generateKeyPairSync('ed25519'); // SYNTHETIC only. No production signer created.
const session=Buffer.alloc(32,11), recordKey=createHmac('sha256',session).update('atlas-linear-private-v1').digest();
const scope={issueId:ids.issue,ownerId:ids.owner,projectId:ids.project,teamId:ids.team,workspaceId:ids.workspace,workspace:'synthetic'};
const policy={...scope,hostPublicKey:keys.publicKey,recordKey};
const input={feedback:'SYNTHETIC PRIVATE CANARY',processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/',viewport:{width:390,height:1000},theme:'light'}};
const raw={schema:'atlas-linear-feedback-v1',feedbackId:ids.issue,version:1,operationId:ids.issue,ownerLinearId:ids.owner,createdAt:new Date().toISOString(),input};
const record=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...raw,requestHash:requestHash(raw)});
function native(){return {workspace:{id:ids.workspace,name:'Synthetic',url:'https://linear.app/synthetic'},issue:{id:'SYN-1',uuid:ids.issue,title:'Atlas presentation feedback',description:`Private feedback is held in managed, non-synced comments. Human review is required before any draft PR.\n\natlas-linear-managed-v1:${ids.issue}:${ids.project}:${ids.team}`,url:'https://linear.app/synthetic/issue/SYN-1/synthetic',projectId:ids.project,teamId:ids.team,createdById:ids.owner,archivedAt:null,updatedAt:new Date().toISOString()},comments:[{id:managedCommentId(ids.issue,1),body:renderPrivateComment(record),issue:{id:ids.issue},user:{id:ids.owner},parent:null,externalThread:null,syncedWith:[],archivedAt:null,quotedText:null}],complete:true};}
test('native transport exhausts ordinary managed comments through exact backend codec before HOST signs',async()=>{
  const {PrivateHost}=await import(moduleUrl.href);const data=native(),calls=[];
  const host=new PrivateHost({scope,inputPolicy:policy,signingKey:keys.privateKey}, {native:async(op,payload)=>{calls.push([op,payload]);return structuredClone(data);}});
  const signed=await host.readNative();
  assert.equal(validateNative(signed,policy).record.input.feedback,input.feedback);
  assert.deepEqual(calls,[['read',scope]]);
  assert.equal(signed.payload.issue.id,ids.issue);
  for(const change of [v=>v.complete=false,v=>v.workspace.id=ids.owner,v=>v.issue.projectId=ids.owner,v=>v.issue.title='Unmanaged',v=>v.comments[0].externalThread={id:'synced'},v=>delete v.comments[0].externalThread,v=>v.comments[0].quotedText='inline',v=>v.comments[0].id=ids.issue,v=>v.comments.push(v.comments[0]),v=>v.comments[0].body+=' ',v=>v.comments[0].user.id=ids.team]){
    const bad=native();change(bad);const h=new PrivateHost({scope,inputPolicy:policy,signingKey:keys.privateKey},{native:async()=>bad});
    await assert.rejects(h.readNative());
  }
});

import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {sign} from 'node:crypto';
import {canonical as hostCanonical} from '../scripts/feedback/engine.ts';
import {sha256} from '../scripts/feedback/validator.ts';
import {loadSnapshot} from '../scripts/feedback/git-sandbox.ts';
import {runTrustedChecks} from '../scripts/feedback/checks.ts';
async function workflowFixture(injected=false){
 const dir=await mkdtemp(path.join(tmpdir(),'host-workflow-')),repo=path.join(dir,'repo');await mkdir(repo);
 const git=(...a)=>execFileSync('/usr/bin/git',a,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-b','main');git('config','user.name','Synthetic');git('config','user.email','synthetic@example.invalid');
 await mkdir(path.join(repo,'src/components'),{recursive:true});await writeFile(path.join(repo,'src/components/landing.css'),'.card { padding: 8px; }\n');
 await writeFile(path.join(repo,'package.json'),JSON.stringify({scripts:{test:'node -e "process.exit(0)"',typecheck:'node -e "process.exit(0)"',build:'node -e "process.exit(0)"'}}));
 await writeFile(path.join(repo,'.gitignore'),'node_modules/\n');await mkdir(path.join(repo,'node_modules'));git('add','.');git('commit','-m','Synthetic baseline');const base=git('rev-parse','HEAD');
 const gitHash=s=>createHash('sha1').update(s).digest('hex'),blob=s=>gitHash(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(s)}\0`),Buffer.from(s)]));
 const baseTree=git('rev-parse','HEAD^{tree}'),leaves=git('ls-tree','-r','HEAD').split('\n').map(line=>{const [meta,p]=line.split('\t'),[mode,type,sha]=meta.split(' ');return {path:p,mode,type,sha};});
 const refs=new Map([['main',base]]),trees=new Map([[baseTree,{sha:baseTree,truncated:false,tree:leaves}]]),commits=new Map([[base,{sha:base,tree:{sha:baseTree},parents:[]}]]),prs=[],githubWrites=[];
 const server=createServer(async(req,res)=>{
  let text='';for await(const b of req)text+=b;const u=new URL(req.url,'http://synthetic.invalid'),p=u.pathname.replace('/repos/protocol/neuro-atlas',''),data=text?JSON.parse(text):{};let value;
  if(req.method!=='GET')githubWrites.push({p,data});
  if(p.startsWith('/git/ref/heads/')){const ref=p.slice('/git/ref/heads/'.length);value=refs.has(ref)?{ref:'refs/heads/'+ref,object:{sha:refs.get(ref)}}:undefined;}
  else if(p==='/git/trees'&&req.method==='POST'){const sha=gitHash(text);trees.set(sha,{sha,truncated:false,tree:[...trees.get(data.base_tree).tree.filter(f=>!data.tree.some(n=>n.path===f.path)),...data.tree.map(f=>({path:f.path,mode:f.mode,type:f.type,sha:blob(f.content)}))]});value={sha};}
  else if(p.startsWith('/git/trees/'))value=trees.get(p.split('/').at(-1));
  else if(p==='/git/commits'&&req.method==='POST'){const sha=gitHash(text);value={...data,sha,tree:{sha:data.tree},parents:data.parents.map(sha=>({sha}))};commits.set(sha,value);}
  else if(p.startsWith('/git/commits/'))value=commits.get(p.split('/').at(-1));
  else if(p==='/git/refs'&&req.method==='POST'){refs.set(data.ref.slice(11),data.sha);value={ref:data.ref,object:{sha:data.sha}};}
  else if(p==='/pulls'&&req.method==='GET')value=prs;
  else if(p==='/pulls'&&req.method==='POST'){value={number:1,html_url:'https://github.com/protocol/neuro-atlas/pull/1',state:'open',draft:data.draft,title:data.title,body:data.body,base:{ref:data.base,repo:{full_name:'protocol/neuro-atlas'}},head:{ref:data.head,sha:refs.get(data.head),repo:{full_name:'protocol/neuro-atlas'}}};prs.push(value);}
  else if(p==='/pulls/1'&&req.method==='GET')value=prs[0];
  res.statusCode=value===undefined?404:200;res.setHeader('content-type','application/json');res.end(JSON.stringify(value??{}));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));server.unref();
 const capture=generateKeyPairSync('ed25519'),channelId='C000SYNTH',reviewer='U000HUMAN',bot='U000BOT',nativeData=native();let messages=[],out=0,writes=0,threadReads=0;
 const ports={native:async(op,payload)=>{if(op==='read')return structuredClone(nativeData);writes++;const id='66666666-6666-4666-8666-'+String(writes).padStart(12,'0');const c={id,body:payload.body,issue:{id:ids.issue},user:{id:ids.owner},parent:null,externalThread:null,syncedWith:[],archivedAt:null,quotedText:null};nativeData.comments.push(c);return c;},
  sendRoot:async(channel,text)=>{out++;const ts=(Date.now()/1000).toFixed(6);messages.push({channel,ts,user:bot,text,thread_ts:ts,is_reply:false,reply_count:0});return {status:'delivered',platform:'slack',channel,ts,event_id:'77777777-7777-4777-8777-777777777777'};},
  sendFile:async(channel,thread,file,caption)=>{out++;const ts=(Number(thread)+out/1000000).toFixed(6);const bytes=await readFile(file);messages.push({channel,ts,user:bot,text:caption,thread_ts:thread,is_reply:true,files:[{id:'F'+out,name:path.basename(file),mimetype:'image/png',size:bytes.length}]});messages[0].reply_count++;return {status:'delivered',platform:'slack',channel,ts,thread_ts:thread,event_id:'88888888-8888-4888-8888-888888888888'};},
  search:async()=>{threadReads++;return {matches:structuredClone(messages),channels_searched:1,query:'',scope:'mine',truncated:false,total_matched:messages.length,threads_searched:1,threads_total:1};},
  fetchFile:async s=>readFile(path.join(dir,s.fileId==='F2'?'before.png':'after.png'))};
 const review={enabled:true,root:path.join(dir,'private'),repo,inputPolicy:policy,channelId,reviewerIds:[reviewer],capturePublicKey:capture.publicKey,mainOrigin:'http://127.0.0.1:'+server.address().port,fixture:true,maxJobUsd:1,maxDayUsd:2,maxTokens:10000,maxWallMs:20000,proposalTtlMs:3600000,model:{enabled:true,origin:'https://api.anthropic.com',model:'UNSELECTED_SYNTHETIC_NEVER_CALLED',inputUsdPerMillion:1,outputUsdPerMillion:1,maxInputTokens:1000,maxOutputTokens:100,maxBodyBytes:10000,maxResponseBytes:10000,timeoutMs:1000},modelKey:()=>{throw Error('NO_MODEL_INFERENCE_ALLOWED');}};
 const {HostWorkflow}=await import('../scripts/feedback-linear/host-workflow.ts');
 const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const existing=injected?new ReviewController({...review,readNative:async()=>{throw Error('STALE_CALLER_READER');}}):undefined;
 const workflow=new HostWorkflow({host:{scope,inputPolicy:policy,signingKey:keys.privateKey},...(injected?{controller:existing}:{review}),slack:{channelId,verifiedHumanReviewerIds:[reviewer],botIds:[bot]},writesEnabled:true,publishEnabled:true},ports);
 const c=workflow.controller,snapshot=await loadSnapshot(repo,base),checked=validateNative(await workflow.host.readNative(),policy),checks={baseline:await runTrustedChecks(repo,'baseline',{timeoutMs:10000}),candidate:await runTrustedChecks(repo,'candidate',{timeoutMs:10000})};
 const hash=v=>sha256(hostCanonical(v));
 const candidate={schema:1,revision:1,input:checked,baseSha:base,patch:{baseSha:base,files:[{path:'src/components/landing.css',beforeSha256:sha256(snapshot['src/components/landing.css']),content:'.card { padding: 16px; }\n'}]},checks,sourcesDigest:hash(snapshot),policyDigest:hash({owner:scope.ownerId,workspace:scope.workspace,project:scope.projectId,team:scope.teamId,channel:channelId,reviewers:[reviewer],provider:'anthropic',budget:{kind:'usd',maxJobUsd:1,maxDayUsd:2},model:review.model,caps:[10000,20000,3600000]}),preparedAt:Date.now(),expiresAt:Date.now()+3600000};
 await c.files.lock(async state=>{const candidateDigest=await c.files.artifact(Buffer.from(hostCanonical(candidate)));state.jobs[ids.issue]={state:'awaiting_capture',fence:1,inputHash:checked.recordHash,candidateDigest};state.fence=1;state.spend.push({id:ids.issue,day:new Date().toISOString().slice(0,10),job:ids.issue,upper:1,tokens:100,actual:0});await c.files.save(state);});
 const before=await readFile(new URL('../docs/qa/feedback/hover-mobile-midpage-390.png',import.meta.url)),after=await readFile(new URL('../docs/qa/feedback/mobile-anchored-390.png',import.meta.url));await writeFile(path.join(dir,'before.png'),before);await writeFile(path.join(dir,'after.png'),after);
 const payload={captureId:ids.issue,at:Date.now(),candidateDigest:(await c.status(ids.issue)).candidateDigest,revision:1,baseSha:base,patchDigest:hash(candidate.patch),checksDigest:hash(checks),route:'/',theme:'light',browser:'trusted-parent-browser',before:{digest:sha256(before),width:390,height:1000},after:{digest:sha256(after),width:390,height:1000}};
 await c.attachCapture(ids.issue,{payload,signature:sign(null,Buffer.from(hostCanonical({purpose:'atlas-linear-capture-v1',payload})),capture.privateKey).toString('base64')},before,after);
 const add=(user,text)=>{const root=messages[0],ts=(Date.now()/1000+0.001).toFixed(6);messages.push({channel:channelId,ts,user,text,thread_ts:root.ts,is_reply:true});root.reply_count++;return ts;};
 return {workflow,existing,review,nativeData,messages,add,counts:()=>({out,writes,threadReads,githubWrites}),cleanup:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}};
}
test('history-proof hold also blocks already-seeded native delivery before Slack or Linear side effects',async()=>{
 const f=await workflowFixture();try{
  f.workflow.controller.config.fixture=false;
  await assert.rejects(f.workflow.deliver(ids.issue),/native_history_witness_unavailable/);
  assert.equal(f.counts().out,0);assert.equal(f.counts().writes,0);
 }finally{await f.cleanup();}
});

test('independent pending correction blocks HOST delivery before the first Slack or Linear write',async()=>{
 const f=await workflowFixture();try{
  const {FileIntakeWitness}=await import('../scripts/feedback-linear/witness-store.ts');
  const witness=new FileIntakeWitness({root:path.join(path.dirname(f.review.root),'witness'),scope:{workspaceId:ids.workspace,projectId:ids.project,teamId:ids.team,ownerId:ids.owner}});
  await witness.initialize();
  const op=r=>({feedbackId:r.feedbackId,operationId:r.operationId,version:r.version,createdAt:r.createdAt,requestHash:r.requestHash,recordHash:privateRecordHash(r),...(r.previousRecordHash?{previousRecordHash:r.previousRecordHash}:{})});
  await witness.reserve(op(record));await witness.complete(op(record));
  const next={...raw,version:2,operationId:randomUUID(),previousRecordHash:privateRecordHash(record),createdAt:new Date().toISOString()};
  const correction=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...next,requestHash:requestHash(next)});
  await witness.reserve(op(correction));
  f.workflow.controller.config.historyWitness=witness;
  await assert.rejects(f.workflow.deliver(ids.issue));
  assert.equal(f.counts().out,0,'no review message or image may precede current witness admission');
  assert.equal(f.counts().writes,0,'no Linear control comment may precede current witness admission');
 }finally{await f.cleanup();}
});

test('SYNTHETIC workflow: deliver both files plus private Linear exact readback; admission fetches actual human source; real controller.publish uses concrete live reader and blocks disagreement before GitHub',async()=>{
 const f=await workflowFixture();try{
 const {workflow:w}=f;
 const sent=await w.deliver(ids.issue);assert.equal(sent.state,'awaiting_review');assert.equal(f.counts().out,3);assert.equal(f.counts().writes,1);
 await assert.rejects(w.deliver(ids.issue));assert.equal(f.counts().out,3);
 const proposal=(await w.controller.status(ids.issue)).proposalDigest;
 const source=f.add('U000HUMAN','approve '+proposal);
 await assert.rejects(w.admitDecision(ids.issue,{messageId:source,speakerId:'U000HUMAN',approved:true}));assert.equal(f.counts().writes,1);
 const job=await w.admitDecision(ids.issue,source);assert.equal(job.state,'approved');assert.equal(f.counts().writes,2);
 await assert.rejects(w.admitDecision(ids.issue,source));assert.equal(f.counts().writes,2);
 let tokens=0;f.add('U000HUMAN','I disagree; do not publish.');const before=f.counts().threadReads;
 await assert.rejects(w.publish(ids.issue,{enabled:true,signingKey:keys.privateKey,github:{origin:f.review.mainOrigin,fixture:true,token:()=>{tokens++;return 'SYNTHETIC';}}}));
 assert.ok(f.counts().threadReads>before);assert.equal(tokens,0);
 assert.equal((await w.controller.status(ids.issue)).state,'approved');
 assert.ok(!JSON.stringify(f.nativeData.comments.slice(1)).includes(input.feedback));
 }finally{await f.cleanup();}
});

test('SYNTHETIC full publication exercises real ReviewController.publish and repeated live native/Slack guards; exact human approval yields only draft PR with fixture writes',async()=>{
 const f=await workflowFixture();try{
 const w=f.workflow;await w.deliver(ids.issue);const p=(await w.controller.status(ids.issue)).proposalDigest;
 const source=f.add('U000HUMAN','approve '+p);await w.admitDecision(ids.issue,source);
 const before=f.counts().threadReads;
 const result=await w.publish(ids.issue,{enabled:true,signingKey:keys.privateKey,github:{origin:f.review.mainOrigin,fixture:true,token:()=> 'SYNTHETIC_NOT_A_CREDENTIAL'}});
 assert.equal(result.state,'published');assert.equal(result.publication.phase,'pr_ready');assert.equal(result.result.number,1);assert.ok(f.counts().threadReads>before+4);assert.equal(f.counts().githubWrites.length,4);assert.equal(f.counts().githubWrites.at(-1).data.draft,true);assert.ok(!JSON.stringify(f.counts().githubWrites).includes(input.feedback));assert.ok(!JSON.stringify(f.counts().githubWrites).includes(p));
 }finally{await f.cleanup();}
});

test('native documented author identity is mapped without inventing missing ordinary-lane provenance; conflicting identities block',async()=>{
 const {PrivateHost}=await import(moduleUrl.href);const data=native();data.comments[0].author={id:ids.owner,name:'Synthetic verified source'};delete data.comments[0].user;
 const h=new PrivateHost({scope,inputPolicy:policy,signingKey:keys.privateKey},{native:async()=>data});
 assert.equal(validateNative(await h.readNative(),policy).record.ownerLinearId,ids.owner);
 data.comments[0].user={id:ids.team};await assert.rejects(h.readNative());
 delete data.comments[0].user;delete data.comments[0].externalThread;await assert.rejects(h.readNative());
});

test('owner-account lane may supply an already-constructed controller; HOST replaces stale native/thread hooks with concrete readers without interpreting model or dollar config',async()=>{
 const f=await workflowFixture(true);try{
 assert.equal(f.workflow.controller,f.existing);assert.equal(validateNative(await f.existing.config.readNative(),policy).record.feedbackId,ids.issue);
 assert.equal((await f.workflow.deliver(ids.issue)).state,'awaiting_review');
 const p=(await f.existing.status(ids.issue)).proposalDigest,source=f.add('U000HUMAN','reject '+p);
 assert.equal((await f.workflow.admitDecision(ids.issue,source)).state,'rejected');
 }finally{await f.cleanup();}
});
