import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('private runtime roles are disabled by default without opening DB, provider or token',async()=>{
  const { drainWorker,drainPublisher }=await import('../scripts/feedback/runtime.ts');
  let calls=0;const explode=async()=>{calls++;throw new Error('must not run')};
  assert.deepEqual(await drainWorker({enabled:false,next:explode,maxJobs:1}),[]);
  assert.deepEqual(await drainPublisher({enabled:false,next:explode,maxJobs:1}),[]);assert.equal(calls,0);
  const out=execFileSync(process.execPath,['--import','tsx','scripts/feedback/runtime.ts','worker'],{env:{PATH:process.env.PATH},encoding:'utf8'});assert.match(out,/disabled/);
});
test('bounded private drain actually runs queued work and stops on idle',async()=>{
  const { drainWorker }=await import('../scripts/feedback/runtime.ts');let calls=0;
  const rows=await drainWorker({enabled:true,maxJobs:3,next:async()=>({state:++calls===1?'publishing':'idle'})});assert.equal(calls,2);assert.deepEqual(rows,[{state:'publishing'},{state:'idle'}]);
});
