import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {randomUUID,generateKeyPairSync,createHmac,sign} from 'node:crypto';
import {canonical} from '../scripts/feedback/engine.ts';
import {sha256} from '../scripts/feedback/validator.ts';
import {ReviewController} from '../scripts/feedback-linear/controller.ts';
const host=generateKeyPairSync('ed25519'),key=Buffer.alloc(32,71); // Synthetic only.
const ids={owner:'11111111-1111-4111-8111-111111111111',project:'22222222-2222-4222-8222-222222222222',team:'33333333-3333-4333-8333-333333333333'};
const g=(cwd,...args)=>execFileSync('/usr/bin/git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export async function fixture(mode='') {
  const dir=await mkdtemp(path.join(tmpdir(),'astra-core-')),repo=path.join(dir,'repo');
  await mkdir(path.join(repo,'src/components'),{recursive:true});await mkdir(path.join(repo,'node_modules'));
  await writeFile(path.join(repo,'src/components/landing.css'),'.card { padding: 8px; }\n');
  await writeFile(path.join(repo,'.gitignore'),'node_modules/\n');
  await writeFile(path.join(repo,'package.json'),JSON.stringify({scripts:{test:'node -e "process.exit(0)"',typecheck:'node -e "process.exit(0)"',build:'node -e "process.exit(0)"'}}));
  g(repo,'init','-b','main');g(repo,'config','user.name','Synthetic');g(repo,'config','user.email','synthetic@example.invalid');g(repo,'add','.');g(repo,'commit','-m','synthetic baseline');
  const base=g(repo,'rev-parse','HEAD'),seen=[];let id=randomUUID();
  const root=path.join(dir,'private');
  const server=createServer(async(req,res)=>{
    if(req.method==='GET'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({ref:'refs/heads/main',object:{sha:base}}));}
    let text='';for await(const c of req)text+=c;const body=JSON.parse(text);seen.push(body);
    const state=JSON.parse(await readFile(path.join(root,'state.json'),'utf8'));
    assert.equal(state.attempts.filter(a=>a.job===id).length,1,'durable slot BEFORE model peer');assert.equal(state.spend.length,0);
    if(mode==='ambiguous'){req.socket.destroy();return;}
    const source=JSON.parse(body.input[0].content).sources['src/components/landing.css'];
    const patch={baseSha:base,files:[{path:'src/components/landing.css',beforeSha256:sha256(source),content:mode==='invalid-css'?source.replace('.card','.unapproved'):source.replace('8px','16px')}]};
    res.setHeader('content-type','application/json');res.end(JSON.stringify({provider:'hermes-astra',account:'hermes-default-openai-codex',model:'gpt-6-astra',status:'completed',output:[{type:'text',text:JSON.stringify(patch)}],usage:{inputTokens:100,outputTokens:100}}));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  function native(){
    const input={feedback:'SYNTHETIC_PRIVATE_CANARY',processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/field-velocity',viewport:{width:390,height:1000},theme:'light',element:{selector:'main > h2',tagName:'h2'}}};
    const record={schema:'atlas-linear-feedback-v1',feedbackId:id,version:1,operationId:id,ownerLinearId:ids.owner,requestHash:sha256(canonical({feedbackId:id,version:1,operationId:id,input})),createdAt:new Date().toISOString(),input};
    record.signature=createHmac('sha256',key).update(canonical(record)).digest('hex');
    const payload={readAt:Date.now(),workspace:'synthetic',issue:{id,identifier:'SYN-1',url:'https://linear.app/synthetic/issue/SYN-1',projectId:ids.project,teamId:ids.team},records:[record]};
    // Keep record creation stable across the multiple fresh native reads.
    return {payload,signature:sign(null,Buffer.from(canonical({purpose:'atlas-linear-native-read-v1',payload})),host.privateKey).toString('base64')};
  }
  let current=native();
  const config={enabled:true,root,repo,provider:'hermes-astra',budget:{kind:'attempts',maxAttemptsPerDay:5,timeZone:'Europe/Berlin'},inputPolicy:{ownerId:ids.owner,workspace:'synthetic',projectId:ids.project,teamId:ids.team,hostPublicKey:host.publicKey,recordKey:key},channelId:'C_SYNTHETIC',reviewerIds:['U_SYNTHETIC'],capturePublicKey:host.publicKey,readNative:async()=>current,mainOrigin:origin,fixture:true,maxTokens:100000,maxWallMs:20000,proposalTtlMs:3600000,model:{enabled:true,account:'hermes-default-openai-codex',model:'gpt-6-astra',maxTurns:1,maxInputTokens:50000,maxOutputTokens:1000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000,fixture:true,fixtureOrigin:origin}};
  return {config,seen,get id(){return id;},next:()=>{id=randomUUID();current=native();},refresh:()=>{const payload={...current.payload,readAt:Date.now()};current={payload,signature:sign(null,Buffer.from(canonical({purpose:'atlas-linear-native-read-v1',payload})),host.privateKey).toString('base64')};},close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}};
}

test('non-fixture automation is mechanically blocked without independent monotonic history proof before any input or claim',async()=>{
  const f=await fixture();let reads=0;
  try {
    const c=new ReviewController({...f.config,fixture:false,mainOrigin:'https://api.github.com',readNative:async()=>{reads++;throw Error('must not read');}});
    await assert.rejects(c.prepare(),/native_history_witness_unavailable/);
    assert.throws(()=>c.assertHistoryWitness(),/native_history_witness_unavailable/);
    assert.equal(reads,0);assert.equal(f.seen.length,0);
    await assert.rejects(readFile(path.join(f.config.root,'state.json')),/ENOENT/);
  }finally{await f.close();}
});

test('quota-limited unattempted proposal defers before claim and remains eligible next day without refunding prior slots',async()=>{
  const f=await fixture(),clock=Date.now;let at=clock();Date.now=()=>at;
  try {
    const c=new ReviewController(f.config);
    await c.files.lock(async state=>{for(let i=0;i<5;i++)await c.files.reserveAttempt(state,{job:randomUUID(),tokens:100,budget:f.config.budget,provider:'hermes-astra',account:f.config.model.account,model:f.config.model.model,policyDigest:'a'.repeat(64)});});
    const before=await c.files.read();
    assert.deepEqual(await c.prepare(),{state:'deferred',reason:'daily_attempt_quota'});
    const deferred=await c.files.read();assert.equal(deferred.jobs[f.id],undefined);assert.equal(deferred.fence,before.fence);assert.equal(f.seen.length,0);
    at+=86400000;f.refresh();
    const job=await new ReviewController(f.config).prepare();assert.equal(job.state,'awaiting_capture');assert.equal(f.seen.length,1);
    const final=await c.files.read();assert.equal(final.attempts.length,6);assert.deepEqual(final.attempts.slice(0,5),before.attempts);
  }finally{Date.now=clock;await f.close();}
});

test('five ambiguous calls consume all slots; restart/replay/sixth proposal cannot make another request',async()=>{
  const f=await fixture('ambiguous');
  try {
    for(let i=0;i<5;i++) {
      await assert.rejects(new ReviewController(f.config).prepare(),/review_blocked/);
      await assert.rejects(new ReviewController(f.config).prepare(),/review_blocked/);
      f.next();
    }
    assert.deepEqual(await new ReviewController(f.config).prepare(),{state:'deferred',reason:'daily_attempt_quota'});
    assert.equal(f.seen.length,5);
    const state=await new ReviewController(f.config).files.read();assert.equal(state.attempts.length,5);assert.equal(state.spend.length,0);
    for(const row of state.attempts){assert.equal(row.status,'reserved');assert.equal(row.chargedUsd,null);assert.equal(row.usage,undefined);}
  } finally {await f.close();}
});

test('actual old CSS validator rejects selector replacement in count mode; slot is never refunded',async()=>{
  const f=await fixture('invalid-css');
  try {
    const c=new ReviewController(f.config);await assert.rejects(c.prepare(),/review_blocked/);
    assert.equal((await c.status(f.id)).candidateDigest,undefined);assert.equal((await c.files.read()).attempts.length,1);
    await assert.rejects(new ReviewController(f.config).prepare(),/review_blocked/);assert.equal(f.seen.length,1);
  } finally {await f.close();}
});

test('native provider remains held by unresolved history without reading feedback, running checks or claiming a proposal',async()=>{
  const f=await fixture();let reads=0;
  try {
    const model={...f.config.model};delete model.fixture;delete model.fixtureOrigin;
    const c=new ReviewController({...f.config,fixture:false,mainOrigin:'https://api.github.com',model,readNative:async()=>{reads++;throw new Error('must not read');}});
    await assert.rejects(c.prepare(),/native_history_witness_unavailable/);
    assert.equal(reads,0);assert.equal(f.seen.length,0);
    await assert.rejects(readFile(path.join(f.config.root,'state.json')),/ENOENT/);
  } finally {await f.close();}
});

test('approval-bound candidate stops when quota policy changes, before any capture/publication',async()=>{
  const f=await fixture();
  try {
    const original=new ReviewController(f.config);await original.prepare();
    assert.ok((await original.capturePlan(f.id)).candidateDigest);
    const changed=new ReviewController({...f.config,budget:{...f.config.budget,maxAttemptsPerDay:4}});
    await assert.rejects(changed.capturePlan(f.id),/review_blocked/);
    assert.equal(f.seen.length,1);
  } finally {await f.close();}
});

test('subscription controller prepares via real CSS validator/check subprocesses with one durable count and no dollar/key fields',async()=>{
  const f=await fixture();
  try {
    const c=new ReviewController(f.config),job=await c.prepare();assert.equal(job.state,'awaiting_capture');
    const state=await c.files.read(),row=state.attempts[0];assert.equal(row.status,'completed');assert.deepEqual(row.usage,{inputTokens:100,outputTokens:100});assert.equal(row.chargedUsd,null);assert.equal(state.spend.length,0);
    const candidate=JSON.parse((await c.files.artifactBytes(job.candidateDigest)).toString());assert.equal(candidate.patch.files[0].content,'.card { padding: 16px; }\n');assert.equal(candidate.checks.candidate.passed,true);
    assert.equal((await new ReviewController(f.config).prepare()).candidateDigest,job.candidateDigest);assert.equal(f.seen.length,1);
    assert.equal(f.config.maxJobUsd,undefined);assert.equal(f.config.modelKey,undefined);
  } finally {await f.close();}
});
