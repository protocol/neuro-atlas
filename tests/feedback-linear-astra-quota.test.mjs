import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PrivateFiles} from '../scripts/feedback-linear/files.ts';

const budget = {kind:'attempts',maxAttemptsPerDay:5,timeZone:'Europe/Berlin'};
const request = job => ({job,tokens:1000,budget,provider:'hermes-astra',account:'hermes-default-openai-codex',model:'gpt-6-astra',policyDigest:'a'.repeat(64)});
test('changing day-boundary timezone cannot refund slots in the same durable root',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'astra-timezone-'));
  try {
    const f=new PrivateFiles(root);
    await f.lock(s=>f.reserveAttempt(s,request('first'),at));
    await assert.rejects(f.lock(s=>f.reserveAttempt(s,{...request('second'),budget:{...budget,timeZone:'America/Los_Angeles'}},at)),/attempt_budget/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('loss of an initialized count ledger fails closed instead of resetting to five',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'astra-lost-ledger-'));
  try {
    const f=new PrivateFiles(root);await f.lock(s=>f.reserveAttempt(s,request('one'),at));
    const file=path.join(root,'state.json'),state=JSON.parse(await readFile(file,'utf8'));delete state.attempts;
    await writeFile(file,JSON.stringify(state));
    await assert.rejects(new PrivateFiles(root).read(),/private_state_invalid/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('Berlin midnight admits a new day but never replays a proposal, including DST boundary',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'astra-midnight-'));
  try {
    const f=new PrivateFiles(root),before=Date.parse('2026-10-24T21:59:59Z'),after=Date.parse('2026-10-24T22:00:00Z');
    for(let i=0;i<5;i++)await f.lock(s=>f.reserveAttempt(s,request('prior-'+i),before));
    await assert.rejects(f.lock(s=>f.reserveAttempt(s,request('sixth'),before)),/attempt_budget/);
    await f.lock(s=>f.reserveAttempt(s,request('new-day'),after));
    await assert.rejects(f.lock(s=>f.reserveAttempt(s,request('prior-0'),after)),/attempt_budget/);
    assert.equal((await f.read()).attempts.at(-1).day,'2026-10-25');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('simultaneous process reservations share one durable five-attempt cap',async()=>{
  const {spawn}=await import('node:child_process');
  const root=await mkdtemp(path.join(tmpdir(),'astra-processes-'));
  try {
    const script=`import {PrivateFiles} from './scripts/feedback-linear/files.ts';const f=new PrivateFiles(process.argv[1]);try{await f.lock(s=>f.reserveAttempt(s,JSON.parse(process.argv[2]),${at}));process.stdout.write('reserved');}catch(e){if(!['host_locked','attempt_budget'].includes(e.message))throw e;process.stdout.write('blocked');}`;
    for(let wave=0;wave<8;wave++)await Promise.all(Array.from({length:3},(_,i)=>new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',script,root,JSON.stringify(request('w'+wave+'-'+i))],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});let error='';child.stderr.on('data',d=>error+=d);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(error)));
    })));
    assert.equal((await new PrivateFiles(root).read()).attempts.length,5);
  } finally {await rm(root,{recursive:true,force:true});}
});

const at = Date.parse('2026-11-04T12:00:00Z');

test('five durable count reservations admit no sixth attempt after restart, and never store fake USD',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'astra-count-'));
  try {
    for(let i=0;i<5;i++) {
      const f=new PrivateFiles(root);
      await f.lock(async state=>{await f.reserveAttempt(state,request('proposal-'+i),at);});
    }
    const restarted=new PrivateFiles(root);
    await assert.rejects(restarted.lock(s=>restarted.reserveAttempt(s,request('sixth'),at)),/attempt_budget/);
    const state=JSON.parse(await readFile(path.join(root,'state.json'),'utf8'));
    assert.equal(state.attempts.length,5);assert.deepEqual(state.spend,[]);
    for(const row of state.attempts) {
      assert.equal(row.chargedUsd,null);assert.equal(row.pricing,'UNPRICED');assert.equal(row.status,'reserved');
      assert.equal(row.day,'2026-11-04');assert.equal(row.timeZone,'Europe/Berlin');
      assert.equal(row.upper,undefined);assert.equal(row.actual,undefined);
    }
  } finally {await rm(root,{recursive:true,force:true});}
});
