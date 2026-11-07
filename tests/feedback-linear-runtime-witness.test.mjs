import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import * as runtime from '../scripts/feedback-linear/runtime.ts';

test('fixed operator factory binds concrete independent witness without initializing it or calling a model',async t=>{
 assert.equal(typeof runtime.loadReviewController,'function','operator factory must be executable without arbitrary module hooks');
 const dir=await mkdtemp('/opt/data/tmp/atlas-runtime-witness-');t.after(()=>rm(dir,{recursive:true,force:true}));
 const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({format:'pem',type:'spki'});
 await writeFile(dir+'/host.pem',publicKey,{mode:0o600});
 const config={root:dir+'/jobs',repo:dir,nativeReadPath:dir+'/missing-native.json',hostPublicKeyPath:dir+'/host.pem',capturePublicKeyPath:dir+'/host.pem',historyWitnessRoot:dir+'/uninitialized-witness',workspaceId:'55555555-5555-4555-8555-555555555555',ownerId:'11111111-1111-4111-8111-111111111111',workspace:'synthetic',projectId:'22222222-2222-4222-8222-222222222222',teamId:'33333333-3333-4333-8333-333333333333',channelId:'C000SYNTHETIC',reviewerIds:['U000SYNTHETIC'],maxTokens:50000,maxWallMs:20000,proposalTtlMs:3600000,provider:'hermes-astra',budget:{kind:'attempts',maxAttemptsPerDay:5,timeZone:'Europe/Berlin'},model:{account:'hermes-default-openai-codex',model:'gpt-6-astra',maxTurns:1,maxInputTokens:40000,maxOutputTokens:1000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000}};
 await writeFile(dir+'/review.json',JSON.stringify(config),{mode:0o600});
 const env={ATLAS_LINEAR_REVIEW_ENABLED:'true',ATLAS_LINEAR_REVIEW_CONFIG:dir+'/review.json',ATLAS_LINEAR_REVIEW_RECORD_KEY:Buffer.alloc(32,17).toString('base64url')};
 const c=await runtime.loadReviewController(env);
 assert.equal(c.config.provider,'hermes-astra');assert.equal(c.config.historyWitness.scope.workspaceId,config.workspaceId);
 assert.equal(c.config.historyWitness.root,config.historyWitnessRoot);
 await assert.rejects(c.assertCurrentInput(),error=>error.code==='ENOENT' && error.path===config.historyWitnessRoot);
 await assert.rejects(runtime.loadReviewController({...env,ATLAS_LINEAR_REVIEW_ENABLED:'false'}),/runtime_blocked/);
 const id='44444444-4444-4444-8444-444444444444';
 const {PrivateFiles}=await import('../scripts/feedback-linear/files.ts');
 const store=new PrivateFiles(config.root);
 await store.lock(async state=>{state.jobs[id]={state:'parked',fence:1,inputHash:'a'.repeat(64)};await store.save(state);});
 const hostConfig={root:config.root,repo:dir,reviewConfigPath:dir+'/review.json',scope:{issueId:id,workspaceId:config.workspaceId,workspace:config.workspace,ownerId:config.ownerId,projectId:config.projectId,teamId:config.teamId},slack:{channelId:config.channelId,verifiedHumanReviewerIds:config.reviewerIds,botIds:['U000BOT']},hostPublicKeyPath:dir+'/host.pem',capturePublicKeyPath:dir+'/host.pem',hostSigningKeyEnv:'SYNTHETIC_HOST_SIGNER',recordKeyEnv:'SYNTHETIC_RECORD_KEY',publisherSigningKeyEnv:'SYNTHETIC_PUBLISHER_SIGNER',githubTokenEnv:'SYNTHETIC_GITHUB',reviewerVerificationReferences:{U000SYNTHETIC:'Synthetic fixture human identity'},syncAuditReference:'Synthetic fixture sync audit'};
 await writeFile(dir+'/host.json',JSON.stringify(hostConfig),{mode:0o600});
 const {hostRuntimeMain}=await import('../scripts/feedback-linear/host-runtime.ts');
 const actual=await hostRuntimeMain(['status',id],{...env,ATLAS_LINEAR_HOST_ENABLED:'true',ATLAS_LINEAR_HOST_CONFIG:dir+'/host.json',SYNTHETIC_HOST_SIGNER:keys.privateKey.export({format:'pem',type:'pkcs8'}),SYNTHETIC_RECORD_KEY:env.ATLAS_LINEAR_REVIEW_RECORD_KEY});
 assert.equal(actual.state,'parked','standalone HOST must construct the selected count-mode controller using only its fixed factory');
});
