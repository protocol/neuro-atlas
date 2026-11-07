// Real HTTP/PKCE/service/witness/filesystem/controller composition. External identity and Linear peer are SYNTHETIC.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {fixture,signIn,input} from './feedback-linear-server-fixture.test.mjs';
import {httpWitness} from './feedback-linear-witness-http-fixture.test.mjs';
import {PrivateHost} from '../scripts/feedback-linear/host.ts';
import {ReviewController} from '../scripts/feedback-linear/controller.ts';
import {derivedKey} from '../src/lib/feedback-linear/server/crypto.ts';
import {managedCommentId} from '../src/lib/feedback-linear/server/records.ts';

test('SYNTHETIC identity/provider: actual website HTTP intake and independent witness compose with HOST/controller, including a correction created and deleted between worker polls',async t=>{
 const h=await httpWitness(t),f=await fixture(t,{witness:{url:h.url,token:h.writeToken}}),{auth}=await signIn(f),id=randomUUID();
 const body=input('Synthetic website-to-controller spacing note');
 const received=await f.request('',{method:'POST',session:auth.session,key:id,body});assert.equal(received.status,202);assert.equal((await received.json()).version,1);
 const keys=generateKeyPairSync('ed25519'),scope={issueId:id,ownerId:f.config.ownerId,workspaceId:f.config.workspaceId,workspace:f.config.workspaceKey,projectId:f.config.projectId,teamId:f.config.teamId};
 const inputPolicy={ownerId:scope.ownerId,workspace:scope.workspace,projectId:scope.projectId,teamId:scope.teamId,hostPublicKey:keys.publicKey,recordKey:derivedKey(f.config,'atlas-linear-private-v1')};
 const host=new PrivateHost({scope,inputPolicy,signingKey:keys.privateKey},{native:async()=>{
  const issue=f.state.issues.get(id);
  return {workspace:{id:scope.workspaceId,url:'https://linear.app/'+scope.workspace},issue:{id:issue.identifier,uuid:issue.id,title:issue.title,description:issue.description,url:issue.url,projectId:issue.project.id,teamId:issue.team.id,createdById:issue.creator.id,archivedAt:issue.archivedAt,updatedAt:issue.updatedAt},comments:[...f.state.comments.values()].filter(c=>c.issue.id===id).map(c=>({...c,quotedText:null})),complete:true};
 }});
 const c=new ReviewController({enabled:true,root:h.root+'/jobs-never-claimed',repo:h.root,inputPolicy,historyWitness:h.w,channelId:'C000SYNTHETIC',reviewerIds:['U000SYNTHETIC'],capturePublicKey:keys.publicKey,readNative:()=>host.readNative(),mainOrigin:'https://api.github.com',maxTokens:10000,maxWallMs:20000,proposalTtlMs:3600000,maxJobUsd:1,maxDayUsd:5,model:{},modelKey:()=>{throw Error('NO_MODEL_ALLOWED');}});
 assert.equal((await c.assertCurrentInput()).record.input.feedback,body.feedback);
 const correction=await f.request('/'+id+'/followups',{method:'POST',session:auth.session,key:randomUUID(),body:{...input('New synthetic correction'),expectedVersion:1}});
 assert.equal(correction.status,202); // Worker has not observed version2.
 f.state.comments.delete(managedCommentId(id,2));
 const before=f.state.requests.filter(r=>r.body.includes('"operationName":"AtlasIssueCreate"')||r.body.includes('"operationName":"AtlasCommentCreate"')).length;
 await assert.rejects(c.assertCurrentInput(),/witness_history_mismatch/);
 assert.notEqual((await f.request('/'+id,{session:auth.session})).status,200);
 assert.notEqual((await f.request('',{method:'POST',session:auth.session,key:id,body})).status,202);
 assert.equal(f.state.requests.filter(r=>r.body.includes('"operationName":"AtlasIssueCreate"')||r.body.includes('"operationName":"AtlasCommentCreate"')).length,before,'no source mutation resurrects deleted history');
});
