import test from 'node:test';
import assert from 'node:assert/strict';
import {record,operation,scope} from './feedback-linear-witness-fixture.test.mjs';
import {httpWitness} from './feedback-linear-witness-http-fixture.test.mjs';
test('actual authenticated bounded HTTP reserve/complete peer preserves independent head and read-only authority',async t=>{
 const f=await httpWitness(t),a=record(),b=record(a.feedbackId,2,a);
 await f.client.assertAvailable();await f.client.reserve(operation(a));await assert.rejects(f.client.assertLatest([a]));
 await f.client.complete(operation(a));await f.client.assertLatest([a]);
 await f.client.reserve(operation(b));await assert.rejects(f.client.assertLatest([a]));
 const reader=f.createHttpIntakeWitness({url:f.url,token:f.readToken,scope,testMode:true});
 assert.equal((await reader.read(a.feedbackId)).length,2);
 await assert.rejects(reader.complete(operation(b)));await f.client.complete(operation(b));await reader.assertLatest([a,b]);
 const denied=await fetch(f.url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer invalid'},body:JSON.stringify({action:'available',policyDigest:f.w.policyDigest})});assert.equal(denied.status,403);
});

test('witness CAS returns explicit conflict for changed operation while exact reserve/commit retries are idempotent',async t=>{
 const f=await httpWitness(t),a=record(),op=operation(a);await f.client.reserve(op);
 assert.equal((await f.client.reserve(op))[0].requestHash,op.requestHash);
 await assert.rejects(f.client.reserve({...op,requestHash:'b'.repeat(64)}),e=>e.status===409);
 await f.client.complete(op);await f.client.complete(op);await f.client.assertLatest([a]);
});

test('HTTP peer rejects malformed, oversized, wrong-scope and read-key mutation requests without intake effects',async t=>{
 const f=await httpWitness(t),headers={Authorization:`Bearer ${f.writeToken}`,'Content-Type':'application/json'};
 const send=body=>fetch(f.url,{method:'POST',headers,body});
 assert.equal((await send('{')).status,400);
 assert.equal((await send('x'.repeat(4097))).status,413);
 assert.equal((await send(JSON.stringify({action:'available',policyDigest:'0'.repeat(64)}))).status,403);
 assert.equal((await send(JSON.stringify({action:'available',policyDigest:f.w.policyDigest,unexpected:true}))).status,400);
 assert.deepEqual(await f.w.identities(),[]);
});

test('HTTP client refuses redirects, streamed response overflow and stalled bodies on a real loopback peer',{timeout:12000},async t=>{
 const {createServer}=await import('node:http'),{randomBytes}=await import('node:crypto'),{createHttpIntakeWitness}=await import('../src/lib/feedback-linear/server/witness-client.ts');let mode='redirect',sink=0;
 const server=createServer((req,res)=>{req.resume();if(req.url==='/sink'){sink++;res.end();return;}if(mode==='redirect'){res.writeHead(302,{Location:'/sink'});res.end();}else if(mode==='oversized'){res.writeHead(200,{'Content-Type':'application/json'});res.write('x'.repeat(520*1024));res.end();}else {res.writeHead(200,{'Content-Type':'application/json'});res.write('{');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const client=createHttpIntakeWitness({url:`http://127.0.0.1:${server.address().port}/v1/intake-witness`,token:randomBytes(32).toString('base64url'),scope,testMode:true});
 await assert.rejects(client.assertAvailable());assert.equal(sink,0,'authorization never follows redirect');
 mode='oversized';await assert.rejects(client.assertAvailable());
 mode='stall';const start=performance.now();await assert.rejects(client.assertAvailable());assert(performance.now()-start<8000,'body deadline is enforced');
});

test('same request racing with a newly generated timestamp gets the original canonical reservation, never a second record',async t=>{
 const f=await httpWitness(t),a=record(),op=operation(a);await f.client.reserve(op);
 const later={...op,createdAt:new Date(Date.parse(op.createdAt)+10000).toISOString(),recordHash:'d'.repeat(64)};
 const canonical=await f.client.reserve(later);assert.equal(canonical[0].createdAt,op.createdAt);assert.equal(canonical[0].recordHash,op.recordHash);
 await f.client.complete(op);await f.client.assertLatest([a]);
});
