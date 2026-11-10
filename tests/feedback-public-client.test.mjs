import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import * as clientModule from '../src/lib/feedback-public-client.ts';
const input={feedback:'A note',context:{route:'/',viewport:{width:390,height:700},theme:'system'}};

test('public client needs no identity; sends only one note to the mounted fixed endpoint and confirms an exact receipt',async()=>{
  assert.equal(typeof clientModule.PublicFeedbackClient,'function');
  const calls=[],win={crypto:webcrypto,fetch:async(url,options)=>{calls.push({url,...options});return Response.json(options.method==='POST'?{saved:true}:{enabled:true,connected:true},{status:options.method==='POST'?202:200});}};
  const client=new clientModule.PublicFeedbackClient({window:win});
  assert.deepEqual(await client.config(),{enabled:true,connected:true});
  const key=client.newKey();assert.match(key,/^[a-f0-9-]{36}$/);
  assert.deepEqual(await client.submit(input,key),{saved:true});
  assert.equal(calls[0].url,'/api/feedback/public/config');assert.equal(calls[1].url,'/api/feedback/public');
  assert.equal(calls[1].headers['Idempotency-Key'],key);assert.equal(calls[1].body,JSON.stringify(input));
  assert.equal(calls[1].headers.Authorization,undefined);assert.equal(calls[1].headers['X-Atlas-Feedback-Session'],undefined);
  assert.equal(calls[1].credentials,'same-origin','retain site Basic Auth transport, not feedback cookies');
  assert.equal(calls[1].redirect,'error');assert.equal(calls[1].cache,'no-store');
  assert.equal(client.signIn,undefined);assert.equal(client.list,undefined);assert.equal(client.status,undefined);
});

test('public client rejects uncertain or malformed saves, ignores provider error prose and never retries automatically',async()=>{
  for(const peer of [()=>Response.json({saved:true},{status:200}),()=>Response.json({saved:false},{status:202}),()=>Response.json({saved:true,items:['private']},{status:202}),()=>Response.json({error:'SECRET_CANARY'},{status:503}),()=>new Response('{',{status:202}),()=>{throw Error('SECRET_CANARY');}]) {
    let calls=0;
    const client=new clientModule.PublicFeedbackClient({window:{crypto:webcrypto,fetch:async()=>{calls++;return peer();}}});
    await assert.rejects(client.submit(input,'stable-key'),error=>error instanceof clientModule.PublicFeedbackError&&!error.message.includes('SECRET_CANARY')&&/draft/i.test(error.message));
    assert.equal(calls,1);
  }
  const client=new clientModule.PublicFeedbackClient({window:{crypto:webcrypto,fetch:async()=>Response.json({enabled:'yes',connected:true})}});
  await assert.rejects(client.config(),clientModule.PublicFeedbackError);
});

test('public client bounds uncertain requests and dispose aborts pending work without reissuing it',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  for(const action of ['timeout','dispose']) {
    let signal,calls=0;
    const client=new clientModule.PublicFeedbackClient({window:{crypto:webcrypto,fetch:async(_url,options)=>{calls++;signal=options.signal;return new Promise(()=>{});}}});
    const running=client.submit(input,'stable-key');
    const rejected=assert.rejects(running,clientModule.PublicFeedbackError);
    if(action==='timeout')t.mock.timers.tick(15001);else {assert.equal(typeof client.dispose,'function');client.dispose();}
    await new Promise(setImmediate);
    assert.equal(signal?.aborted,true);
    await rejected;assert.equal(calls,1);
  }
});

test('loopback QA transport matches the public logger only, with no fake identity or history',async()=>{
  const {readFile}=await import('node:fs/promises'),{JSDOM}=await import('jsdom');
  const script=await readFile('scripts/qa/feedback-synthetic-transport.js','utf8');
  const dom=new JSDOM('',{url:'http://127.0.0.1:35642/neuro-atlas/field-velocity',runScripts:'outside-only'});
  try{
    const win=dom.window;win.Response=Response;win.fetch=async()=>{throw Error('outside public fixture');};win.open=()=>{throw Error('no popup');};
    win.eval(script);
    assert.deepEqual(await (await win.fetch('/neuro-atlas/api/feedback/public/config')).json(),{enabled:true,connected:true});
    const options={method:'POST',headers:{'Idempotency-Key':'fixture-key'},body:JSON.stringify(input)};
    await assert.rejects(win.fetch('/neuro-atlas/api/feedback/public',options),/Synthetic first-write/);
    const response=await win.fetch('/neuro-atlas/api/feedback/public',options);
    assert.equal(response.status,202);assert.deepEqual(await response.json(),{saved:true});
    await assert.rejects(win.fetch('/neuro-atlas/api/feedback/auth/start'),/outside public fixture/);
    assert.equal(win.__feedbackFixture.posts.length,2);
    assert.match(await readFile('scripts/qa/feedback-ui-fixture.mjs','utf8'),/endsWith\('\/api\/feedback\/public\/config'\)/);
  }finally{dom.window.close();}
});

test('actual browser bundle contains public DTO/picker only, never the Linear key, backend scope or legacy OAuth client',async()=>{
  const {build}=await import('esbuild');
  const bundle=await build({entryPoints:['src/components/feedback/feedback.tsx'],bundle:true,platform:'browser',write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_BASE_PATH':'"/neuro-atlas"'}});
  const source=bundle.outputFiles[0].text;
  assert.ok(source.includes('/api/feedback/public'));
  assert.ok(source.includes('/neuro-atlas'));
  assert.doesNotMatch(source,/FEEDBACK_LINEAR_API_KEY|api\.linear\.app|18f2619a-8795-4767-9806-e171a02fd1ca|X-Atlas-Feedback-Session|login\/oauth|Sign in with GitHub/);
});
