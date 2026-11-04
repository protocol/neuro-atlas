import test from 'node:test';
import assert from 'node:assert/strict';
const url=new URL('../scripts/feedback-linear/host-runtime.ts',import.meta.url);
test('private HOST runtime is OFF without exact enable and names missing setup rather than fake success',async()=>{
 const {hostRuntimeMain}=await import(url.href);
 assert.deepEqual(await hostRuntimeMain(['publish','not-an-id'],{}),{state:'disabled'});
 assert.deepEqual(await hostRuntimeMain(['prepare'],{ATLAS_LINEAR_HOST_ENABLED:'false',ATLAS_LINEAR_HOST_CONFIG:'/does/not/exist'}),{state:'disabled'});
 await assert.rejects(hostRuntimeMain(['status','44444444-4444-4444-8444-444444444444'],{ATLAS_LINEAR_HOST_ENABLED:'true'}),/host_setup_missing:ATLAS_LINEAR_HOST_CONFIG/);
 await assert.rejects(hostRuntimeMain(['sign','anything'],{ATLAS_LINEAR_HOST_ENABLED:'true'}),/host_blocked:command/);
 await assert.rejects(hostRuntimeMain(['decide','44444444-4444-4444-8444-444444444444','{"speakerId":"U123","approved":true}'],{ATLAS_LINEAR_HOST_ENABLED:'true'}),/host_blocked:source_message/);
});

import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('HOST config does not demand an Anthropic provider, selected model prices or invented dollar limits; account-controller setup is explicit',async()=>{
 const {hostRuntimeMain}=await import(url.href),dir=await mkdtemp(path.join(tmpdir(),'host-runtime-account-'));
 const config={root:path.join(dir,'state'),repo:dir,scope:{issueId:'44444444-4444-4444-8444-444444444444',ownerId:'11111111-1111-4111-8111-111111111111',projectId:'22222222-2222-4222-8222-222222222222',teamId:'33333333-3333-4333-8333-333333333333',workspaceId:'55555555-5555-4555-8555-555555555555',workspace:'synthetic'},slack:{channelId:'C000SYNTH',verifiedHumanReviewerIds:['U000HUMAN'],botIds:['U000BOT']},hostPublicKeyPath:path.join(dir,'host.pub'),capturePublicKeyPath:path.join(dir,'capture.pub'),hostSigningKeyEnv:'ATLAS_SYNTHETIC_HOST_SIGNER',recordKeyEnv:'ATLAS_SYNTHETIC_RECORD_KEY',publisherSigningKeyEnv:'ATLAS_SYNTHETIC_PUBLISHER_SIGNER',githubTokenEnv:'ATLAS_SYNTHETIC_INSTALLATION',reviewerVerificationReferences:{U000HUMAN:'SYNTHETIC fixture identity source'},syncAuditReference:'SYNTHETIC fixture audit'};
 try{const file=path.join(dir,'config.json');await writeFile(file,JSON.stringify(config),{mode:0o600});
 await assert.rejects(hostRuntimeMain(['prepare'],{ATLAS_LINEAR_HOST_ENABLED:'true',ATLAS_LINEAR_HOST_CONFIG:file}),/host_setup_missing:OWNER_ACCOUNT_CONTROLLER/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
