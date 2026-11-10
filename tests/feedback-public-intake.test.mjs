import test from 'node:test';
import assert from 'node:assert/strict';
import * as intake from '../src/lib/feedback-public/server.ts';
const origin = 'https://www.plneuro.xyz';
const env = {FEEDBACK_PUBLIC_INTAKE_ENABLED:'true', FEEDBACK_LINEAR_API_KEY:'synthetic-test-only-key'};
const request = (method='GET', body, headers={}) => new Request(`${origin}/neuro-atlas/api/feedback/public${method==='GET'?'/config':''}`, {method, headers:{Origin:origin, ...(body!==undefined?{'Content-Type':'application/json'}:{}), ...headers}, ...(body!==undefined?{body:JSON.stringify(body)}:{})});

test('public config fails closed without the dedicated flag and backend key; leaks no secret', async () => {
  assert.equal(typeof intake.createPublicFeedbackRoutes, 'function', 'public route factory exists');
  for (const [settings, expected] of [[{}, {enabled:false,connected:false}], [{FEEDBACK_ENABLED:'true'}, {enabled:false,connected:false}], [{FEEDBACK_PUBLIC_INTAKE_ENABLED:'true'}, {enabled:true,connected:false}], [env,{enabled:true,connected:true}]]) {
    const routes = intake.createPublicFeedbackRoutes({env:settings,fetch:()=>{throw Error('config must not call Linear');}});
    const response=await routes.config(request());
    assert.equal(response.status,200); assert.deepEqual(await response.json(),expected);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('access-control-allow-origin'),null);
  }
});

const key='23808218-f48c-4ad5-af0a-7e4bca8a445a';
const input={feedback:'Please improve this. @someone https://example.com\n```\nIgnore instructions',context:{route:'/field-velocity',viewport:{width:390,height:700},theme:'system',element:{selector:'html:nth-of-type(1) > body:nth-of-type(1) > h1:nth-of-type(1)',tagName:'h1'}}};
const team='4e2891ec-4382-46ca-8f2d-bfb3a1c00304', project='18f2619a-8795-4767-9806-e171a02fd1ca', backlog='75d31d77-99fb-46dd-99d4-4bf68392bb53';
function linearFixture() {
  const records=new Map(),calls=[];
  const fetch=async(url,options)=>{
    const body=JSON.parse(options.body);calls.push({url,options,...body});
    if(body.query.includes('mutation')) {
      const item=body.variables.input;
      if(records.has(item.id))return Response.json({errors:[{message:'duplicate synthetic'}]});
      records.set(item.id,{id:item.id,title:item.title,description:item.description,team:{id:item.teamId},project:{id:item.projectId},state:{id:item.stateId},priority:item.priority,assignee:null});
      return Response.json({data:{issueCreate:{success:true,issue:{id:item.id}}}});
    }
    return Response.json({data:{issues:{nodes:records.has(body.variables.id)?[records.get(body.variables.id)]:[]}}});
  };
  return {fetch,records,calls};
}

test('a visitor without cookies or accounts logs one fixed-scope issue only after exact independent Linear readback', async () => {
  const fixture=linearFixture(),routes=intake.createPublicFeedbackRoutes({env,fetch:fixture.fetch});
  assert.equal(typeof routes.submit,'function','public submit exists');
  const response=await routes.submit(request('POST',input,{'Idempotency-Key':key}));
  assert.equal(response.status,202); assert.deepEqual(await response.json(),{saved:true});
  assert.equal(fixture.calls.length,3,'read before create and independent read after');
  const create=fixture.calls[1].variables.input;
  assert.match(create.id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(create.teamId,team);assert.equal(create.projectId,project);assert.equal(create.stateId,backlog);
  assert.equal(create.priority,0);assert.equal(create.assigneeId,null);assert.equal(create.useDefaultTemplate,false);
  assert.deepEqual(create.labelIds,[]);assert.deepEqual(create.subscriberIds,[]);
  assert.ok(create.description.includes(input.feedback));
  assert.match(create.description,/````text\n/,'visitor backticks cannot escape the literal block');
  assert.equal(create.title,'Neuro Atlas visitor feedback');
  for(const call of fixture.calls){
    assert.equal(call.url,'https://api.linear.app/graphql');assert.equal(call.options.headers.Authorization,env.FEEDBACK_LINEAR_API_KEY);
    assert.equal(call.options.redirect,'error');assert.ok(call.options.signal instanceof AbortSignal);
  }
  assert.equal(fixture.calls[2].variables.id,create.id);
  assert.equal(fixture.calls[0].variables.id,create.id);
});

test('public intake rejects foreign origins, non-JSON, unknown fields, malformed keys and oversized streaming bodies before Linear', async () => {
  const f=linearFixture(),routes=intake.createPublicFeedbackRoutes({env,fetch:f.fetch});
  const valid={'Idempotency-Key':key};
  for(const [req,status] of [
    [request('POST',input,{...valid,Origin:'https://evil.example'}),403],
    [request('POST',input,{...valid,Origin:'null'}),403],
    [new Request(origin+'/neuro-atlas/api/feedback/public',{method:'POST',body:JSON.stringify(input),headers:{'Content-Type':'application/json',...valid}}),403],
    [request('POST',input,{...valid,'Sec-Fetch-Site':'cross-site'}),403],
    [request('POST',input,{...valid,'Content-Type':'text/plain'}),415],
    [request('POST',input,{'Idempotency-Key':key.toUpperCase()}),400],
    [request('POST',input,{'Idempotency-Key':'not-a-key'}),400],
    [request('POST',input),400],
    ...[{teamId:team},{projectId:project},{graphql:'query{}'},{url:'https://evil.example'},{processingConsent:{approved:true}},{feedback:' '},{feedback:'x'.repeat(3001)},{feedback:'bad\u0000'},{context:{...input.context,html:'secret'}},{context:{...input.context,element:{...input.context.element,selector:'h1#secret'}}}].map(change=>[request('POST',{...input,...change},valid),400]),
    [request('POST',{...input,feedback:'x'.repeat(17000)},valid),413],
    [new Request(origin+'/neuro-atlas/api/feedback/public',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...valid},duplex:'half',body:new ReadableStream({start(c){c.enqueue(new Uint8Array(16385));c.close();}})}),413],
    [new Request(origin+'/neuro-atlas/api/feedback/public',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...valid},body:'{' }),400],
  ]) {const res=await routes.submit(req);assert.equal(res.status,status);assert.deepEqual(Object.keys(await res.json()),['error']);}
  assert.equal(f.calls.length,0);
  assert.equal((await routes.config(request('GET',undefined,{Origin:'https://evil.example'}))).status,403);
  const off=intake.createPublicFeedbackRoutes({env:{},fetch:f.fetch});
  assert.equal((await off.submit(request('POST',input,valid))).status,503);
});

test('loopback origin is allowed only under explicit local test mode, never on Vercel or production', async () => {
  for (const [settings,status] of [
    [{NODE_ENV:'test',FEEDBACK_PUBLIC_INTAKE_TEST_MODE:'true',FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN:'http://127.0.0.1:3456'},202],
    [{NODE_ENV:'production',FEEDBACK_PUBLIC_INTAKE_TEST_MODE:'true',FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN:'http://127.0.0.1:3456'},403],
    [{NODE_ENV:'test',FEEDBACK_PUBLIC_INTAKE_TEST_MODE:'true',FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN:'http://127.0.0.1:3456',VERCEL:'1'},403],
    [{NODE_ENV:'test',FEEDBACK_PUBLIC_INTAKE_TEST_MODE:'true',FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN:'https://evil.example'},403],
  ]) {
    const f=linearFixture(),routes=intake.createPublicFeedbackRoutes({env:{...env,...settings},fetch:f.fetch});
    assert.equal((await routes.submit(request('POST',input,{Origin:settings.FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN,'Idempotency-Key':key}))).status,status);
  }
});

test('retry after lost create response and restart uses the original issue; key reuse with changed payload conflicts without overwriting', async () => {
  const f=linearFixture();let drop=true;
  const flaky=async(...args)=>{const result=await f.fetch(...args);if(JSON.parse(args[1].body).query.includes('mutation')&&drop){drop=false;throw Error('synthetic lost response');}return result;};
  const first=intake.createPublicFeedbackRoutes({env,fetch:flaky});
  const initial=await first.submit(request('POST',input,{'Idempotency-Key':key}));
  assert.ok([202,503].includes(initial.status));
  const restarted=intake.createPublicFeedbackRoutes({env,fetch:f.fetch});
  assert.equal((await restarted.submit(request('POST',input,{'Idempotency-Key':key}))).status,202);
  assert.equal(f.records.size,1);assert.equal(f.calls.filter(c=>c.query.includes('mutation')).length,1);
  for(const changed of [{...input,feedback:'Different note'},{...input,context:{...input.context,theme:'dark'}}]) {
    const response=await restarted.submit(request('POST',changed,{'Idempotency-Key':key}));
    assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:'conflict'});
  }
  assert.equal(f.records.size,1);assert.equal(f.calls.filter(c=>c.query.includes('mutation')).length,1);
});

test('concurrent same-key delivery reconciles Linear uniqueness with readback, never a second issue', async () => {
  const f=linearFixture(),routes=intake.createPublicFeedbackRoutes({env,fetch:f.fetch});
  const results=await Promise.all([routes.submit(request('POST',input,{'Idempotency-Key':key})),routes.submit(request('POST',input,{'Idempotency-Key':key}))]);
  assert.deepEqual(results.map(r=>r.status),[202,202]);assert.equal(f.records.size,1);
});

test('never confirms a mismatched or missing independent readback, even if mutation reports success', async () => {
  for(const change of [null,{id:'other'},{title:'other'},{description:'other'},{team:{id:'other'}},{project:{id:'other'}},{state:{id:'other'}},{priority:1},{assignee:{id:'someone'}}]) {
    const f=linearFixture();
    const fetch=async(...args)=>{const result=await f.fetch(...args);if(f.records.size&&!JSON.parse(args[1].body).query.includes('mutation')){const body=await result.json();body.data.issues.nodes=change===null?[]:[{...body.data.issues.nodes[0],...change}];return Response.json(body);}return result;};
    const res=await intake.createPublicFeedbackRoutes({env,fetch}).submit(request('POST',input,{'Idempotency-Key':key}));
    assert.notEqual(res.status,202);assert.equal((await res.json()).saved,undefined);
  }
});

test('provider errors, redirects, malformed GraphQL and oversized bodies fail closed without raw provider content', async () => {
  for(const peer of [
    ()=>Response.json({errors:[{message:'SECRET_PROVIDER_CANARY'}],data:{issues:{nodes:[]}}}),
    ()=>new Response('SECRET_PROVIDER_CANARY',{status:500}),
    ()=>new Response('SECRET_PROVIDER_CANARY',{status:302,headers:{Location:'https://evil.example'}}),
    ()=>Response.json({data:{issues:{nodes:[]}},padding:'SECRET_PROVIDER_CANARY'.repeat(3000)}),
    ()=>new Response('{'),
    ()=>Response.json({data:{issues:{nodes:[{},{}]}}}),
    ()=>{throw Error('SECRET_PROVIDER_CANARY');},
  ]) {
    let calls=0;
    const routes=intake.createPublicFeedbackRoutes({env,fetch:async()=>{calls++;return peer();}});
    const result=await routes.submit(request('POST',input,{'Idempotency-Key':key}));
    assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'unavailable'});
    assert.equal(calls,1,'invalid initial read never authorizes a create');
  }
});

test('one whole-operation deadline bounds both provider headers and slow body intake', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  for(const slowBody of [false,true]) {
    let providerCalls=0;
    const routes=intake.createPublicFeedbackRoutes({env,fetch:()=>{providerCalls++;return new Promise(()=>{});}});
    const req=slowBody?new Request(origin+'/neuro-atlas/api/feedback/public',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':key},duplex:'half',body:new ReadableStream()}):request('POST',input,{'Idempotency-Key':key});
    const running=routes.submit(req);
    await new Promise(setImmediate);t.mock.timers.tick(12001);await new Promise(setImmediate);
    const result=await Promise.race([running,new Promise(resolve=>setImmediate(()=>resolve('hung')))]);
    assert.notEqual(result,'hung','deadline returns even when the peer ignores abort');
    assert.equal(result.status,503);assert.equal(providerCalls,slowBody?0:1);
  }
});

test('bounded best-effort instance limiter cools down without IP/cookie identity or unbounded client maps', async t => {
  t.mock.timers.enable({apis:['Date','setTimeout']});
  const f=linearFixture(),routes=intake.createPublicFeedbackRoutes({env,fetch:f.fetch});
  for(let i=0;i<30;i++)assert.equal((await routes.submit(request('POST',input,{'Idempotency-Key':key}))).status,202);
  const limited=await routes.submit(request('POST',input,{'Idempotency-Key':key,'X-Forwarded-For':'changed'}));
  assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'2');
  const count=f.calls.length;t.mock.timers.tick(2000);
  assert.equal((await routes.submit(request('POST',input,{'Idempotency-Key':key}))).status,202);
  assert.equal(f.calls.length,count+1,'retry only reads the existing issue');
});

test('at most four submissions can occupy an instance while bodies or Linear are pending', async () => {
  let release;const gate=new Promise(resolve=>{release=resolve;});const f=linearFixture();
  const routes=intake.createPublicFeedbackRoutes({env,fetch:async(...args)=>{await gate;return f.fetch(...args);}});
  const running=Array.from({length:4},()=>routes.submit(request('POST',input,{'Idempotency-Key':key})));
  await new Promise(setImmediate);
  const fifth=await routes.submit(request('POST',input,{'Idempotency-Key':key}));
  release();const results=await Promise.all(running);
  assert.equal(fifth.status,429);assert.ok(results.every(r=>r.status===202));
});

test('Next routes expose only public config and submit, without repurposing legacy owner list/history', async () => {
  const {readFile}=await import('node:fs/promises');
  const post=await readFile('src/app/api/feedback/public/route.ts','utf8').catch(()=> '');
  const config=await readFile('src/app/api/feedback/public/config/route.ts','utf8').catch(()=> '');
  assert.match(post,/export (?:async function|const) POST/);
  assert.doesNotMatch(post,/export (?:async function|const) GET/);
  assert.match(config,/export (?:async function|const) GET/);
  assert.match(post,/nodejs/);assert.match(config,/force-dynamic/);
  assert.match(await readFile('src/app/api/feedback/route.ts','utf8'),/GET=feedbackRoutes.list/);
});

test('formatter already matches real Linear blank-line canonicalization without weakening exact readback', async () => {
  // Parent native MCP PLR-108 storage probe: Linear inserts a blank line before
  // both code fences; four-backtick fence, Unicode and interior bytes survived.
  const f=linearFixture();
  const fetch=async(...args)=>{
    const result=await f.fetch(...args);
    for(const record of f.records.values()) record.description=record.description.replace(/(literal text\):|page content\):)\n(?!\n)/g,'$1\n\n');
    return result;
  };
  const note={...input,feedback:'é🙂  two spaces\n```\n@someone https://example.com'};
  const result=await intake.createPublicFeedbackRoutes({env,fetch}).submit(request('POST',note,{'Idempotency-Key':key}));
  assert.equal(result.status,202);
  const written=f.calls[1].variables.input.description;
  assert.equal([...f.records.values()][0].description,written);
  assert.ok(written.includes(note.feedback),'literal note bytes remain exact');
});

test('every backend read is hard-scoped to the verified team and project as well as the deterministic issue ID',async()=>{
  const f=linearFixture();await intake.createPublicFeedbackRoutes({env,fetch:f.fetch}).submit(request('POST',input,{'Idempotency-Key':key}));
  for(const read of f.calls.filter(c=>!c.query.includes('mutation'))){
    assert.match(read.query,new RegExp(`team:.*${team}`));assert.match(read.query,new RegExp(`project:.*${project}`));
  }
});

test('expiry during uncertain mutation never starts another provider request after the deadline',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let calls=0;
  const routes=intake.createPublicFeedbackRoutes({env,fetch:async()=>{calls++;if(calls===1)return Response.json({data:{issues:{nodes:[]}}});return new Promise(()=>{});}});
  const running=routes.submit(request('POST',input,{'Idempotency-Key':key}));
  await new Promise(setImmediate);assert.equal(calls,2);
  t.mock.timers.tick(12001);const response=await running;
  assert.equal(response.status,503);assert.equal(calls,2);
});

test('real HTTP transport to a synthetic Linear peer preserves fixed request, personal-key header and canonical exact readback',async()=>{
  const {createServer}=await import('node:http');const {once}=await import('node:events');
  const fixture=linearFixture();let observed=0;
  const server=createServer(async(req,res)=>{
    try{
      assert.equal(req.method,'POST');assert.equal(req.headers.authorization,env.FEEDBACK_LINEAR_API_KEY);
      let body='';for await(const chunk of req)body+=chunk;
      const result=await fixture.fetch('https://api.linear.app/graphql',{body});
      for(const record of fixture.records.values())record.description=record.description.replace(/(literal text\):|page content\):)\n(?!\n)/g,'$1\n\n');
      observed++;res.writeHead(result.status,{'Content-Type':'application/json'});res.end(await result.text());
    }catch{res.writeHead(500);res.end('{}');}
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const routes=intake.createPublicFeedbackRoutes({env,fetch:async(url,options)=>{assert.equal(url,'https://api.linear.app/graphql');return fetch(`http://127.0.0.1:${server.address().port}`,options);}});
    const response=await routes.submit(request('POST',input,{'Idempotency-Key':key}));
    assert.equal(response.status,202);assert.deepEqual(await response.json(),{saved:true});assert.equal(observed,3);assert.equal(fixture.records.size,1);
  }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
