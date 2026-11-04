import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setup} from './feedback-worker-pg.test.mjs';
import {createFeedbackIntake} from '../src/lib/feedback/intake.ts';
import {PgWorkStore} from '../scripts/feedback/pg-store.ts';

const actor={githubId:82394590,login:'synthetic-owner'};
const input={privateComment:'PRIVATE_FOLLOWUP_CANARY',publicTask:{title:'Spacing',summary:'Increase spacing',acceptance:['Readable']},publicApproval:{approved:true,policyVersion:'atlas-feedback-v1'},context:{route:'/',viewport:{width:1000,height:800},theme:'light'}};
async function enable(db){await db.query('UPDATE atlas_feedback.control SET enabled=true,allowed_owner_id=82394590,max_job_usd=1,max_day_usd=2,max_tokens=10000,max_turns=2,max_wall_seconds=120,max_attempts=2');}

test('followup crossing each partial publication parks before inference and fences the old writer without erasing evidence',async t=>{
  const f=await setup(t);await enable(f.db);
  const simple={feedback:'PRIVATE_PARTIAL_CANARY',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context:{...input.context,element:{selector:'html > body > button',tagName:'button'}}};
  for(const [phase,body] of ['reserved','commit_created','ref_written'].flatMap(phase=>[input,simple].map(body=>[phase,body]))){
    const intake=createFeedbackIntake(f.db,()=>new Date()),first=await intake.create(actor,randomUUID(),body),store=new PgWorkStore(f.db,{trustedBaseSha:'a'.repeat(40)}),cap=await store.acquire();
    assert.equal(cap.feedbackId,first.id);
    await f.db.query("UPDATE atlas_feedback.jobs SET state='publishing' WHERE id=$1",[cap.jobId]);
    await f.db.query("UPDATE atlas_feedback.feedback SET state='publishing' WHERE id=$1",[first.id]);
    await f.db.query('INSERT INTO atlas_feedback.publications(feedback_id,branch,candidate_digest,phase,version,commit_sha) VALUES($1,$2,$3,$4,1,$5)',[first.id,'atlas-feedback/'+first.id,'d'.repeat(64),phase,phase==='reserved'?null:'c'.repeat(40)]);
    const evidence=(await f.db.query('SELECT * FROM atlas_feedback.publications WHERE feedback_id=$1',[first.id])).rows[0];
    const key=randomUUID(),followup={...body,expectedVersion:1};
    const next=await intake.followup(actor,first.id,key,followup);
    assert.equal(next.state,'needs_human_review',phase);assert.equal(next.version,2);
    assert.equal((await intake.status(actor,first.id)).reasonCode,'partial_publication_followup');
    assert.deepEqual(await intake.followup(actor,first.id,key,followup),next);
    await assert.rejects(store.assertActive(cap),/fenced/);
    assert.equal(await store.acquire(),null);
    assert.equal((await f.db.query('SELECT state FROM atlas_feedback.jobs WHERE feedback_id=$1 AND input_version=2',[first.id])).rows[0].state,'parked');
    assert.deepEqual((await f.db.query('SELECT * FROM atlas_feedback.publications WHERE feedback_id=$1',[first.id])).rows[0],evidence);
    assert.equal((await f.db.query('SELECT * FROM atlas_feedback.worker_reservations')).rows.length,0);
  }
});

test('direct pending successor of each partial publication is parked by acquisition before a capability or spend exists',async t=>{
  const f=await setup(t);await enable(f.db);
  for(const phase of ['reserved','commit_created','ref_written']){
    const {id,job:oldJob}=await f.seed(),job=randomUUID();
    await f.db.query("UPDATE atlas_feedback.jobs SET state='cancelled' WHERE id=$1",[oldJob]);
    await f.db.query("UPDATE atlas_feedback.feedback SET version=2 WHERE id=$1",[id]);
    await f.db.query("INSERT INTO atlas_feedback.jobs(id,feedback_id,input_version,approval_hash,payload) SELECT $2,feedback_id,2,approval_hash,jsonb_set(payload,'{inputVersion}','2') FROM atlas_feedback.jobs WHERE id=$1",[oldJob,job]);
    await f.db.query('INSERT INTO atlas_feedback.publications(feedback_id,branch,candidate_digest,phase,version) VALUES($1,$2,$3,$4,1)',[id,'atlas-feedback/'+id,'d'.repeat(64),phase]);
    const store=new PgWorkStore(f.db,{trustedBaseSha:'a'.repeat(40)});
    assert.equal(await store.acquire(),null,phase);
    assert.equal((await f.db.query('SELECT state,last_reason_code FROM atlas_feedback.feedback WHERE id=$1',[id])).rows[0].state,'needs_human_review');
    assert.equal((await f.db.query('SELECT state,last_reason_code FROM atlas_feedback.jobs WHERE id=$1',[job])).rows[0].last_reason_code,'partial_publication_followup');
  }
});

import {generateKeyPairSync,createHash} from 'node:crypto';
import http from 'node:http';
import {AnthropicModel} from '../scripts/feedback/model.ts';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fixture} from './feedback-worker-git.test.mjs';
import {githubFixture} from './feedback-publish-http.test.mjs';
import {git,loadSnapshot} from '../scripts/feedback/git-sandbox.ts';
import {sha256} from '../scripts/feedback/validator.ts';
import {runOne} from '../scripts/feedback/engine.ts';
import {publishBundle} from '../scripts/feedback/publisher.ts';
const blob=s=>createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(s)}\0`)).update(s).digest('hex');

async function followupPipeline(t,sameFile=false,unsafeHistory){
  const f=await setup(t),{cwd}=await fixture(t),keys=generateKeyPairSync('ed25519');await enable(f.db);
  const firstPath='src/components/landing.css',secondPath=sameFile?firstPath:'src/components/google-trends.css';
  // Both properties already exist: the followup changes margin, not the approved gap.
  const original='.card { gap: 8px; margin: 4px; }\n',approved='.card { gap: 12px; margin: 4px; }\n';
  await writeFile(path.join(cwd,firstPath),original);
  await writeFile(path.join(cwd,'src/components/google-trends.css'),original);
  await writeFile(path.join(cwd,'package.json'),JSON.stringify({scripts:{test:'node check.cjs',typecheck:'node check.cjs',build:'node check.cjs'}}));
  await writeFile(path.join(cwd,'check.cjs'),"const fs=require('fs');const a=fs.readFileSync('src/components/landing.css','utf8'),b=fs.readFileSync('src/components/google-trends.css','utf8');if((a.includes('margin: 8px')||b.includes('margin: 8px'))&&!a.includes('gap: 12px'))process.exit(3)");
  await git(cwd,['add','.']);await git(cwd,['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','-qm','trusted followup fixture']);
  const base=(await git(cwd,['rev-parse','HEAD'])).trim(),sources=await loadSnapshot(cwd,base),remote=await githubFixture(t,base);
  const baseTree=remote.trees.get('b'.repeat(40));baseTree.tree=baseTree.tree.filter(f=>f.path!==firstPath);
  for(const name of [firstPath,'src/components/google-trends.css'])baseTree.tree.push({path:name,mode:'100644',type:'blob',sha:blob(original)});
  const intake=createFeedbackIntake(f.db,()=>new Date()),first=await intake.create(actor,randomUUID(),input);let calls=0;
  const observed=[];
  const provider=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;
    assert.ok(!raw.includes('PRIVATE_FOLLOWUP_CANARY'));assert.equal(req.url,'/v1/messages');
    const request=JSON.parse(JSON.parse(raw).messages[0].content);calls++;observed.push(request.sources);
    const name=calls===1?firstPath:secondPath;
    const patch={baseSha:base,files:[{path:name,beforeSha256:request.sourceHashes[name],content:calls===1?approved:request.sources[name].replace('margin: 4px','margin: 8px')}]};
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({model:'claude-synthetic',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100,cache_creation_input_tokens:0,cache_read_input_tokens:0,service_tier:'standard'},content:[{type:'text',text:JSON.stringify(patch)}]}));
  });
  await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>provider.close(resolve)));
  const model=new AnthropicModel({enabled:true,fixture:true,origin:`http://127.0.0.1:${provider.address().port}`,model:'claude-synthetic',inputUsdPerMillion:3,outputUsdPerMillion:15,maxInputTokens:8000,maxOutputTokens:1000,maxBodyBytes:16000,maxResponseBytes:40000,timeoutMs:5000},()=> 'SYNTHETIC_KEY');
  const run=async()=>runOne({enabled:true,store:new PgWorkStore(f.db,{trustedBaseSha:base}),cwd,model,signingKey:keys.privateKey,maxWallMs:60000});
  const publish=async version=>{const job=(await f.db.query('SELECT id FROM atlas_feedback.jobs WHERE feedback_id=$1 AND input_version=$2',[first.id,version])).rows[0];const store=new PgWorkStore(f.db,{trustedBaseSha:base,publisherInstanceId:randomUUID()}),bundle=await store.loadBundle(job.id);await publishBundle({enabled:true,bundle,publicKey:keys.publicKey,sources,store,github:{origin:remote.origin,fixture:true,token:()=> 'SYNTHETIC_TOKEN'}});return bundle;};
  assert.equal((await run()).state,'publishing');const prior=await publish(1),priorHead=(await intake.status(actor,first.id)).pr.headSha;
  await git(cwd,['reset','--hard',base]);
  assert.equal((await intake.followup(actor,first.id,randomUUID(),{...input,expectedVersion:1,publicTask:{...input.publicTask,summary:'Keep the approved gap; increase the margin.'}})).state,'queued');
  if(unsafeHistory){
    if(unsafeHistory==='missing_bundle')await f.db.query('DELETE FROM atlas_feedback.worker_bundles WHERE job_id=$1',[prior.receipt.jobId]);
    if(unsafeHistory==='missing_publication')await f.db.query('DELETE FROM atlas_feedback.publications WHERE feedback_id=$1',[first.id]);
    const store=new PgWorkStore(f.db,{trustedBaseSha:unsafeHistory==='moved_main'?'a'.repeat(40):base});
    const result=await runOne({enabled:true,store,cwd,model,signingKey:unsafeHistory==='signature'?generateKeyPairSync('ed25519').privateKey:keys.privateKey,maxWallMs:60000});
    assert.equal(result.state,unsafeHistory==='signature'?'needs_human_review':'idle');
    assert.equal((await intake.status(actor,first.id)).state,'needs_human_review');
    assert.equal(calls,1,'unsafe history must park before inference');
    assert.equal((await f.db.query('SELECT * FROM atlas_feedback.worker_reservations')).rows.length,1,'no second reservation');
    return;
  }
  assert.equal((await run()).state,'publishing');const next=await publish(2);
  assert.equal(calls,2);assert.equal(remote.prs.length,1);assert.equal(observed[1][firstPath],approved,'model receives the previously approved draft, not bare main');
  const status=await intake.status(actor,first.id),commit=remote.commits.get(status.pr.headSha),tree=remote.trees.get(commit.tree.sha);
  assert.equal(commit.parents[0].sha,priorHead);
  const expectedFirst=sameFile?approved.replace('margin: 4px','margin: 8px'):approved;
  assert.equal(tree.tree.find(f=>f.path===firstPath).sha,blob(expectedFirst));
  assert.equal(tree.tree.find(f=>f.path===secondPath).sha,blob(sameFile?expectedFirst:original.replace('margin: 4px','margin: 8px')));
  assert.equal(next.patch.files.find(f=>f.path===firstPath).beforeSha256,sha256(original));
  assert.notEqual(next.receipt.approvalHash,prior.receipt.approvalHash);assert.notEqual(next.signature,prior.signature);
  assert.ok(!JSON.stringify(remote.writes).includes('PRIVATE_FOLLOWUP_CANARY'));
}
test('two-file incremental followup preserves the previous draft through real intake, checks, durable bundles and GitHub HTTP publication',async t=>followupPipeline(t));

test('same-file incremental followup keeps the approved property while editing another through the full pipeline',async t=>followupPipeline(t,true));

for(const history of ['moved_main','missing_bundle','missing_publication','signature'])test(`unprovable followup history (${history}) parks before inference`,async t=>followupPipeline(t,false,history));

import {sign} from 'node:crypto';
import {bundleFixture} from './feedback-publish-http.test.mjs';
import {canonical,approvalHash} from '../scripts/feedback/engine.ts';
test('expired signed history is source evidence only: newly approved followup gets a fresh receipt, lease and fence',async t=>{
  const f=await bundleFixture(t),previous=f.bundle;previous.receipt.expiresAt=Date.now()-60000;
  previous.signature=sign(null,Buffer.from(canonical(previous.receipt)),f.keys.privateKey).toString('base64');
  const publicTask={...previous.publicTask,summary:'Refine the approved gap to sixteen pixels'};
  const cap={jobId:'new-job',feedbackId:previous.receipt.feedbackId,inputVersion:2,approvalHash:approvalHash(publicTask,previous.publicContext),publicTask,publicContext:previous.publicContext,baseSha:f.base,fence:2,attempt:1,leaseUntil:Date.now()+60000,priorDraft:{version:1,headSha:'c'.repeat(40),candidateDigest:previous.receipt.patchDigest,receiptDigest:sha256(canonical(previous.receipt)),bundleDigest:sha256(canonical(previous)),bundle:previous}};
  let completed,calls=0;
  const store={acquire:async()=>cap,assertActive:async()=>{},transition:async()=>{},complete:async(_,bundle)=>{completed=bundle},park:async()=>assert.fail('valid historical evidence must not reuse old expiry authority')};
  const model={generate:async request=>{calls++;const name='src/components/landing.css';assert.equal(request.sources[name],previous.patch.files[0].content);return {patch:{baseSha:f.base,files:[{path:name,beforeSha256:sha256(request.sources[name]),content:'.card { gap: 16px; }\n'}]},chargedUsd:0}}};
  const checks=async(_,phase)=>({phase,passed:true,commands:['test','typecheck','build'],digest:sha256(phase)});
  assert.equal((await runOne({enabled:true,store,cwd:f.cwd,model,signingKey:f.keys.privateKey,checks,maxWallMs:30000})).state,'publishing');
  assert.equal(calls,1);assert.equal(completed.receipt.fence,2);assert.equal(completed.receipt.inputVersion,2);assert.ok(completed.receipt.expiresAt>Date.now());assert.equal(completed.patch.files[0].beforeSha256,sha256(f.sources['src/components/landing.css']));
});


async function mixedPrivatePipeline(t,tsxHistory=false) {
  const f=await setup(t),{cwd}=await fixture(t),keys=generateKeyPairSync('ed25519');await enable(f.db);
  const css='src/components/landing.css',nav='src/components/site-nav.tsx';
  const original='.card { gap: 8px; margin: 4px; }\n',navigation='export const nav = [{label: "Overview"}];\n';
  await writeFile(path.join(cwd,css),original);await writeFile(path.join(cwd,nav),navigation);
  await writeFile(path.join(cwd,'package.json'),JSON.stringify({scripts:{test:'node check.cjs',typecheck:'node check.cjs',build:'node check.cjs'}}));
  await writeFile(path.join(cwd,'check.cjs'),"if(Object.keys(process.env).some(k=>/TOKEN|SECRET|DATABASE|ANTHROPIC/.test(k)))process.exit(9)");
  await git(cwd,['add','.']);await git(cwd,['commit','-qm','trusted mixed-mode fixture']);
  const base=(await git(cwd,['rev-parse','HEAD'])).trim(),sources=await loadSnapshot(cwd,base),remote=await githubFixture(t,base);
  const tree=remote.trees.get('b'.repeat(40));tree.tree=tree.tree.filter(f=>f.path!==css);for(const [path,content] of [[css,original],[nav,navigation]])tree.tree.push({path,mode:'100644',type:'blob',sha:blob(content)});
  const intake=createFeedbackIntake(f.db,()=>new Date()),first=await intake.create(actor,randomUUID(),input);let calls=0;
  const observed=[];
  const provider=http.createServer(async(req,res)=>{
    let raw='';for await(const c of req)raw+=c;
    assert.ok(!raw.includes('PRIVATE_FOLLOWUP_CANARY'));const request=JSON.parse(JSON.parse(raw).messages[0].content);observed.push(request);calls++;
    const name=calls===1&&tsxHistory?nav:css;
    const content=calls===1?(tsxHistory?navigation.replace('Overview','Atlas'):original.replace('gap: 8px','gap: 12px')):request.sources[css].replace(calls===2?'margin: 4px':'gap: 12px',calls===2?'margin: 8px':'gap: 16px');
    const patch={baseSha:base,files:[{path:name,beforeSha256:request.sourceHashes[name],content}]};
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({model:'claude-synthetic',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify(patch)}]}));
  });await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>provider.close(resolve)));
  const model=new AnthropicModel({enabled:true,fixture:true,origin:`http://127.0.0.1:${provider.address().port}`,model:'claude-synthetic',inputUsdPerMillion:3,outputUsdPerMillion:15,maxInputTokens:8000,maxOutputTokens:1000,maxBodyBytes:16000,maxResponseBytes:40000,timeoutMs:5000},()=> 'SYNTHETIC_KEY');
  const run=()=>runOne({enabled:true,store:new PgWorkStore(f.db,{trustedBaseSha:base}),cwd,model,signingKey:keys.privateKey,maxWallMs:60000});
  const publish=async version=>{const job=(await f.db.query('SELECT id FROM atlas_feedback.jobs WHERE feedback_id=$1 AND input_version=$2',[first.id,version])).rows[0];const store=new PgWorkStore(f.db,{trustedBaseSha:base,publisherInstanceId:randomUUID()}),bundle=await store.loadBundle(job.id);assert.ok(!JSON.stringify(bundle).includes('PRIVATE_'));await publishBundle({enabled:true,bundle,publicKey:keys.publicKey,sources,store,github:{origin:remote.origin,fixture:true,token:()=> 'SYNTHETIC_TOKEN'}});return bundle;};
  assert.equal((await run()).state,'publishing');await publish(1);await git(cwd,['reset','--hard',base]);
  const simple={feedback:'PRIVATE_MIXED_CANARY',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context:{...input.context,element:{selector:'html > body > main > button',tagName:'button',classes:['PRIVATE_MIXED_CLASS']}}};
  assert.equal((await intake.followup(actor,first.id,randomUUID(),{...simple,expectedVersion:1})).state,'queued');
  const result=await run();
  if(tsxHistory){
    assert.equal(result.state,'needs_human_review');assert.equal(calls,1,'prior TSX must park BEFORE inference');
    assert.equal((await f.db.query('SELECT * FROM atlas_feedback.worker_reservations')).rows.length,1,'no second reservation');
    assert.equal((await intake.status(actor,first.id)).state,'needs_human_review');assert.equal(remote.prs.length,1);return;
  }
  assert.equal(result.state,'publishing');const next=await publish(2);
  assert.equal(observed[1].sources[css],original.replace('gap: 8px','gap: 12px'));
  assert.deepEqual(observed[1].privateInstruction,{feedback:simple.feedback,element:simple.context.element});assert.equal(observed[0].privateInstruction,undefined);
  assert.equal(next.patch.files[0].beforeSha256,sha256(original));assert.equal(next.patch.files[0].content,'.card { gap: 12px; margin: 8px; }\n');
  await git(cwd,['reset','--hard',base]);
  await intake.followup(actor,first.id,randomUUID(),{...input,expectedVersion:2});assert.equal((await run()).state,'publishing');await publish(3);
  assert.equal(observed[2].privateInstruction,undefined);assert.ok(!JSON.stringify(observed[2]).includes('PRIVATE_MIXED'));
  assert.equal(observed[2].sources[css],next.patch.files[0].content);assert.equal(remote.prs.length,1);assert.equal(calls,3);assert.ok(!JSON.stringify(remote.writes).includes('PRIVATE_'));
}
test('legacy CSS → simple CSS → legacy followups preserve cumulative draft and segregate each private instruction',async t=>mixedPrivatePipeline(t));
test('simple followup to previously public-approved TSX history parks before inference or reservation',async t=>mixedPrivatePipeline(t,true));
