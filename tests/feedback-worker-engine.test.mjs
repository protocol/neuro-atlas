import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './feedback-worker-git.test.mjs';
import { git } from '../scripts/feedback/git-sandbox.ts';
import { sha256 } from '../scripts/feedback/validator.ts';

test('worker executes real git -> approved-only model -> repeated validation -> signed publisher receipt',async t=>{
  const { runOne, approvalHash }=await import('../scripts/feedback/engine.ts');
  const {cwd,base}=await fixture(t);const keys=generateKeyPairSync('ed25519');
  const task={title:'Spacing',summary:'Increase spacing',acceptance:['More readable']};const context={route:'/',viewport:{width:1000,height:800},theme:'light'};
  const job={jobId:'j1',feedbackId:'16d0cd59-21ec-4cb0-83e0-31395208603d',inputVersion:1,approvalHash:approvalHash(task,context),publicTask:task,publicContext:context,baseSha:base,fence:1,attempt:1,leaseUntil:Date.now()+30000,privateComment:'PRIVATE_CANARY'};
  let active=true,receipt;const transitions=[];
  const store={acquire:async()=>active?job:null,assertActive:async()=>{if(!active)throw new Error('fenced')},reserve:async()=> 'r1',reconcile:async()=>{},unknown:async()=>{},transition:async(_job,state)=>transitions.push(state),complete:async(_job,bundle)=>{receipt=bundle;active=false},park:async(_job,code)=>{transitions.push(code);active=false}};
  let calls=0;
  const model={generate:async(input,meter)=>{calls++;assert.ok(!JSON.stringify(input).includes('PRIVATE_CANARY'));await meter.reserve(0.1);const file='src/components/landing.css';return {patch:{baseSha:base,files:[{path:file,beforeSha256:sha256(input.sources[file]),content:'.card { gap: 12px; }\n'}]},chargedUsd:0.01}}};
  const checks=async(_cwd,phase)=>({phase,passed:true,commands:['test','typecheck','build'],digest:sha256(phase)});
  const result=await runOne({enabled:true,store,model,cwd,signingKey:keys.privateKey,checks,maxWallMs:15000});
  assert.equal(result.state,'publishing');assert.equal(calls,1);assert.ok(receipt.signature);assert.equal(receipt.receipt.baseSha,base);assert.ok(!JSON.stringify(receipt).includes('PRIVATE_CANARY'));assert.deepEqual(transitions,['working','validating','publishing']);
  assert.equal((await runOne({enabled:true,store,model,cwd,signingKey:keys.privateKey,checks,maxWallMs:15000})).state,'idle');
  assert.equal((await runOne({enabled:false,store,model,cwd,signingKey:keys.privateKey,checks,maxWallMs:15000})).state,'disabled');
});

test('trusted checks run fixed npm argv with stripped environment and hard timeout',async t=>{
  const { runTrustedChecks }=await import('../scripts/feedback/checks.ts');
  const {cwd}=await fixture(t);
  await writeFile(path.join(cwd,'package.json'),JSON.stringify({scripts:{test:'node check.cjs',typecheck:'node check.cjs',build:'node check.cjs'}}));
  await writeFile(path.join(cwd,'check.cjs'),'if(Object.keys(process.env).some(k=>/SECRET|TOKEN|DATABASE|ANTHROPIC/.test(k))) process.exit(9); if(process.env.NODE_ENV!==(process.env.npm_lifecycle_event==="build"?"production":"test"))process.exit(8); require("fs").appendFileSync("checks.txt","checked\\n");');
  process.env.ANTHROPIC_API_KEY='PRIVATE_CANARY';process.env.GITHUB_TOKEN='PRIVATE_CANARY';
  t.after(()=>{delete process.env.ANTHROPIC_API_KEY;delete process.env.GITHUB_TOKEN});
  const receipt=await runTrustedChecks(cwd,'baseline',{timeoutMs:10000});
  assert.equal(receipt.passed,true);assert.equal((await readFile(path.join(cwd,'checks.txt'),'utf8')).trim().split('\n').length,3);
  await writeFile(path.join(cwd,'check.cjs'),'setInterval(()=>{},1000)');
  await assert.rejects(runTrustedChecks(cwd,'candidate',{timeoutMs:100}),/checks_failed/);
});

test('candidate checks cannot smuggle an unvalidated file mutation into a signed receipt',async t=>{
  const { runOne,approvalHash }=await import('../scripts/feedback/engine.ts');const {cwd,base}=await fixture(t);const keys=generateKeyPairSync('ed25519');const task={title:'Gap',summary:'Gap',acceptance:['Gap']},context={route:'/',viewport:{width:1,height:1},theme:'light'};
  const cap={jobId:'j',feedbackId:'16d0cd59-21ec-4cb0-83e0-31395208603d',inputVersion:1,approvalHash:approvalHash(task,context),publicTask:task,publicContext:context,baseSha:base,fence:1,attempt:1,leaseUntil:Date.now()+20000};let completed=false;
  const store={acquire:async()=>cap,assertActive:async()=>{},transition:async()=>{},complete:async()=>{completed=true},park:async()=>{}};
  const model={generate:async(input)=>({patch:{baseSha:base,files:[{path:'src/components/landing.css',beforeSha256:sha256(input.sources['src/components/landing.css']),content:'.card { gap: 12px; }\n'}]},chargedUsd:1})};
  const checks=async(_,phase)=>{if(phase==='candidate')await writeFile(path.join(cwd,'src/proxy.ts'),'unexpected mutation');return {phase,passed:true,commands:['test','typecheck','build'],digest:sha256(phase)}};
  assert.equal((await runOne({enabled:true,store,model,cwd,signingKey:keys.privateKey,checks,maxWallMs:20000})).state,'needs_human_review');assert.equal(completed,false);
});

test('kill during inference aborts capability, never completes, and attempt >2 fails closed',async t=>{
  const { runOne,approvalHash }=await import('../scripts/feedback/engine.ts');const {cwd,base}=await fixture(t);const keys=generateKeyPairSync('ed25519'),task={title:'Gap',summary:'Gap',acceptance:['Gap']},context={route:'/',viewport:{width:1,height:1},theme:'light'};
  const cap={jobId:'j',feedbackId:'16d0cd59-21ec-4cb0-83e0-31395208603d',inputVersion:1,approvalHash:approvalHash(task,context),publicTask:task,publicContext:context,baseSha:base,fence:1,attempt:1,leaseUntil:Date.now()+20000};let killed=false,calls=0,completed=false;
  const store={acquire:async()=>cap,assertActive:async()=>{if(killed)throw new Error('fenced')},transition:async()=>{},complete:async()=>{completed=true},park:async()=>{}};
  const model={generate:async(_input,_meter,signal)=>{calls++;setTimeout(()=>{killed=true},10);return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('provider_unknown_outcome')),{once:true}))}};
  const checks=async(_,phase)=>({phase,passed:true,commands:['test','typecheck','build'],digest:sha256(phase)});
  assert.equal((await runOne({enabled:true,store,model,cwd,signingKey:keys.privateKey,checks,maxWallMs:5000})).state,'cancelled');assert.equal(completed,false);assert.equal(calls,1);
  killed=false;cap.attempt=3;assert.equal((await runOne({enabled:true,store,model,cwd,signingKey:keys.privateKey,checks,maxWallMs:5000})).state,'needs_human_review');assert.equal(calls,1);
});
