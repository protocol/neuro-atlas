import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,signIn,input} from './feedback-linear-server-fixture.test.mjs';

test('HTTP intake reads back explicit native issue and signed NON-synced comment before 202, retries exact identities',async t=>{
  const f=await fixture(t),{auth}=await signIn(f),key=randomUUID();
  const send=body=>f.request('',{method:'POST',session:auth.session,key,body});
  const response=await send(input());assert.equal(response.status,202);
  const receipt=await response.json();assert.deepEqual(receipt,{id:key,state:'received',version:1});
  assert.deepEqual(await (await send(input())).json(),receipt);
  assert.equal(f.state.issues.size,1);assert.equal(f.state.comments.size,1);
  const publicIssue=[...f.state.issues.values()][0], comment=[...f.state.comments.values()][0];
  for(const canary of ['PRIVATE-SYNTHETIC-CANARY','private-canary-class','main > h1','requestHash','signature','11111111-1111-4111-8111-111111111111'])assert(!JSON.stringify(publicIssue).replace(JSON.stringify(publicIssue.creator),'').includes(canary),canary);
  assert.match(comment.body,/PRIVATE-SYNTHETIC-CANARY/);
  const {parsePrivateComment,privateRecordHash}=await import('../src/lib/feedback-linear/server/records.ts');
  const record=parsePrivateComment(f.config,comment.body);assert.equal(record.feedbackId,key);assert.equal(record.operationId,key);assert.equal(record.version,1);assert.equal(record.input.processingConsent.policyVersion,'atlas-feedback-linear-v1');
  assert.match(privateRecordHash(record),/^[a-f0-9]{64}$/);
  const writes=f.state.requests.filter(r=>r.path==='/graphql').map(r=>JSON.parse(r.body));
  assert.equal(writes.find(r=>r.operationName==='AtlasIssueCreate').variables.input.id,key);
  assert.equal(writes.find(r=>r.operationName==='AtlasIssueCreate').variables.input.useDefaultTemplate,false);
  const privateWrite=writes.find(r=>r.operationName==='AtlasCommentCreate').variables.input;
  assert.equal(privateWrite.createOnSyncedSlackThread,false);assert.equal(privateWrite.parentId,undefined);
  assert.equal(writes.at(-1).operationName,'AtlasComments');
  assert.equal((await send(input('changed'))).status,409);
  const status=await f.request(`/${key}`,{session:auth.session});assert.equal(status.status,200);
  const safe=await status.json();assert.equal(safe.version,1);assert(!JSON.stringify(safe).includes('CANARY'));
  const list=await f.request('',{session:auth.session});assert.equal(list.status,200);assert.equal((await list.json()).items.length,1);
});


test('native unique next-version UUID arbitrates concurrent followups and immutable operation retry',async t=>{
  const f=await fixture(t),{auth}=await signIn(f),id=randomUUID();
  assert.equal((await f.request('',{method:'POST',session:auth.session,key:id,body:input()})).status,202);
  let key=randomUUID(),body={...input('FOLLOWUP-PRIVATE'),expectedVersion:1};
  const otherKey=randomUUID(),otherBody={...body,feedback:'OTHER-PRIVATE'};
  const send=(operation=key,value=body)=>f.request(`/${id}/followups`,{method:'POST',session:auth.session,key:operation,body:value});
  const race=await Promise.all([send(),send(otherKey,otherBody)]);
  assert.deepEqual(race.map(r=>r.status).sort(),[202,409]);
  if(race[1].status===202){key=otherKey;body=otherBody;}
  assert.equal((await send()).status,202);
  assert.equal((await send(key,{...body,feedback:'changed'})).status,409);
  assert.equal((await send(randomUUID())).status,409);
  const {parsePrivateComment,privateRecordHash,managedCommentId}=await import('../src/lib/feedback-linear/server/records.ts');
  const records=[...f.state.comments.values()].map(c=>parsePrivateComment(f.config,c.body)).sort((a,b)=>a.version-b.version);
  assert.equal(records.length,2);assert.equal(records[1].previousRecordHash,privateRecordHash(records[0]));
  assert(f.state.comments.has(managedCommentId(id,2)));
  assert.equal((await send(randomUUID(),{...input('THIRD'),expectedVersion:2})).status,202);
  assert.equal((await send()).status,202,'old identical operation remains retryable after later versions');
  assert.equal((await send(key,{...input('reused-operation'),expectedVersion:3})).status,409);
  assert.equal((await (await f.request(`/${id}`,{session:auth.session})).json()).version,3);
});


test('partial issue/comment writes never claim 202 until exact readback and resume the same identities',async t=>{
  const f=await fixture(t),{auth}=await signIn(f),id=randomUUID();
  const send=()=>f.request('',{method:'POST',session:auth.session,key:id,body:input()});
  f.state.failComment=true;let r=await send();assert.equal(r.status,503);assert.equal(f.state.issues.size,1);assert.equal(f.state.comments.size,0);assert(!JSON.stringify(await r.json()).includes('CANARY'));
  f.state.failComment=false;r=await send();assert.equal(r.status,202);assert.equal(f.state.issues.size,1);assert.equal(f.state.comments.size,1);
  f.state.hideComments=true;r=await send();assert.equal(r.status,503,'unverifiable comment is never a successful retry');
  f.state.hideComments=false;f.state.failIssueRead=true;r=await send();assert.equal(r.status,503);
});

test('tampering, synced threads, missing roots, gaps and changed project scope fail closed with safe errors',async t=>{
  const f=await fixture(t),{auth}=await signIn(f),id=randomUUID(),session=auth.session;
  await f.request('',{method:'POST',session,key:id,body:input()});
  const root=[...f.state.comments.values()][0],saved={...root};
  for(const patch of [{body:root.body.replace('PRIVATE-SYNTHETIC-CANARY','forged')},{body:'removed managed prefix'},{syncedWith:[{id:'synthetic-github'}]},{externalThread:{id:'synthetic-thread'}},{parent:{id:randomUUID()}},{user:{id:randomUUID()}},{archivedAt:new Date().toISOString()}]){
    Object.assign(root,saved,patch);const r=await f.request(`/${id}`,{session});assert.equal(r.status,409);assert(!JSON.stringify(await r.json()).includes('CANARY'));
  }
  Object.assign(root,saved);
  await f.request(`/${id}/followups`,{method:'POST',session,key:randomUUID(),body:{...input('VERSION-TWO'),expectedVersion:1}});
  f.state.comments.delete(root.id);assert.equal((await f.request(`/${id}`,{session})).status,409);
  f.state.comments.set(root.id,root);
  const issue=f.state.issues.get(id);issue.project.id=randomUUID();assert.equal((await f.request(`/${id}`,{session})).status,409);
});

test('strict Linear policy/structure, UUIDv4, origin, custom session namespace and streamed limits remain separate from legacy',async t=>{
  const f=await fixture(t),{auth}=await signIn(f),session=auth.session;
  const post=(body,headers={},key=randomUUID())=>f.request('',{method:'POST',body,headers,key,session});
  for(const body of [{...input(),processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'}},{...input(),publicTask:{title:'leak'}},{...input(),context:{...input().context,element:{selector:'#secret',tagName:'h1'}}},{...input(),context:{...input().context,element:{...input().context.element,text:'private text'}}}])assert.equal((await post(body)).status,400);
  assert.equal((await post(input(),{},'55555555-5555-5555-5555-555555555555')).status,400);
  assert.equal((await post(input(),{},randomUUID().toUpperCase())).status,400);
  assert.equal((await post(input(),{Origin:'https://evil.example'})).status,403);
  assert.equal((await post(input(),{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await f.request('',{headers:{Authorization:`Bearer ${session}`,Cookie:`session=${session}`}})).status,401);
  assert.equal((await post({...input(),feedback:'x'.repeat(17000)})).status,413);
  assert.equal(f.state.issues.size,0);
  let canceled=false;const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(' '.repeat(16385)));},cancel(){canceled=true;}});
  const r=await f.handlers.create(new Request(`${f.api.url}/api/feedback`,{method:'POST',duplex:'half',body:stream,headers:{Origin:f.api.url,'Content-Type':'application/json','X-Atlas-Feedback-Session':session,'Idempotency-Key':randomUUID()}}));
  assert.equal(r.status,413);assert(canceled);
  const {feedbackInputSchema}=await import('../src/lib/feedback/schema.ts');assert.equal(feedbackInputSchema.safeParse(input()).success,false);
});
