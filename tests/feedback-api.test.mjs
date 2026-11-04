import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { loadFeedbackConfig } from '../src/lib/feedback/config.ts';
import { createFeedbackService } from '../src/lib/feedback/service.ts';
import { createFeedbackRouteHandlers } from '../src/lib/feedback/routes.ts';

const random = () => randomBytes(32).toString('base64url');
const digest = v => createHash('sha256').update(v).digest('base64url');
const migration = () => readFile(new URL('../db/feedback/001-feedback.sql', import.meta.url), 'utf8');
function database(pg) {
  return {
    async query(sql, params) { const r = await pg.query(sql, params); return { rows:r.rows, rowCount:r.affectedRows ?? r.rows.length }; },
    transaction(fn) { return pg.transaction(tx => fn(database(tx))); },
  };
}
async function listen(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url:`http://127.0.0.1:${server.address().port}`, close:() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}
async function fixture(t, { pg:existing, clock, owner=82394590, providerStatus=200 } = {}) {
  const pg = existing ?? new PGlite();
  if (!existing) await pg.exec(await migration());
  const providerRequests = [];
  const provider = await listen(async (req,res) => {
    let body=''; for await (const chunk of req) body += chunk;
    providerRequests.push({url:req.url, body, authorization:req.headers.authorization});
    res.statusCode=providerStatus;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify(req.url === '/token' ? {access_token:'synthetic-provider-token',token_type:'bearer'} : {id:owner,login:'synthetic-owner'}));
  });
  let service;
  const handlers = createFeedbackRouteHandlers(() => service);
  const api = await listen(async (req,res) => {
    try {
      const parts=[]; for await (const c of req) parts.push(c);
      const request = new Request(`${api.url}${req.url}`, {method:req.method,headers:req.headers,...(parts.length ? {body:Buffer.concat(parts)} : {})});
      const path = new URL(request.url).pathname.replace('/api/feedback','');
      let response;
      if(path==='/config') response=await handlers.config(request);
      else if(path==='/auth/start') response=await handlers.start(request);
      else if(path==='/auth/callback') response=await handlers.callback(request);
      else if(path==='/auth/finish') response=await handlers.finish(request);
      else if(path==='/auth/session') response=await handlers.revoke(request);
      else if(path==='') response=await (req.method==='POST' ? handlers.create(request) : handlers.list(request));
      else if(path.endsWith('/followups')) response=await handlers.followup(request,path.split('/')[1]);
      else response=await handlers.status(request,path.slice(1));
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {res.writeHead(500);res.end('fixture error');}
  });
  const config = loadFeedbackConfig({FEEDBACK_ENABLED:'true',FEEDBACK_PUBLIC_ORIGIN:api.url,FEEDBACK_GITHUB_CLIENT_ID:'synthetic-client',FEEDBACK_GITHUB_CLIENT_SECRET:'synthetic-secret',FEEDBACK_OWNER_GITHUB_ID:'82394590',FEEDBACK_DATABASE_URL:'postgres://synthetic@localhost/fixture',FEEDBACK_TEST_MODE:'true',NODE_ENV:'test',NEXT_PUBLIC_BASE_PATH:''});
  assert(config);
  service = createFeedbackService({database:database(pg),config,now:clock,provider:{authorizeUrl:`${provider.url}/authorize`,tokenUrl:`${provider.url}/token`,userUrl:`${provider.url}/user`}});
  t.after(async () => {await api.close();await provider.close();if(!existing) await pg.close();});
  const request = async (path, {method='GET',body,session,key,headers={}}={}) => fetch(`${api.url}/api/feedback${path}`,{method,headers:{Origin:api.url,...(body !== undefined ? {'Content-Type':'application/json'}:{}),...(session ? {'X-Atlas-Feedback-Session':session}:{}),...(key ? {'Idempotency-Key':key}:{}),...headers},...(body !== undefined ? {body:JSON.stringify(body)}:{})});
  return {pg,request,api,config,providerRequests,handlers};
}
async function signIn(f) {
  const state=random(), codeVerifier=random();
  const start=await f.request('/auth/start',{method:'POST',body:{state,codeChallenge:digest(codeVerifier)}});
  assert.equal(start.status,200);
  const authorization=await start.json();
  const url=new URL(authorization.authorizeUrl);
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.has('scope'),false);
  const callback=await f.request(`/auth/callback?state=${state}&code=synthetic-code`);
  assert.equal(callback.status,200);
  assert.match(callback.headers.get('content-security-policy'),/script-src 'nonce-/);
  const html=await callback.text();
  assert.match(html,/postMessage/); assert(!html.includes('synthetic-provider-token'));
  const finish=await f.request('/auth/finish',{method:'POST',body:{state,code:'synthetic-code',codeVerifier}});
  assert.equal(finish.status,200);
  return {auth:await finish.json(),state,codeVerifier};
}

test('cookie-free HTTP PKCE verifies provider identity, hashes session and revokes it',async t=>{
  const f=await fixture(t);
  const {auth,state,codeVerifier}=await signIn(f);
  assert.equal(auth.actor.githubId,82394590);
  assert.equal(auth.actor.login,'synthetic-owner');
  const sessions=await f.pg.query('SELECT * FROM atlas_feedback.sessions');
  assert.equal(sessions.rows.length,1);
  assert(!JSON.stringify(sessions.rows).includes(auth.session));
  assert(!JSON.stringify(sessions.rows).includes('synthetic-provider-token'));
  const replay=await f.request('/auth/finish',{method:'POST',body:{state,code:'synthetic-code',codeVerifier}});
  assert.equal(replay.status,400);
  assert.equal(f.providerRequests.length,2);
  const revoked=await f.request('/auth/session',{method:'DELETE',session:auth.session});
  assert.equal(revoked.status,204);
  assert.equal((await f.request('',{session:auth.session})).status,401);
});

const input = (privateComment='PRIVATE-CANARY-do-not-publish') => ({
  privateComment,publicTask:{title:'Tighten chart spacing',summary:'Reduce the gap beside the legend.',acceptance:['Legend remains readable']},
  publicApproval:{approved:true,policyVersion:'atlas-feedback-v1'},
  context:{route:'/field-velocity',targetId:'field-velocity',viewport:{width:1280,height:800},theme:'dark'},
});
test('durable intake commits one immutable public job, deduplicates and fences followup versions',async t=>{
  const f=await fixture(t);const {auth}=await signIn(f);const key=randomUUID();
  const responses=await Promise.all([1,2].map(()=>f.request('',{method:'POST',session:auth.session,key,body:input()})));
  assert.deepEqual(responses.map(r=>r.status),[202,202]);
  const receipt=await responses[0].json();assert.deepEqual(await responses[1].json(),receipt);
  assert.equal(receipt.state,'received');assert.equal(receipt.version,1);
  const jobs=await f.pg.query('SELECT * FROM atlas_feedback.jobs');assert.equal(jobs.rows.length,1);
  assert.equal(jobs.rows[0].state,'pending');
  assert(!JSON.stringify(jobs.rows[0]).includes('PRIVATE-CANARY'));
  assert.deepEqual(jobs.rows[0].payload.publicTask,input().publicTask);
  await assert.rejects(f.pg.query("UPDATE atlas_feedback.jobs SET payload='{}'"),/immutable/);
  const conflict=await f.request('',{method:'POST',session:auth.session,key,body:input('changed private')});assert.equal(conflict.status,409);
  const status=await f.request(`/${receipt.id}`,{session:auth.session});assert.equal(status.status,200);
  assert(!JSON.stringify(await status.json()).includes('PRIVATE-CANARY'));
  const list=await f.request('',{session:auth.session});assert.equal((await list.json()).items.length,1);
  const followKey=randomUUID(),followBody={...input('PRIVATE-FOLLOWUP'),expectedVersion:1};
  const follow=await f.request(`/${receipt.id}/followups`,{method:'POST',session:auth.session,key:followKey,body:followBody});
  assert.equal(follow.status,202);assert.deepEqual(await follow.json(),{id:receipt.id,state:'received',version:2});
  const followReplay=await f.request(`/${receipt.id}/followups`,{method:'POST',session:auth.session,key:followKey,body:followBody});assert.equal(followReplay.status,202);assert.equal((await followReplay.json()).version,2);
  const stale=await f.request(`/${receipt.id}/followups`,{method:'POST',session:auth.session,key:randomUUID(),body:followBody});assert.equal(stale.status,409);
  const versions=await f.pg.query('SELECT input_version,state,fencing_token,payload FROM atlas_feedback.jobs ORDER BY input_version');
  assert.deepEqual(versions.rows.map(r=>r.state),['cancelled','pending']);
  assert.equal(Number(versions.rows[0].fencing_token),1);
  assert(!JSON.stringify(versions.rows).includes('PRIVATE-'));
  await f.pg.query("UPDATE atlas_feedback.feedback SET state='merged',merged_sha=$1 WHERE id=$2",['a'.repeat(40),receipt.id]);
  const merged=await f.request(`/${receipt.id}/followups`,{method:'POST',session:auth.session,key:randomUUID(),body:{...input(),expectedVersion:2}});
  assert.equal((await merged.json()).state,'needs_human_review');
});

test('Next handlers load disabled without secrets, database connection or build-time IO',async()=>{
  const {GET}=await import('../src/app/api/feedback/config/route.ts');
  const response=await GET(new Request('https://www.plneuro.xyz/neuro-atlas/api/feedback/config'));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{enabled:false,connected:false});
  assert.match(response.headers.get('cache-control'),/no-store/);
});

test('health fails closed when singleton control is missing',async t=>{
  const f=await fixture(t);await f.pg.query('DELETE FROM atlas_feedback.control');
  const r=await f.request('/config');assert.deepEqual(await r.json(),{enabled:false,connected:false});
});
test('OAuth rejects nonowner numeric identity despite matching display login',async t=>{
  const f=await fixture(t,{owner:123});const state=random(),codeVerifier=random();
  await f.request('/auth/start',{method:'POST',body:{state,codeChallenge:digest(codeVerifier)}});
  const r=await f.request('/auth/finish',{method:'POST',body:{state,code:'synthetic-code',codeVerifier}});assert.equal(r.status,403);
  assert.equal((await f.pg.query('SELECT * FROM atlas_feedback.sessions')).rows.length,0);
});
test('OAuth verifier failure consumes state; expiry and malformed callbacks fail closed',async t=>{
  let time=new Date('2026-11-04T12:00:00Z');const f=await fixture(t,{clock:()=>time});
  const state=random(),codeVerifier=random();
  await f.request('/auth/start',{method:'POST',body:{state,codeChallenge:digest(codeVerifier)}});
  const wrong=await f.request('/auth/finish',{method:'POST',body:{state,code:'synthetic-code',codeVerifier:random()}});assert.equal(wrong.status,400);
  const retry=await f.request('/auth/finish',{method:'POST',body:{state,code:'synthetic-code',codeVerifier}});assert.equal(retry.status,400);
  assert.equal(f.providerRequests.length,0);
  const expired=random();await f.request('/auth/start',{method:'POST',body:{state:expired,codeChallenge:digest(codeVerifier)}});
  time=new Date(time.getTime()+300001);
  assert.equal((await f.request(`/auth/callback?state=${expired}&code=synthetic`)).status,400);
  assert.equal((await f.request('/auth/finish',{method:'POST',body:{state:expired,code:'synthetic-code',codeVerifier}})).status,400);
  assert.equal((await f.request('/auth/callback?state=x&code=%3Cscript%3E')).status,400);
  const {auth}=await signIn(f);time=new Date(time.getTime()+900001);
  assert.equal((await f.request('',{session:auth.session})).status,401);
});
test('exact origin, strict unknown-key schemas, same-owner status and byte limits guard all intake',async t=>{
  const f=await fixture(t);const {auth}=await signIn(f);const body=input();
  const post=(value,headers={},key=randomUUID())=>f.request('',{method:'POST',session:auth.session,key,body:value,headers});
  assert.equal((await post(body,{Origin:'https://www.plneuro.xyz.evil.example'})).status,403);
  assert.equal((await post(body,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await post({...body,githubId:82394590})).status,400);
  assert.equal((await post({...body,publicTask:{...body.publicTask,repo:'evil'}})).status,400);
  assert.equal((await post({...body,context:{...body.context,screenshot:'data:private'}})).status,400);
  assert.equal((await post({...body,context:{...body.context,targetId:'#password'}})).status,400);
  assert.equal((await post({...body,publicApproval:{approved:false,policyVersion:'atlas-feedback-v1'}})).status,400);
  assert.equal((await post(body,{},'not-a-uuid')).status,400);
  assert.equal((await post({...body,privateComment:'x'.repeat(17000)})).status,413);
  assert.equal((await f.request('',{headers:{Authorization:`Bearer ${auth.session}`,Cookie:`feedback=${auth.session}`}})).status,401);
  const accepted=await post(body);const receipt=await accepted.json();
  await f.pg.query('UPDATE atlas_feedback.feedback SET owner_github_id=42 WHERE id=$1',[receipt.id]);
  assert.equal((await f.request(`/${receipt.id}`,{session:auth.session})).status,404);
  assert.equal((await f.request(`/${receipt.id}/followups`,{method:'POST',session:auth.session,key:randomUUID(),body:{...body,expectedVersion:1}})).status,404);
  assert.deepEqual(await (await f.request('',{session:auth.session})).json(),{items:[]});
});
test('streamed byte limit is enforced without Content-Length and without parsing unbounded JSON',async t=>{
  const f=await fixture(t);const {auth}=await signIn(f);let cancelled=false;
  const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(' '.repeat(16385)));},cancel(){cancelled=true;}});
  const request=new Request(`${f.api.url}/api/feedback`,{method:'POST',duplex:'half',body:stream,headers:{Origin:f.api.url,'Content-Type':'application/json','X-Atlas-Feedback-Session':auth.session,'Idempotency-Key':randomUUID()}});
  const r=await f.handlers.create(request);assert.equal(r.status,413);assert.equal(cancelled,true);
  assert.equal((await f.pg.query('SELECT * FROM atlas_feedback.feedback')).rows.length,0);
});
test('configuration cannot enable preview origins, unconfigured owner or test overrides on Vercel',()=>{
  const valid={FEEDBACK_ENABLED:'true',FEEDBACK_PUBLIC_ORIGIN:'https://www.plneuro.xyz',FEEDBACK_GITHUB_CLIENT_ID:'synthetic',FEEDBACK_GITHUB_CLIENT_SECRET:'synthetic',FEEDBACK_OWNER_GITHUB_ID:'82394590',FEEDBACK_DATABASE_URL:'postgres://synthetic@localhost/test',NEXT_PUBLIC_BASE_PATH:'/neuro-atlas'};
  assert(loadFeedbackConfig(valid));
  for(const key of ['FEEDBACK_PUBLIC_ORIGIN','FEEDBACK_GITHUB_CLIENT_ID','FEEDBACK_GITHUB_CLIENT_SECRET','FEEDBACK_OWNER_GITHUB_ID','FEEDBACK_DATABASE_URL']) assert.equal(loadFeedbackConfig({...valid,[key]:undefined}),null);
  assert.equal(loadFeedbackConfig({...valid,FEEDBACK_OWNER_GITHUB_ID:'42'}),null);
  assert.equal(loadFeedbackConfig({...valid,FEEDBACK_PUBLIC_ORIGIN:'https://random.vercel.app'}),null);
  assert.equal(loadFeedbackConfig({...valid,FEEDBACK_PUBLIC_ORIGIN:'http://127.0.0.1:1234',FEEDBACK_TEST_MODE:'true',NODE_ENV:'test',VERCEL:'1'}),null);
  assert.equal(loadFeedbackConfig({...valid,FEEDBACK_PUBLIC_ORIGIN:'https://www.plneuro.xyz/'}),null);
});

test('actual PGlite filesystem restart retains session, feedback and idempotent receipt',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'atlas-feedback-pg-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  let pg=new PGlite(directory);await pg.exec(await migration());
  const f=await fixture(t,{pg});const {auth}=await signIn(f);const key=randomUUID();
  const r=await f.request('',{method:'POST',session:auth.session,key,body:input()});assert.equal(r.status,202);const receipt=await r.json();
  await pg.close();pg=new PGlite(directory);
  try {
    const restarted=await fixture(t,{pg});
    const replay=await restarted.request('',{method:'POST',session:auth.session,key,body:input()});assert.equal(replay.status,202);assert.deepEqual(await replay.json(),receipt);
    const status=await restarted.request(`/${receipt.id}`,{session:auth.session});assert.equal(status.status,200);assert.equal((await status.json()).version,1);
    assert.equal((await pg.query('SELECT * FROM atlas_feedback.jobs')).rows.length,1);
    const privateRows=await pg.query('SELECT input_private FROM atlas_feedback.feedback');assert.equal(privateRows.rows[0].input_private.privateComment,input().privateComment);
  }finally{await pg.close();}
});
test('transaction failure returns safe unavailable, never received, and rolls back all intake writes',async t=>{
  const f=await fixture(t);const {auth}=await signIn(f);
  await f.pg.exec(`CREATE FUNCTION atlas_feedback.synthetic_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic confidential database detail'; END $$; CREATE TRIGGER fail_intake BEFORE INSERT ON atlas_feedback.events FOR EACH ROW EXECUTE FUNCTION atlas_feedback.synthetic_failure();`);
  const r=await f.request('',{method:'POST',session:auth.session,key:randomUUID(),body:input()});assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('confidential'));
  for(const table of ['feedback','jobs','idempotency'])assert.equal((await f.pg.query(`SELECT * FROM atlas_feedback.${table}`)).rows.length,0);
});
test('provider outage cannot mint session and never leaks provider configuration',async t=>{
  const f=await fixture(t,{providerStatus:503}),state=random(),codeVerifier=random();
  await f.request('/auth/start',{method:'POST',body:{state,codeChallenge:digest(codeVerifier)}});
  const r=await f.request('/auth/finish',{method:'POST',body:{state,code:'synthetic-code',codeVerifier}});assert.equal(r.status,503);
  const response=JSON.stringify(await r.json());assert(!response.includes('synthetic'));assert(!response.includes('client_secret'));
  assert.equal((await f.pg.query('SELECT * FROM atlas_feedback.sessions')).rows.length,0);
});
test('auth admission rate limit is durable and shared by handlers',async t=>{
  const f=await fixture(t);
  for(let i=0;i<20;i++)assert.equal((await f.request('/auth/start',{method:'POST',body:{state:random(),codeChallenge:random()}})).status,200);
  const r=await f.request('/auth/start',{method:'POST',body:{state:random(),codeChallenge:random()}});assert.equal(r.status,429);
  assert.equal((await f.pg.query("SELECT count FROM atlas_feedback.rate_limits WHERE bucket='auth:start'")).rows[0].count,21);
});
test('approval digest binds exact approved task and complete context, not private comment',async()=>{
  const {publicApprovalHash}=await import('../src/lib/feedback/intake.ts');
  const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
  const a=input(),expected=createHash('sha256').update(canonical({policyVersion:'atlas-feedback-v1',publicTask:a.publicTask,publicContext:a.context})).digest('hex');
  assert.equal(publicApprovalHash(a),expected);
  assert.equal(publicApprovalHash(input('different private')),expected);
  assert.notEqual(publicApprovalHash({...a,publicTask:{...a.publicTask,title:'Different public title'}}),expected);
  assert.notEqual(publicApprovalHash({...a,context:{...a.context,viewport:{width:1281,height:800}}}),expected);
});

test('concurrent followups admit one new version and event history is append-only',async t=>{
  const f=await fixture(t);const {auth}=await signIn(f);
  const receipt=await (await f.request('',{method:'POST',session:auth.session,key:randomUUID(),body:input()})).json();
  const responses=await Promise.all([1,2].map(()=>f.request(`/${receipt.id}/followups`,{method:'POST',session:auth.session,key:randomUUID(),body:{...input(),expectedVersion:1}})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[202,409]);
  assert.equal((await f.pg.query("SELECT * FROM atlas_feedback.jobs WHERE state='pending'")).rows.length,1);
  await assert.rejects(f.pg.query("UPDATE atlas_feedback.events SET reason_code='changed'"),/append-only/);
  const malformed=await f.request(`/${receipt.id.toUpperCase()}/followups`,{method:'POST',session:auth.session,key:randomUUID(),body:{...input(),expectedVersion:2}});
  assert.equal(malformed.status,400);
});

test('bounded oversized collections and deeply nested unknown keys are rejected before durable writes',async t=>{
  const f=await fixture(t);const {auth}=await signIn(f);
  const oversized={...input(),publicTask:{...input().publicTask,acceptance:Array(3000).fill('')}};
  assert(Buffer.byteLength(JSON.stringify(oversized))<16384);
  const arrayResponse=await f.request('',{method:'POST',session:auth.session,key:randomUUID(),body:oversized});assert.equal(arrayResponse.status,400);
  const unknown={...input(),context:{...input().context,viewport:{width:1280,height:800,dom:{privateText:'PRIVATE-NESTED-CANARY'}}}};
  const unknownResponse=await f.request('',{method:'POST',session:auth.session,key:randomUUID(),body:unknown});assert.equal(unknownResponse.status,400);
  assert(!JSON.stringify(await unknownResponse.json()).includes('PRIVATE-NESTED-CANARY'));
  assert.equal((await f.pg.query('SELECT * FROM atlas_feedback.feedback')).rows.length,0);
});


test('one-field HTTP intake privately binds an element, retries immutably and fences mixed-mode followups',async t=>{
  const f=await fixture(t),{auth}=await signIn(f),key=randomUUID();
  const element={selector:'html > body > main:nth-of-type(1) > svg > g:nth-of-type(2) > path',tagName:'path',role:'img',classes:['PRIVATE_ELEMENT_CANARY']};
  const body={feedback:'PRIVATE_SIMPLE_CANARY: tighten this element',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context:{...input().context,element}};
  const post=(value,k=key)=>f.request('',{method:'POST',session:auth.session,key:k,body:value});
  const saved=await post(body);assert.equal(saved.status,202);
  const receipt=await saved.json();assert.equal(receipt.state,'received');assert.deepEqual(await (await post(body)).json(),receipt);
  assert.equal((await post({...body,context:{...body.context,element:{...element,selector:'html > body > main > button',tagName:'button'}}})).status,409);
  const row=(await f.pg.query('SELECT * FROM atlas_feedback.feedback')).rows[0],job=(await f.pg.query('SELECT * FROM atlas_feedback.jobs')).rows[0];
  assert.deepEqual(row.input_private,{feedback:body.feedback,element});
  assert.deepEqual(job.payload.privateInstruction,{feedback:body.feedback,element});
  assert.equal(row.approved_public.origin,'private-feedback-v1');assert.equal(row.approved_public.title,'Presentation update');
  assert.deepEqual(row.public_context,input().context);assert.deepEqual(job.payload.publicContext,row.public_context);
  assert.ok(!JSON.stringify([row.approved_public,row.public_context]).includes('PRIVATE_'));
  const {publicApprovalHash}=await import('../src/lib/feedback/intake.ts');
  const {approvalHash}=await import('../scripts/feedback/engine.ts');
  assert.equal(publicApprovalHash(body),row.approval_hash);assert.equal(approvalHash(job.payload.publicTask,job.payload.publicContext),row.approval_hash);
  await assert.rejects(f.pg.query("UPDATE atlas_feedback.jobs SET payload=jsonb_set(payload,'{privateInstruction,feedback}','\"changed\"')"),/immutable/);
  assert.ok(!JSON.stringify(await (await f.request('/'+receipt.id,{session:auth.session})).json()).includes('PRIVATE_'));
  const follow={...input('LEGACY_PRIVATE_CANARY'),expectedVersion:1};
  assert.equal((await f.request('/'+receipt.id+'/followups',{method:'POST',session:auth.session,key:randomUUID(),body:follow})).status,202);
  assert.equal((await f.request('/'+receipt.id+'/followups',{method:'POST',session:auth.session,key:randomUUID(),body:{...body,expectedVersion:1}})).status,409);
  const next=await f.request('/'+receipt.id+'/followups',{method:'POST',session:auth.session,key:randomUUID(),body:{...body,expectedVersion:2}});assert.equal(next.status,202);assert.equal((await next.json()).version,3);
  const jobs=(await f.pg.query('SELECT input_version,state,payload FROM atlas_feedback.jobs ORDER BY input_version')).rows;
  assert.deepEqual(jobs.map(j=>j.state),['cancelled','cancelled','pending']);assert.equal(jobs[1].payload.privateInstruction,undefined);assert.ok(!JSON.stringify(jobs).includes('LEGACY_PRIVATE_CANARY'));
});
