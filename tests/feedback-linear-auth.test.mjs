import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes, randomUUID, createHash} from 'node:crypto';

export const opaque = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('base64url');
export function linearEnv(origin = 'https://www.plneuro.xyz') {
  return {FEEDBACK_ENABLED:'true', FEEDBACK_BACKEND:'linear', FEEDBACK_PUBLIC_ORIGIN:origin,
    FEEDBACK_LINEAR_CLIENT_ID:'synthetic-public-client', FEEDBACK_LINEAR_OWNER_ID:'11111111-1111-4111-8111-111111111111',
    FEEDBACK_LINEAR_WORKSPACE_ID:'22222222-2222-4222-8222-222222222222', FEEDBACK_LINEAR_WORKSPACE_KEY:'synthetic-workspace',
    FEEDBACK_LINEAR_PROJECT_ID:'33333333-3333-4333-8333-333333333333', FEEDBACK_LINEAR_TEAM_ID:'44444444-4444-4444-8444-444444444444',
    FEEDBACK_LINEAR_SESSION_KEY:Buffer.alloc(32,7).toString('base64url'), FEEDBACK_LINEAR_SYNC_AUDIT:'ordinary-comments-isolated-v1',
    NEXT_PUBLIC_BASE_PATH:'/neuro-atlas'};
}

test('Linear configuration is explicitly opt-in, database-free, fixed-origin and blocked until sync audit', async () => {
  const {loadLinearConfig} = await import('../src/lib/feedback-linear/server/config.ts');
  const env = linearEnv();
  const config = loadLinearConfig(env);
  assert(config);
  assert.equal(config.callbackUrl, 'https://www.plneuro.xyz/neuro-atlas/api/feedback/auth/callback');
  assert.equal(config.databaseUrl, undefined);
  for (const key of ['FEEDBACK_ENABLED','FEEDBACK_BACKEND','FEEDBACK_LINEAR_CLIENT_ID','FEEDBACK_LINEAR_OWNER_ID','FEEDBACK_LINEAR_WORKSPACE_ID','FEEDBACK_LINEAR_WORKSPACE_KEY','FEEDBACK_LINEAR_PROJECT_ID','FEEDBACK_LINEAR_TEAM_ID','FEEDBACK_LINEAR_SESSION_KEY','FEEDBACK_LINEAR_SYNC_AUDIT']) {
    assert.equal(loadLinearConfig({...env,[key]:undefined}), null, key);
  }
  for (const patch of [{FEEDBACK_BACKEND:'postgres'}, {FEEDBACK_PUBLIC_ORIGIN:'https://preview.vercel.app'}, {FEEDBACK_PUBLIC_ORIGIN:'https://www.plneuro.xyz/'}, {FEEDBACK_LINEAR_OWNER_ID:randomUUID().toUpperCase()}, {FEEDBACK_LINEAR_SESSION_KEY:'not-a-key'}, {FEEDBACK_TEST_MODE:'true',NODE_ENV:'production'}, {FEEDBACK_TEST_MODE:'true',NODE_ENV:'test',VERCEL:'1'}]) assert.equal(loadLinearConfig({...env,...patch}), null);
});


import {fixture, signIn, ids} from './feedback-linear-server-fixture.test.mjs';
test('real HTTP public PKCE returns only sealed page-memory session, revalidates identity and revokes upstream', async t => {
  const f=await fixture(t), {auth,start,body}=await signIn(f);
  const url=new URL(start.authorizeUrl);
  assert.equal(url.searchParams.get('scope'),'read,issues:create,comments:create');
  assert.equal(url.searchParams.get('actor'),'user');
  assert.equal(url.searchParams.get('response_type'),'code');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(auth.provider,'linear');assert.equal(auth.actor.linearId,ids.ownerId);
  assert.equal(auth.actor.workspaceId,ids.workspaceId);assert.equal(auth.actor.githubId,undefined);
  assert(!JSON.stringify(auth).includes('synthetic-linear-access'));assert(!JSON.stringify(auth).includes('synthetic-refresh'));
  assert.equal(Date.parse(auth.expiresAt)-f.state.clock,900000);
  const token=new URLSearchParams(f.state.requests.find(r=>r.path==='/token').body);
  assert.equal(token.get('code_verifier'),body.codeVerifier);assert.equal(token.has('client_secret'),false);
  assert.equal(token.get('grant_type'),'authorization_code');
  const callback=await f.request(`/auth/callback?state=${body.state}&code=synthetic-code`);
  assert.equal(callback.status,200);assert.equal(callback.headers.has('set-cookie'),false);
  assert.match(callback.headers.get('cache-control'),/no-store/);assert.match(callback.headers.get('x-robots-tag'),/noindex/);
  assert.match(callback.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(await callback.text(),/postMessage/);
  assert.equal((await f.request('/auth/finish',{method:'POST',body})).status,503);
  const actor=await f.service.actor(auth.session);assert.equal(actor.linearId,ids.ownerId);
  f.state.ownerId=randomUUID();await assert.rejects(f.service.actor(auth.session),e=>e.status===403);
  f.state.ownerId=ids.ownerId;
  const revoked=await f.request('/auth/session',{method:'DELETE',session:auth.session});assert.equal(revoked.status,204);
  await assert.rejects(f.service.actor(auth.session),e=>e.status===401);
  assert(f.state.requests.some(r=>r.path==='/revoke'));
});


test('transaction proof rejects state/verifier/origin/tampering/expiry before upstream exchange; sealed sessions expire',async t=>{
  const f=await fixture(t),{auth,body}=await signIn(f),calls=f.state.requests.filter(r=>r.path==='/token').length;
  for(const patch of [{state:opaque()},{codeVerifier:opaque()},{transaction:body.transaction.slice(0,-4)+'AAAA'}])assert([400,401].includes((await f.request('/auth/finish',{method:'POST',body:{...body,...patch,code:randomUUID()}})).status));
  assert.equal((await f.request('/auth/finish',{method:'POST',body:{...body,code:randomUUID()},headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal(f.state.requests.filter(r=>r.path==='/token').length,calls);
  f.state.clock+=300001;
  assert.equal((await f.request('/auth/finish',{method:'POST',body:{...body,code:randomUUID()}})).status,400);
  f.state.clock+=600000;
  await assert.rejects(f.service.actor(auth.session),e=>e.status===401);
  await assert.rejects(f.service.actor(auth.session.slice(0,-4)+'AAAA'),e=>e.status===401);
});

test('identity allowlists and excess scopes cannot mint a usable session',async t=>{
  const f=await fixture(t);
  for(const [field,bad,good] of [['ownerId',randomUUID(),ids.ownerId],['workspaceId',randomUUID(),ids.workspaceId],['workspaceKey','wrong-workspace','synthetic-workspace'],['projectId',randomUUID(),ids.projectId],['teamId',randomUUID(),ids.teamId],['active',false,true],['guest',true,false],['scope','read write','read issues:create comments:create']]){
    f.state[field]=bad;const state=opaque(),codeVerifier=opaque();
    const start=await (await f.request('/auth/start',{method:'POST',body:{state,codeChallenge:digest(codeVerifier)}})).json();
    const finish=await f.request('/auth/finish',{method:'POST',body:{state,codeVerifier,code:randomUUID(),transaction:start.transaction}});
    assert([403,503].includes(finish.status),field);const error=await finish.json();assert(!JSON.stringify(error).includes('synthetic-linear-access'));
    f.state[field]=good;
  }
});


test('actual Next route dispatch opts into database-free Linear and never falls back to configured PostgreSQL',async()=>{
  const keys={...linearEnv(),FEEDBACK_DATABASE_URL:'postgres://synthetic@127.0.0.1:1/never-connect',FEEDBACK_GITHUB_CLIENT_ID:'synthetic',FEEDBACK_GITHUB_CLIENT_SECRET:'synthetic',FEEDBACK_OWNER_GITHUB_ID:'82394590'};
  const previous=Object.fromEntries(Object.keys(keys).map(k=>[k,process.env[k]]));
  try {
    Object.assign(process.env,keys);
    const {GET}=await import('../src/app/api/feedback/config/route.ts');
    let r=await GET(new Request('https://www.plneuro.xyz/neuro-atlas/api/feedback/config'));
    assert.deepEqual(await r.json(),{enabled:true,connected:true,provider:'linear',policyVersion:'atlas-feedback-linear-v1'});
    delete process.env.FEEDBACK_LINEAR_SESSION_KEY;
    r=await GET(new Request('https://www.plneuro.xyz/neuro-atlas/api/feedback/config'));
    assert.deepEqual(await r.json(),{enabled:false,connected:false,provider:'linear',policyVersion:'atlas-feedback-linear-v1'});
    const {getFeedbackRuntime}=await import('../src/lib/feedback/runtime.ts');assert.equal(getFeedbackRuntime(),null);
  }finally{for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});


test('preview owner callback allows ONLY exact trusted Vercel branch origin and never Host/wildcards',async()=>{
  const {loadLinearConfig}=await import('../src/lib/feedback-linear/server/config.ts');
  const host='atlas-git-feedback-synthetic.vercel.app',origin=`https://${host}`,env={...linearEnv(origin),VERCEL:'1',VERCEL_ENV:'preview',VERCEL_BRANCH_URL:host};
  assert.equal(loadLinearConfig(env)?.callbackUrl,`${origin}/neuro-atlas/api/feedback/auth/callback`);
  for(const patch of [{VERCEL_ENV:'production'},{VERCEL_ENV:undefined},{VERCEL_BRANCH_URL:undefined},{VERCEL_BRANCH_URL:'https://'+host},{VERCEL_BRANCH_URL:host+'/'},{VERCEL_BRANCH_URL:'evil.example/'+host},{VERCEL_BRANCH_URL:'user@'+host},{VERCEL_BRANCH_URL:host+':443'},{VERCEL_BRANCH_URL:'*.'+host},{VERCEL_BRANCH_URL:host+'?q=x'},{FEEDBACK_PUBLIC_ORIGIN:origin+'/'},{FEEDBACK_PUBLIC_ORIGIN:'https://another-preview.vercel.app'},{FEEDBACK_PUBLIC_ORIGIN:'http://'+host},{FEEDBACK_TEST_MODE:'true',NODE_ENV:'test'}])assert.equal(loadLinearConfig({...env,...patch}),null,JSON.stringify(patch));
  assert.equal(loadLinearConfig({...linearEnv(origin),HOST:host,HTTP_X_FORWARDED_HOST:host}),null);
  assert(loadLinearConfig({...linearEnv(),VERCEL_ENV:'production',VERCEL_BRANCH_URL:host}));
});
