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
const policy={...scope,authority:'witnessed-intake-v1',hostPublicKey:keys.publicKey,recordKey};
const input={feedback:'SYNTHETIC PRIVATE CANARY',processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/',viewport:{width:390,height:1000},theme:'light'}};
const raw={schema:'atlas-linear-feedback-v1',feedbackId:ids.issue,version:1,operationId:ids.issue,ownerLinearId:ids.owner,createdAt:new Date().toISOString(),input};
const record=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...raw,requestHash:requestHash(raw)});
function native(){return {workspace:{id:ids.workspace,name:'Synthetic',url:'https://linear.app/synthetic'},issue:{id:'SYN-1',uuid:ids.issue,title:'Atlas presentation feedback',description:`Private feedback is held in managed, non-synced comments. Human review is required before any draft PR.\n\natlas-linear-managed-v1:${ids.issue}:${ids.project}:${ids.team}`,url:'https://linear.app/synthetic/issue/SYN-1/synthetic',projectId:ids.project,teamId:ids.team,createdById:ids.owner,archivedAt:null,updatedAt:new Date().toISOString()},comments:[{id:managedCommentId(ids.issue,1),body:renderPrivateComment(record),issue:{id:ids.issue},user:{id:ids.owner},parent:null,externalThread:null,syncedWith:[],archivedAt:null,quotedText:null}],complete:true};}
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {FileIntakeWitness} from '../scripts/feedback-linear/witness-store.ts';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {sign} from 'node:crypto';
import {canonical as hostCanonical} from '../scripts/feedback/engine.ts';
import {sha256} from '../scripts/feedback/validator.ts';
import {loadSnapshot} from '../scripts/feedback/git-sandbox.ts';
import {runTrustedChecks} from '../scripts/feedback/checks.ts';
async function workflowFixture(injected=false){
 const dir=await mkdtemp('/opt/data/tmp/witnessed-host-workflow-'),repo=path.join(dir,'repo');await mkdir(repo);
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
 const witness=new FileIntakeWitness({root:path.join(dir,'witness'),scope:{workspaceId:ids.workspace,ownerId:ids.owner,projectId:ids.project,teamId:ids.team}});await witness.initialize();await witness.reserve(operation(record));await witness.complete(operation(record));
 for(const c of nativeData.comments){c.author=c.user;delete c.user;c.parentId=null;for(const field of ['issue','parent','externalThread','syncedWith','archivedAt'])delete c[field];}
 const review={historyWitness:witness,enabled:true,root:path.join(dir,'private'),repo,inputPolicy:policy,channelId,reviewerIds:[reviewer],capturePublicKey:capture.publicKey,mainOrigin:'http://127.0.0.1:'+server.address().port,fixture:true,maxJobUsd:1,maxDayUsd:2,maxTokens:10000,maxWallMs:20000,proposalTtlMs:3600000,model:{enabled:true,origin:'https://api.anthropic.com',model:'UNSELECTED_SYNTHETIC_NEVER_CALLED',inputUsdPerMillion:1,outputUsdPerMillion:1,maxInputTokens:1000,maxOutputTokens:100,maxBodyBytes:10000,maxResponseBytes:10000,timeoutMs:1000},modelKey:()=>{throw Error('NO_MODEL_INFERENCE_ALLOWED');}};
 const {HostWorkflow}=await import('../scripts/feedback-linear/host-workflow.ts');
 const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const existing=injected?new ReviewController({...review,readNative:async()=>{throw Error('STALE_CALLER_READER');}}):undefined;
 const workflow=new HostWorkflow({host:{scope,inputPolicy:policy,signingKey:keys.privateKey,historyWitness:witness},...(injected?{controller:existing}:{review}),slack:{channelId,verifiedHumanReviewerIds:[reviewer],botIds:[bot]},writesEnabled:true,publishEnabled:true},ports);
 const c=workflow.controller,snapshot=await loadSnapshot(repo,base),checked=validateNative(await workflow.host.readNative(),policy),checks={baseline:await runTrustedChecks(repo,'baseline',{timeoutMs:10000}),candidate:await runTrustedChecks(repo,'candidate',{timeoutMs:10000})};
 const hash=v=>sha256(hostCanonical(v));
 const candidate={schema:1,revision:1,input:checked,baseSha:base,patch:{baseSha:base,files:[{path:'src/components/landing.css',beforeSha256:sha256(snapshot['src/components/landing.css']),content:'.card { padding: 16px; }\n'}]},checks,sourcesDigest:hash(snapshot),policyDigest:hash({owner:scope.ownerId,workspace:scope.workspace,project:scope.projectId,team:scope.teamId,channel:channelId,reviewers:[reviewer],provider:'anthropic',budget:{kind:'usd',maxJobUsd:1,maxDayUsd:2},model:review.model,inputAuthority:'witnessed-intake-v1',history:{identity:witness.identity,policyDigest:witness.policyDigest},caps:[10000,20000,3600000]}),preparedAt:Date.now(),expiresAt:Date.now()+3600000};
 await c.files.lock(async state=>{const candidateDigest=await c.files.artifact(Buffer.from(hostCanonical(candidate)));state.jobs[ids.issue]={state:'awaiting_capture',fence:1,inputHash:checked.recordHash,candidateDigest};state.fence=1;state.spend.push({id:ids.issue,day:new Date().toISOString().slice(0,10),job:ids.issue,upper:1,tokens:100,actual:0});await c.files.save(state);});
 const before=await readFile(new URL('../docs/qa/feedback/hover-mobile-midpage-390.png',import.meta.url)),after=await readFile(new URL('../docs/qa/feedback/mobile-anchored-390.png',import.meta.url));await writeFile(path.join(dir,'before.png'),before);await writeFile(path.join(dir,'after.png'),after);
 const payload={captureId:ids.issue,at:Date.now(),candidateDigest:(await c.status(ids.issue)).candidateDigest,revision:1,baseSha:base,patchDigest:hash(candidate.patch),checksDigest:hash(checks),route:'/',theme:'light',browser:'trusted-parent-browser',before:{digest:sha256(before),width:390,height:1000},after:{digest:sha256(after),width:390,height:1000}};
 await c.attachCapture(ids.issue,{payload,signature:sign(null,Buffer.from(hostCanonical({purpose:'atlas-linear-capture-v1',payload})),capture.privateKey).toString('base64')},before,after);
 const add=(user,text)=>{const root=messages[0],ts=(Date.now()/1000+0.001).toFixed(6);messages.push({channel:channelId,ts,user,text,thread_ts:root.ts,is_reply:true});root.reply_count++;return ts;};
 return {workflow,existing,review,witness,nativeData,messages,add,counts:()=>({out,writes,threadReads,githubWrites}),cleanup:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}};
}

const operation=r=>({feedbackId:r.feedbackId,version:r.version,operationId:r.operationId,createdAt:r.createdAt,requestHash:r.requestHash,recordHash:privateRecordHash(r),...(r.previousRecordHash?{previousRecordHash:r.previousRecordHash}:{})});

test('WITNESSED-INTAKE admits native omitted privacy fields with concrete committed witness, without claiming current ordinary metadata',async t=>{
 const dir=await mkdtemp('/opt/data/tmp/witnessed-native-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const witness=new FileIntakeWitness({root:dir+'/witness',scope:{workspaceId:ids.workspace,ownerId:ids.owner,projectId:ids.project,teamId:ids.team}});await witness.initialize();await witness.reserve(operation(record));await witness.complete(operation(record));
 const data=native(),c=data.comments[0];c.author=c.user;delete c.user;c.parentId=null;for(const field of ['issue','parent','externalThread','syncedWith','archivedAt'])delete c[field];
 const {PrivateHost}=await import(moduleUrl.href);
 const h=new PrivateHost({scope,inputPolicy:policy,signingKey:keys.privateKey,historyWitness:witness},{native:async()=>structuredClone(data)});
 const receipt=await h.readNative(),checked=validateNative(receipt,policy);
 assert.equal(receipt.payload.schema,'atlas-linear-witnessed-native-read-v1');
 assert.equal(checked.recordHash,privateRecordHash(record));
 assert.equal(Object.hasOwn(receipt.payload.observations[0],'externalThread'),false);
 assert.equal(Object.hasOwn(receipt.payload.observations[0],'archivedAt'),false);
 assert.equal(receipt.payload.observations[0].parentId,null);
 await assert.rejects(async()=>validateNative(receipt,{...policy,authority:'ordinary-v1'}));
});

test('SYNTHETIC WITNESSED-INTAKE full delivery then actual human rejection keeps durable v2 private receipts and makes zero Linear/GitHub writes',async()=>{
 const f=await workflowFixture();try{
 const w=f.workflow;assert.equal((await w.deliver(ids.issue)).state,'awaiting_review');
 assert.equal(f.counts().writes,0);assert.equal(f.counts().out,3);
 const p=(await w.controller.status(ids.issue)).proposalDigest,source=f.add('U000HUMAN','reject '+p);
 assert.equal((await w.admitDecision(ids.issue,source)).state,'rejected');
 const job=await w.controller.status(ids.issue);
 for(const field of ['deliveryDigest','decisionDigest']){
  const receipt=JSON.parse((await w.controller.files.artifactBytes(job[field])).toString());
  assert.equal(Object.hasOwn(receipt.payload,'linearCommentId'),false);
  assert.match(receipt.payload.schema,/witnessed-.*-v2$/);
 }
 await assert.rejects(w.publish(ids.issue,{enabled:true,signingKey:keys.privateKey,github:{origin:f.review.mainOrigin,fixture:true,token:()=>{throw Error('NO_CREDENTIAL_BEFORE_APPROVAL');}}}));
 assert.equal(f.counts().writes,0);assert.equal(f.counts().githubWrites.length,0);
 }finally{await f.cleanup();}
});

test('WITNESSED-INTAKE cannot use ordinary fixture history bypass or a foreign workspace witness',async()=>{
 const f=await workflowFixture();try{
 const c=f.workflow.controller;
 c.config.historyWitness=undefined;
 assert.throws(()=>c.assertHistoryWitness(),/native_history_witness_unavailable/);
 c.config.historyWitness=new FileIntakeWitness({root:f.witness.root,scope:{...f.witness.scope,workspaceId:ids.issue}});
 assert.throws(()=>c.assertHistoryWitness(),/native_history_witness_unavailable/);
 }finally{await f.cleanup();}
});

test('SYNTHETIC WITNESSED-INTAKE exact human approval runs actual controller draft publisher peer with repeated full Slack/image/source guards and zero Linear control writes',async()=>{
 const f=await workflowFixture(true);try{
 const w=f.workflow;await w.deliver(ids.issue);const p=(await w.controller.status(ids.issue)).proposalDigest;
 await w.admitDecision(ids.issue,f.add('U000HUMAN','approve '+p));const before=f.counts().threadReads;
 const result=await w.publish(ids.issue,{enabled:true,signingKey:keys.privateKey,github:{origin:f.review.mainOrigin,fixture:true,token:()=> 'SYNTHETIC_NOT_A_CREDENTIAL'}});
 assert.equal(result.state,'published');assert.equal(result.publication.phase,'pr_ready');
 assert.equal(f.counts().writes,0);assert.equal(f.counts().githubWrites.length,4);
 assert.equal(f.counts().githubWrites.at(-1).data.draft,true);assert.ok(f.counts().threadReads>before+4);
 assert.ok(!JSON.stringify(f.counts().githubWrites).includes(input.feedback));assert.ok(!JSON.stringify(f.counts().githubWrites).includes(p));
 }finally{await f.cleanup();}
});

test('WITNESSED-INTAKE native admission rejects missing observed fields, known contradictory metadata, tamper, replay, deleted suffix and reserved tail',async t=>{
 const dir=await mkdtemp('/opt/data/tmp/witnessed-native-adversarial-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const witness=new FileIntakeWitness({root:dir+'/witness',scope:{workspaceId:ids.workspace,ownerId:ids.owner,projectId:ids.project,teamId:ids.team}});await witness.initialize();await witness.reserve(operation(record));await witness.complete(operation(record));
 const {PrivateHost}=await import(moduleUrl.href);
 function source(){const v=native(),c=v.comments[0];c.author=c.user;delete c.user;c.parentId=null;for(const field of ['issue','parent','externalThread','syncedWith','archivedAt'])delete c[field];return v;}
 const host=data=>new PrivateHost({scope,inputPolicy:policy,signingKey:keys.privateKey,historyWitness:witness},{native:async()=>structuredClone(data)});
 for(const change of [v=>delete v.comments[0].parentId,v=>delete v.comments[0].quotedText,v=>delete v.comments[0].author,v=>v.comments[0].author.id=ids.team,v=>v.comments[0].parentId=ids.issue,v=>v.comments[0].quotedText='inline',v=>v.comments[0].externalThread={id:'synced'},v=>v.comments[0].syncedWith=['external'],v=>v.comments[0].archivedAt=new Date().toISOString(),v=>v.comments[0].issue={id:ids.team},v=>v.comments[0].parent={id:ids.issue},v=>v.comments[0].body+=' ',v=>v.comments[0].id=ids.issue,v=>v.comments.push({...v.comments[0],id:ids.team}),v=>v.comments=[],v=>v.complete=false,v=>v.issue.createdById=ids.team]){
  const v=source();change(v);await assert.rejects(host(v).readNative());
 }
 const oldPolicy={...policy,authority:'ordinary-v1'};await assert.rejects(new PrivateHost({scope,inputPolicy:oldPolicy,signingKey:keys.privateKey},{native:async()=>source()}).readNative());
 const next={...raw,version:2,operationId:randomUUID(),previousRecordHash:privateRecordHash(record),createdAt:new Date().toISOString()};
 const correction=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...next,requestHash:requestHash(next)});
 await witness.reserve(operation(correction));await assert.rejects(host(source()).readNative());
 await witness.complete(operation(correction));await assert.rejects(host(source()).readNative());
 const full=source();full.comments.push({...full.comments[0],id:managedCommentId(ids.issue,2),body:renderPrivateComment(correction)});
 assert.equal(validateNative(await host(full).readNative(),policy).record.version,2);
 const receipt=await host(full).readNative();receipt.payload.records[1].input.feedback='TAMPER';assert.throws(()=>validateNative(receipt,policy));
});

test('WITNESSED-INTAKE source correction or authority mode change after approval blocks before GitHub writes; v1 receipt migration is rejected',async()=>{
 for(const change of ['reserved','mode','stale']){
 const f=await workflowFixture();try{
 const w=f.workflow;await w.deliver(ids.issue);const p=(await w.controller.status(ids.issue)).proposalDigest;
 await w.admitDecision(ids.issue,f.add('U000HUMAN','approve '+p));
 if(change==='mode')w.controller.config.inputPolicy={...policy,authority:'ordinary-v1'};
 else if(change==='stale')f.nativeData.comments[0].body+=' ';
 else {const next={...raw,version:2,operationId:randomUUID(),previousRecordHash:privateRecordHash(record),createdAt:new Date().toISOString()};const r=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...next,requestHash:requestHash(next)});await f.witness.reserve(operation(r));}
 await assert.rejects(w.publish(ids.issue,{enabled:true,signingKey:keys.privateKey,github:{origin:f.review.mainOrigin,fixture:true,token:()=> 'SYNTHETIC'}}));
 assert.equal(f.counts().writes,0);assert.equal(f.counts().githubWrites.length,0);
 }finally{await f.cleanup();}
 }
 const {readDelivery}=await import('../scripts/feedback-linear/evidence.ts');
 const payload={eventId:randomUUID(),at:Date.now(),channelId:'C_SYNTHETIC',threadId:'1793733991.000000',proposalDigest:'a'.repeat(64),beforeDigest:'b'.repeat(64),afterDigest:'c'.repeat(64),messageIds:['1793733991.000001','1793733991.000002'],linearCommentId:randomUUID()};
 const receipt={payload,signature:sign(null,Buffer.from(hostCanonical({purpose:'atlas-linear-review-delivery-v1',payload})),keys.privateKey).toString('base64')};
 assert.throws(()=>readDelivery(receipt,policy));
});

test('WITNESSED-INTAKE fresh publication reader rechecks witness after a long Slack/image read',async()=>{
 const f=await workflowFixture();try{
 const w=f.workflow;await w.deliver(ids.issue);const p=(await w.controller.status(ids.issue)).proposalDigest;
 await w.admitDecision(ids.issue,f.add('U000HUMAN','approve '+p));
 const original=w.slack.publicationThread.bind(w.slack),originalRead=w.host.readSource.bind(w.host);let reads=0,release;
 const nativeDone=new Promise(resolve=>{release=resolve;});
 w.host.readSource=async()=>{const result=await originalRead();if(++reads===2)release();return result;};
 w.slack.publicationThread=async(...args)=>{const result=await original(...args);await nativeDone;const next={...raw,version:2,operationId:randomUUID(),previousRecordHash:privateRecordHash(record),createdAt:new Date().toISOString()};const r=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...next,requestHash:requestHash(next)});await f.witness.reserve(operation(r));return result;};
 const job=await w.controller.status(ids.issue),d=JSON.parse((await w.controller.files.artifactBytes(job.deliveryDigest)).toString()).payload;
 await assert.rejects(w.controller.config.readReviewThread({nonce:randomUUID(),requestedAt:Date.now(),channelId:d.channelId,threadId:d.threadId,proposalDigest:p}));
 assert.equal(f.counts().githubWrites.length,0);assert.equal(f.counts().writes,0);
 }finally{await f.cleanup();}
});

test('WITNESSED-INTAKE rejects split HOST/controller witness authorities at construction',async()=>{
 const f=await workflowFixture();try{
 const {HostWorkflow}=await import('../scripts/feedback-linear/host-workflow.ts');
 const foreign=new FileIntakeWitness({root:f.witness.root+'-split',scope:f.witness.scope});
 assert.throws(()=>new HostWorkflow({...f.workflow.config,host:{...f.workflow.config.host,historyWitness:foreign}},f.workflow.ports),/host_blocked:witness_authority_mismatch/);
 }finally{await f.cleanup();}
});

test('WITNESSED-INTAKE pending correction at the first publication write guard prevents every GitHub write',async()=>{
 const f=await workflowFixture();try{
 const w=f.workflow;await w.deliver(ids.issue);const p=(await w.controller.status(ids.issue)).proposalDigest;
 await w.admitDecision(ids.issue,f.add('U000HUMAN','approve '+p));
 const original=w.slack.publicationThread.bind(w.slack);let reads=0;
 w.slack.publicationThread=async(...args)=>{const result=await original(...args);if(++reads===5){const next={...raw,version:2,operationId:randomUUID(),previousRecordHash:privateRecordHash(record),createdAt:new Date().toISOString()};const r=signPrivateRecord({ownerId:ids.owner,sessionKey:session.toString('base64url')},{...next,requestHash:requestHash(next)});await f.witness.reserve(operation(r));}return result;};
 await assert.rejects(w.publish(ids.issue,{enabled:true,signingKey:keys.privateKey,github:{origin:f.review.mainOrigin,fixture:true,token:()=> 'SYNTHETIC'}}));
 assert.equal(reads,5);assert.equal(f.counts().githubWrites.length,0);assert.equal(f.counts().writes,0);
 assert.equal((await w.controller.status(ids.issue)).state,'parked');
 }finally{await f.cleanup();}
});
