import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat, rm, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {generateKeyPairSync, createHmac, sign, createHash} from 'node:crypto';
import {canonical} from '../scripts/feedback/engine.ts';
import {sha256} from '../scripts/feedback/validator.ts';

const moduleUrl = new URL('../scripts/feedback-linear/files.ts', import.meta.url);
test('private atomic state survives a fresh store and rejects concurrent claims', async () => {
  const {PrivateFiles} = await import(moduleUrl.href);
  const root = await mkdtemp(path.join(tmpdir(), 'linear-review-files-'));
  try {
    const a = new PrivateFiles(root), b = new PrivateFiles(root);
    let release;
    const pending = a.lock(async s => {
      s.fence++;
      await a.save(s);
      await new Promise(r => {release = r;});
    });
    while (!release) await new Promise(r => setImmediate(r));
    await assert.rejects(b.lock(async () => {}), /host_locked/);
    release(); await pending;
    assert.equal((await b.read()).fence, 1);
    assert.equal((await stat(path.join(root, 'state.json'))).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(path.join(root, 'state.json'), 'utf8')).fence, 1);
  } finally {await rm(root, {recursive: true, force: true});}
});

const ids = {owner:'11111111-1111-4111-8111-111111111111',project:'22222222-2222-4222-8222-222222222222',team:'33333333-3333-4333-8333-333333333333',feedback:'44444444-4444-4444-8444-444444444444',operation:'55555555-5555-4555-8555-555555555555'};
const host = generateKeyPairSync('ed25519'), capture = generateKeyPairSync('ed25519');
const recordKey = Buffer.alloc(32, 17); // SYNTHETIC key; never a real account secret.
function signed(purpose, payload, privateKey = host.privateKey) {
  return {payload, signature:sign(null, Buffer.from(canonical({purpose,payload})), privateKey).toString('base64')};
}
function native() {
  const input = {feedback:'PRIVATE_NOTE_CANARY',processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/field-velocity',viewport:{width:390,height:1000},theme:'light',element:{selector:'main > h2',tagName:'h2'}}};
  const record = {schema:'atlas-linear-feedback-v1',feedbackId:ids.feedback,version:1,operationId:ids.feedback,ownerLinearId:ids.owner,requestHash:sha256(canonical({feedbackId:ids.feedback,version:1,operationId:ids.feedback,input})),createdAt:new Date().toISOString(),input};
  record.signature = createHmac('sha256', recordKey).update(canonical(record)).digest('hex');
  return signed('atlas-linear-native-read-v1', {readAt:Date.now(),workspace:'synthetic-workspace',issue:{id:ids.feedback,identifier:'SYN-1',url:'https://linear.app/synthetic-workspace/issue/SYN-1',projectId:ids.project,teamId:ids.team},records:[record]});
}
const inputPolicy = {ownerId:ids.owner,workspace:'synthetic-workspace',projectId:ids.project,teamId:ids.team,hostPublicKey:host.publicKey,recordKey};
test('fresh host-attested native chain verifies private signatures, strict schema and scope', async () => {
  const {validateNative} = await import('../scripts/feedback-linear/input.ts');
  const value = native();
  const checked = validateNative(value, inputPolicy);
  assert.equal(checked.record.input.feedback, 'PRIVATE_NOTE_CANARY');
  assert.equal(checked.recordHash, sha256(canonical(value.payload.records[0])));
  for (const mutate of [
    v=>v.payload.records[0].input.feedback='tamper',
    v=>v.payload.records[0].extra=true,
    v=>v.payload.issue.projectId=ids.owner,
    v=>v.payload.readAt=0,
    v=>v.payload.records[0].version=2,
    v=>v.payload.records[0].input.context.element.selector='main#secret',
  ]) {
    const bad = structuredClone(value); mutate(bad);
    const resigned = signed('atlas-linear-native-read-v1', bad.payload);
    assert.throws(()=>validateNative(resigned,inputPolicy), /native_input_rejected/);
  }
});

import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
const g = (cwd,...args)=>execFileSync('/usr/bin/git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function fixture(mode='') {
  const dir=await mkdtemp(path.join(tmpdir(),'linear-review-pipeline-')), repo=path.join(dir,'repo');
  await mkdir(repo); g(repo,'init','-b','main'); g(repo,'config','user.name','Synthetic'); g(repo,'config','user.email','synthetic@example.invalid');
  await mkdir(path.join(repo,'src/components'),{recursive:true});
  await writeFile(path.join(repo,'src/components/landing.css'),'.card { padding: 8px; color: #111; }\n');
  await writeFile(path.join(repo,'.gitignore'),'node_modules/\n');
  await writeFile(path.join(repo,'package.json'),JSON.stringify({scripts:{test:'node -e "process.exit(0)"',typecheck:'node -e "process.exit(0)"',build:'node -e "process.exit(0)"'}}));
  await mkdir(path.join(repo,'node_modules')); g(repo,'add','.'); g(repo,'commit','-m','synthetic trusted baseline');
  const base=g(repo,'rev-parse','HEAD'); const seen=[];
  const gitHash=s=>createHash('sha1').update(s).digest('hex'), blob=s=>gitHash(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(s)}\0`),Buffer.from(s)]));
  const baseTree=g(repo,'rev-parse','HEAD^{tree}');
  const leaves=g(repo,'ls-tree','-r','HEAD').split('\n').map(line=>{const [meta,p]=line.split('\t'),[mode,type,sha]=meta.split(' ');return {path:p,mode,type,sha};});
  const refs=new Map([['main',base]]), trees=new Map([[baseTree,{sha:baseTree,truncated:false,tree:leaves}]]), commits=new Map([[base,{sha:base,tree:{sha:baseTree},parents:[]}]]), prs=[];
  let crash='', beforeFirstWrite;

  const server=createServer(async(req,res)=>{
    let text=''; for await (const chunk of req) text+=chunk;
    seen.push({method:req.method,url:req.url,body:text?JSON.parse(text):undefined});
    res.setHeader('content-type','application/json');
    if(req.url.startsWith('/repos/protocol/neuro-atlas/')) {
      const u=new URL(req.url,'http://synthetic.invalid'), p=u.pathname.replace('/repos/protocol/neuro-atlas',''),data=text?JSON.parse(text):{};let value;
      if(req.method!=='GET'&&beforeFirstWrite){const hook=beforeFirstWrite;beforeFirstWrite=undefined;await hook();}
      if(p.startsWith('/git/ref/heads/')) {const ref=p.slice('/git/ref/heads/'.length);value=refs.has(ref)?{ref:'refs/heads/'+ref,object:{sha:refs.get(ref)}}:undefined;}
      else if(p==='/git/trees'&&req.method==='POST') {const sha=gitHash(text);trees.set(sha,{sha,truncated:false,tree:[...trees.get(data.base_tree).tree.filter(f=>!data.tree.some(n=>n.path===f.path)),...data.tree.map(f=>({path:f.path,mode:f.mode,type:f.type,sha:blob(f.content)}))]});value={sha};}
      else if(p.startsWith('/git/trees/'))value=trees.get(p.split('/').at(-1));
      else if(p==='/git/commits'&&req.method==='POST'){const sha=gitHash(text);value={...data,sha,tree:{sha:data.tree},parents:data.parents.map(sha=>({sha}))};commits.set(sha,value);}
      else if(p.startsWith('/git/commits/'))value=commits.get(p.split('/').at(-1));
      else if(p==='/git/refs'&&req.method==='POST'){refs.set(data.ref.slice(11),data.sha);value={ref:data.ref,object:{sha:data.sha}};}
      else if(p==='/pulls'&&req.method==='GET')value=prs;
      else if(p==='/pulls'&&req.method==='POST'){value={number:1,html_url:'https://github.com/protocol/neuro-atlas/pull/1',state:'open',draft:data.draft,title:data.title,body:data.body,base:{ref:data.base,repo:{full_name:'protocol/neuro-atlas'}},head:{ref:data.head,sha:refs.get(data.head),repo:{full_name:'protocol/neuro-atlas'}}};prs.push(value);}
      else if(p==='/pulls/1'&&req.method==='GET')value=prs[0];
      if(req.method!=='GET'&&p===crash){req.socket.destroy();return;}
      res.statusCode=value===undefined?404:200;return res.end(JSON.stringify(value??{}));
    }
    if(req.url==='/v1/messages') {
      const input=JSON.parse(JSON.parse(text).messages[0].content);
      const file='src/components/landing.css';
      return res.end(JSON.stringify({model:'claude-synthetic',stop_reason:'end_turn',usage:{input_tokens:30,output_tokens:40,...(mode==='unknown-spend'?{unpriced_bill:1}:{})},content:[{type:'text',text:JSON.stringify({baseSha:base,files:[{path:file,beforeSha256:sha256(input.sources[file]),content:mode==='invalid-css'?input.sources[file].replace('.card','.unapproved'):input.sources[file].replace('8px','16px')}]})}]}));
    }
    res.statusCode=404; res.end('{}');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); const origin='http://127.0.0.1:'+server.address().port;
  let current=native();
  const config={readReviewThread:async request=>{
    const state=JSON.parse(await readFile(path.join(config.root,'state.json'),'utf8')),job=state.jobs[ids.feedback];
    const d=JSON.parse(await readFile(path.join(config.root,job.deliveryDigest+'.artifact'),'utf8')).payload;
    const a=JSON.parse(await readFile(path.join(config.root,job.decisionDigest+'.artifact'),'utf8')).payload;
    const messages=[d.threadId,...d.messageIds].map(messageId=>({messageId,speakerId:'B_SYNTHETIC',speakerType:'bot',text:'synthetic delivery'}));
    messages.push({messageId:a.messageId,speakerId:a.speakerId,speakerType:'human',text:'approve '+a.proposalDigest});
    if(mode==='thread-conflict')messages.push({messageId:'1790000000.000005',speakerId:'U_HUMAN',speakerType:'human',text:'I disagree; do not publish.'});
    return signed('atlas-linear-review-thread-v1',{request,readAt:Date.now(),messages,messageCount:messages.length,nextCursor:null});
  },enabled:true,root:path.join(dir,'private'),repo,inputPolicy,channelId:'C_SYNTHETIC',reviewerIds:['U_HUMAN'],capturePublicKey:capture.publicKey,readNative:async()=>current,
    mainOrigin:origin,fixture:true,maxJobUsd:1,maxDayUsd:2,maxTokens:100000,maxWallMs:20000,proposalTtlMs:3600000,
    model:{enabled:true,origin,fixture:true,model:'claude-synthetic',inputUsdPerMillion:1,outputUsdPerMillion:1,maxInputTokens:50000,maxOutputTokens:1000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000},modelKey:()=> 'SYNTHETIC_NOT_A_CREDENTIAL'};
  return {dir,repo,base,seen,config,refs,prs,crash:p=>{crash=p;},beforeFirstWrite:fn=>{beforeFirstWrite=fn;},setNative:v=>{current=v;},cleanup:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}};
}
test('preparation uses actual no-tools HTTP model, old CSS validator and real baseline/candidate subprocesses; persists privately without GitHub writes',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');
  const f=await fixture();
  try {
    const c=new ReviewController(f.config), result=await c.prepare();
    assert.equal(result.state,'awaiting_capture');
    assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
    const request=f.seen.find(x=>x.url==='/v1/messages').body;
    assert.equal(request.tools,undefined); assert.match(request.messages[0].content,/PRIVATE_NOTE_CANARY/);
    const restarted=new ReviewController(f.config), status=await restarted.status(ids.feedback);
    assert.equal(status.state,'awaiting_capture');
    assert.equal(status.candidateDigest,result.candidateDigest);
    const data=JSON.parse(await readFile(path.join(f.config.root,result.candidateDigest+'.artifact'),'utf8'));
    assert.equal(data.patch.files[0].content,'.card { padding: 16px; color: #111; }\n');
    assert.equal(data.checks.baseline.passed,true);assert.equal(data.checks.candidate.passed,true);
    assert.equal(g(f.repo,'branch','--list'),'* main');
    assert.equal((await restarted.prepare()).candidateDigest,result.candidateDigest);
    assert.equal(f.seen.filter(x=>x.url==='/v1/messages').length,1);
  } finally {await f.cleanup();}
});

async function captured(c, f) {
  const candidate=await c.prepare();
  // REAL existing browser PNG bytes; SYNTHETIC capture attestation only, not evidence for this candidate.
  const before=await readFile(new URL('../docs/qa/feedback/hover-mobile-midpage-390.png',import.meta.url));
  const after=await readFile(new URL('../docs/qa/feedback/mobile-anchored-390.png',import.meta.url));
  const artifact=JSON.parse(await readFile(path.join(f.config.root,candidate.candidateDigest+'.artifact'),'utf8'));
  const payload={captureId:ids.operation,at:Date.now(),candidateDigest:candidate.candidateDigest,revision:1,baseSha:f.base,patchDigest:sha256(canonical(artifact.patch)),checksDigest:sha256(canonical(artifact.checks)),route:'/field-velocity',theme:'light',browser:'trusted-parent-browser',before:{digest:sha256(before),width:390,height:1000},after:{digest:sha256(after),width:390,height:1000}};
  const receipt=signed('atlas-linear-capture-v1',payload,capture.privateKey);
  return {candidate,receipt,before,after,proposal:await c.attachCapture(ids.feedback,receipt,before,after)};
}
test('capture import requires trusted signed exact candidate and a matched genuine PNG pair before a review proposal exists',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture();
  try {
    const c=new ReviewController(f.config), cap=await captured(c,f);
    assert.equal(cap.proposal.state,'awaiting_delivery');
    const restart=new ReviewController(f.config);
    assert.equal((await restart.status(ids.feedback)).proposalDigest,cap.proposal.proposalDigest);
    const proposed=JSON.parse(await readFile(path.join(f.config.root,cap.proposal.proposalDigest+'.artifact'),'utf8'));
    assert.equal(proposed.beforeDigest,sha256(cap.before));assert.equal(proposed.afterDigest,sha256(cap.after));
    assert.equal(proposed.inputHash,cap.candidate.inputHash);
    assert.equal(proposed.channelId,'C_SYNTHETIC');
    assert.deepEqual(await restart.image(ids.feedback,'before'),cap.before);
    await assert.rejects(restart.attachCapture(ids.feedback,cap.receipt,cap.after,cap.before),/review_blocked/);
    assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
  } finally {await f.cleanup();}
});

function delivery(proposal) {return signed('atlas-linear-review-delivery-v1',{eventId:ids.operation,at:Date.now(),channelId:'C_SYNTHETIC',threadId:'1790000000.000001',proposalDigest:proposal.proposalDigest,beforeDigest:proposal.beforeDigest,afterDigest:proposal.afterDigest,messageIds:['1790000000.000002','1790000000.000003'],linearCommentId:ids.operation});}
function decision(proposalDigest,override={}) {return signed('atlas-linear-human-decision-v1',{eventId:'66666666-6666-4666-8666-666666666666',at:Date.now(),channelId:'C_SYNTHETIC',threadId:'1790000000.000001',messageId:'1790000000.000004',proposalDigest,decision:'approve',speakerId:'U_HUMAN',speakerType:'human',linearCommentId:ids.operation,...override});}
async function delivered(c,f) {
  const cap=await captured(c,f), proposed=JSON.parse(await readFile(path.join(f.config.root,cap.proposal.proposalDigest+'.artifact'),'utf8'));
  const receipt=delivery({...proposed,proposalDigest:cap.proposal.proposalDigest});
  await c.delivered(ids.feedback,receipt);return {...cap,delivery:receipt};
}
test('only fresh host-authenticated humans in exact delivered private thread can decide; replay and later conflict stop publication',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture();
  try {
    const c=new ReviewController(f.config), cap=await delivered(c,f), digest=cap.proposal.proposalDigest;
    for(const changes of [{speakerType:'bot'},{speakerId:'U_OUTSIDER'},{channelId:'C_OTHER'},{threadId:'1790000000.000009'},{proposalDigest:'0'.repeat(64)},{at:0}]) {
      await assert.rejects(c.decide(ids.feedback,decision(digest,changes)),/review_blocked/);
      assert.equal((await c.status(ids.feedback)).state,'awaiting_review');
    }
    const approval=decision(digest);
    assert.equal((await c.decide(ids.feedback,approval)).state,'approved');
    const restarted=new ReviewController(f.config);
    await assert.rejects(restarted.decide(ids.feedback,approval),/review_blocked/);
    assert.equal((await restarted.status(ids.feedback)).state,'approved');
    assert.equal((await restarted.decide(ids.feedback,decision(digest,{decision:'reject',eventId:'77777777-7777-4777-8777-777777777777'}))).state,'conflicted');
    assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
  } finally {await f.cleanup();}
});

const publishingKeys=generateKeyPairSync('ed25519');
function publisher(f,onLoad=()=>{}) {return {enabled:true,signingKey:publishingKeys.privateKey,github:{origin:f.config.mainOrigin,fixture:true,token:()=>{onLoad();return 'SYNTHETIC_PUBLISHER';}}};}
test('independent approval gate precedes every publisher credential and write; only checked generic draft is published',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture();
  try {
    const c=new ReviewController(f.config), cap=await delivered(c,f);let loads=0;
    const options=publisher(f,()=>loads++);
    await assert.rejects(c.publish(ids.feedback,options),/review_blocked/);assert.equal(loads,0);
    await c.decide(ids.feedback,decision(cap.proposal.proposalDigest));
    const result=await new ReviewController(f.config).publish(ids.feedback,options);
    assert.equal(result.state,'published');assert.equal(result.result.number,1);
    assert.equal(f.prs.length,1);assert.equal(f.prs[0].draft,true);
    assert.equal((await c.status(ids.feedback)).publication.phase,'pr_ready');
    const writes=f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages');assert.equal(writes.length,4);
    for(const secret of ['PRIVATE_NOTE_CANARY','main > h2',cap.proposal.proposalDigest])assert.ok(!JSON.stringify(writes).includes(secret));
    await assert.rejects(c.publish(ids.feedback,options),/review_blocked/);
    assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,4);
  } finally {await f.cleanup();}
});

test('actual backend signPrivateRecord codec is accepted without adapting its signature or hashes',async()=>{
  const backend=await import('../src/lib/feedback-linear/server/records.ts');
  const {validateNative}=await import('../scripts/feedback-linear/input.ts');
  const session=Buffer.alloc(32,31),policy={...inputPolicy,recordKey:createHmac('sha256',session).update('atlas-linear-private-v1').digest()};
  const value=native(),raw={...value.payload.records[0],operationId:ids.feedback};delete raw.signature;
  raw.requestHash=backend.requestHash(raw);
  const config={ownerId:ids.owner,sessionKey:session.toString('base64url')};
  const record=backend.signPrivateRecord(config,raw);
  const read=signed('atlas-linear-native-read-v1',{...value.payload,records:[record]});
  const checked=validateNative(read,policy);
  assert.equal(checked.recordHash,backend.privateRecordHash(record));
  assert.deepEqual(checked.record,record);
  const next={...raw,version:2,operationId:ids.operation,previousRecordHash:backend.privateRecordHash(record)};
  next.requestHash=backend.requestHash(next);
  const second=backend.signPrivateRecord(config,next);
  const followup=validateNative(signed('atlas-linear-native-read-v1',{...value.payload,records:[record,second]}),policy);
  assert.equal(followup.record.version,2);assert.equal(followup.recordHash,backend.privateRecordHash(second));
});

test('loss of a previously initialized manifest never resets fences, spending or replay memory',async()=>{
  const {PrivateFiles}=await import('../scripts/feedback-linear/files.ts');const root=await mkdtemp(path.join(tmpdir(),'linear-lost-state-'));
  try {
    const store=new PrivateFiles(root);await store.lock(async s=>{s.fence=7;await store.save(s);});
    await rm(path.join(root,'state.json'));
    await assert.rejects(new PrivateFiles(root).read(),/private_state_invalid/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('operator CLI is disabled with no configuration or flags; public-shaped booleans are not authority',async()=>{
  const {runtimeMain}=await import('../scripts/feedback-linear/runtime.ts');
  assert.deepEqual(await runtimeMain(['prepare'],{}),{state:'disabled'});
  assert.deepEqual(await runtimeMain(['publish',ids.feedback],{ATLAS_LINEAR_REVIEW_PUBLISH_ENABLED:'true'}),{state:'disabled'});
  await assert.rejects(runtimeMain(['decide',ids.feedback],{ATLAS_LINEAR_REVIEW_ENABLED:'true'}),/runtime_blocked/);
  const output=execFileSync(process.execPath,['--import','tsx','scripts/feedback-linear/runtime.ts','prepare'],{cwd:new URL('..',import.meta.url),env:{PATH:process.env.PATH},encoding:'utf8'});
  assert.deepEqual(JSON.parse(output),{state:'disabled'});
});

test('scope lookalike URLs, userinfo, other workspace/identifier and query strings are never native issue identity',async()=>{
  const {validateNative}=await import('../scripts/feedback-linear/input.ts');
  for(const url of ['https://linear.app.evil.invalid/synthetic-workspace/issue/SYN-1','https://linear.app/other/issue/SYN-1','https://linear.app/synthetic-workspace/issue/SYN-2','https://user@linear.app/synthetic-workspace/issue/SYN-1','https://linear.app/synthetic-workspace/issue/SYN-1?x=1']) {
    const v=native();v.payload.issue.url=url;
    assert.throws(()=>validateNative(signed('atlas-linear-native-read-v1',v.payload),inputPolicy),/native_input_rejected/);
  }
});
test('unknown model spend retains durable worst-case reservation and never retries after restart',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture('unknown-spend');
  try {
    const c=new ReviewController(f.config);await assert.rejects(c.prepare(),/review_blocked/);
    const state=JSON.parse(await readFile(path.join(f.config.root,'state.json'),'utf8'));
    assert.equal(state.spend.length,1);assert.equal(state.spend[0].actual,undefined);assert.ok(state.spend[0].upper>0);
    assert.equal((await c.status(ids.feedback)).state,'parked');
    await assert.rejects(new ReviewController(f.config).prepare(),/review_blocked/);
    assert.equal(f.seen.filter(x=>x.url==='/v1/messages').length,1);
  } finally {await f.cleanup();}
});
test('actual old validator rejects a model selector change without a candidate or publication',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture('invalid-css');
  try {
    const c=new ReviewController(f.config);await assert.rejects(c.prepare(),/review_blocked/);
    assert.equal((await c.status(ids.feedback)).candidateDigest,undefined);
    assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
  } finally {await f.cleanup();}
});
test('changed main or paired image bytes after approval block before publisher credentials',async t=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');
  for(const change of ['main','image','input','control'])await t.test(change,async()=>{
    const f=await fixture();try {
      const c=new ReviewController(f.config),cap=await delivered(c,f);await c.decide(ids.feedback,decision(cap.proposal.proposalDigest));
      if(change==='main')f.refs.set('main','a'.repeat(40));
      if(change==='image') {const p=cap.receipt.payload.before.digest;await writeFile(path.join(f.config.root,p+'.artifact'),Buffer.from('corrupt'));}
      if(change==='input') {const current=native();current.payload.records[0].input.feedback='changed';f.setNative(signed('atlas-linear-native-read-v1',current.payload));}
      if(change==='control')f.config.enabled=false;
      let loads=0;await assert.rejects(c.publish(ids.feedback,publisher(f,()=>loads++)));assert.equal(loads,0);
      assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
    } finally {await f.cleanup();}
  });
});
test('lost replies after each publication write boundary park durably; no automatic retry or duplicate side effect',async t=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');
  for(const boundary of ['/git/trees','/git/commits','/git/refs','/pulls'])await t.test(boundary,async()=>{
    const f=await fixture();try {
      const c=new ReviewController(f.config),cap=await delivered(c,f);await c.decide(ids.feedback,decision(cap.proposal.proposalDigest));
      f.crash(boundary);await assert.rejects(c.publish(ids.feedback,publisher(f)),/review_blocked/);
      const restart=new ReviewController(f.config);assert.equal((await restart.status(ids.feedback)).state,'parked');
      const count=f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length;
      let loads=0;await assert.rejects(restart.publish(ids.feedback,publisher(f,()=>loads++)),/review_blocked/);
      assert.equal(loads,0);assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,count);
      if(boundary==='/pulls')assert.equal(f.prs.length,1); // Real synthetic remote accepted it; controller MUST NOT claim success.
    } finally {await f.cleanup();}
  });
});
test('SIGKILL leaves a durable orphan lock, fence and in-progress state; another process cannot take over',async()=>{
  const {PrivateFiles}=await import('../scripts/feedback-linear/files.ts');const dir=await mkdtemp(path.join(tmpdir(),'linear-kill-'));
  let child;try {
    const source=`import {PrivateFiles} from ${JSON.stringify(moduleUrl.href)};const f=new PrivateFiles(${JSON.stringify(dir)});await f.lock(async s=>{s.fence=19;s.jobs.x={state:'preparing'};await f.save(s);process.stdout.write('READY');await new Promise(()=>setInterval(()=>{},1000));});`;
    child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',source],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(new Error('child exited before claim')));});
    const exit=once(child,'exit');child.kill('SIGKILL');await exit;
    const store=new PrivateFiles(dir);assert.equal((await store.read()).fence,19);assert.equal((await store.read()).jobs.x.state,'preparing');
    await assert.rejects(store.lock(async()=>{}),/host_locked/);
  } finally {child?.kill('SIGKILL');await rm(dir,{recursive:true,force:true});}
});

test('capturePlan exposes only the exact revalidated awaiting-capture candidate to the trusted adapter',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture();
  try {
    const c=new ReviewController(f.config),job=await c.prepare(),plan=await c.capturePlan(ids.feedback);
    assert.equal(plan.candidateDigest,job.candidateDigest);assert.equal(plan.candidate.baseSha,f.base);
    f.refs.set('main','a'.repeat(40));await assert.rejects(c.capturePlan(ids.feedback),/review_blocked/);
  } finally {await f.cleanup();}
});

test('earlier approval cannot publish over fresh unresolved disagreement in the exact complete private thread',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture('thread-conflict');
  try {
    const c=new ReviewController(f.config),cap=await delivered(c,f);await c.decide(ids.feedback,decision(cap.proposal.proposalDigest));
    let loads=0;await assert.rejects(c.publish(ids.feedback,publisher(f,()=>loads++)),/review_blocked/);assert.equal(loads,0);
    assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
  } finally {await f.cleanup();}
});

test('standalone publication CLI blocks without a live qualified host thread reader before loading configuration or secrets',async()=>{
  const {runtimeMain}=await import('../scripts/feedback-linear/runtime.ts');let configReads=0;
  const env={ATLAS_LINEAR_REVIEW_ENABLED:'true',ATLAS_LINEAR_REVIEW_PUBLISH_ENABLED:'true',get ATLAS_LINEAR_REVIEW_CONFIG(){configReads++;return '/no-adapter';}};
  await assert.rejects(runtimeMain(['publish',ids.feedback],env),/runtime_blocked/);assert.equal(configReads,0);
});

test('corrupt or unpriced durable reservation values cannot become a zero-cost accounting reset',async()=>{
  const {PrivateFiles}=await import('../scripts/feedback-linear/files.ts');const root=await mkdtemp(path.join(tmpdir(),'linear-bad-spend-'));
  try {
    const f=new PrivateFiles(root);await f.lock(async s=>{s.spend.push({id:ids.operation,day:'2026-11-04',job:ids.feedback,upper:0.5,tokens:100,actual:null});await f.save(s);});
    await assert.rejects(f.read(),/private_state_invalid/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('fresh full-thread read repeats at first remote write, not just when an old approval was loaded',async()=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');const f=await fixture();
  try {
    const realReader=f.config.readReviewThread;let reads=0;
    f.config.readReviewThread=async request=>{const receipt=await realReader(request);reads++;if(reads>=5){receipt.payload.messages.push({messageId:'1790000000.000005',speakerId:'U_HUMAN',speakerType:'human',text:'reject '+request.proposalDigest});receipt.payload.messageCount++;return signed('atlas-linear-review-thread-v1',receipt.payload);}return receipt;};
    const c=new ReviewController(f.config),cap=await delivered(c,f);await c.decide(ids.feedback,decision(cap.proposal.proposalDigest));
    await assert.rejects(c.publish(ids.feedback,publisher(f)),/review_blocked/);
    assert.ok(reads>=5);assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
  } finally {await f.cleanup();}
});
test('cached nonce, incomplete pagination or mismatched thread count cannot authorize publication',async t=>{
  const {ReviewController}=await import('../scripts/feedback-linear/controller.ts');
  for(const mode of ['nonce','pagination','count','missing-adapter'])await t.test(mode,async()=>{
    const f=await fixture();try {
      const reader=f.config.readReviewThread;
      f.config.readReviewThread=mode==='missing-adapter'?undefined:async request=>{
        const snapshot=(await reader(request)).payload;
        if(mode==='nonce')snapshot.request={...request,nonce:ids.operation};
        if(mode==='pagination')snapshot.nextCursor='another-page';
        if(mode==='count')snapshot.messageCount++;
        return signed('atlas-linear-review-thread-v1',snapshot);
      };
      const c=new ReviewController(f.config),cap=await delivered(c,f);await c.decide(ids.feedback,decision(cap.proposal.proposalDigest));
      let loads=0;await assert.rejects(c.publish(ids.feedback,publisher(f,()=>loads++)));assert.equal(loads,0);
      assert.equal(f.seen.filter(x=>x.method!=='GET'&&x.url!=='/v1/messages').length,0);
    }finally {await f.cleanup();}
  });
});
