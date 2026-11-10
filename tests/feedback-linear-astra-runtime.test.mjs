import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runtimeMain} from '../scripts/feedback-linear/runtime.ts';
import {PrivateFiles} from '../scripts/feedback-linear/files.ts';

test('operator count mode accepts explicit account/quota/positive bounds with no Anthropic key or USD fields',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'astra-operator-'));
  try {
    const id='44444444-4444-4444-8444-444444444444',root=path.join(dir,'private'),store=new PrivateFiles(root);
    await store.lock(async state=>{state.jobs[id]={state:'parked',fence:1,inputHash:'a'.repeat(64)};await store.save(state);});
    const publicKey=generateKeyPairSync('ed25519').publicKey.export({format:'pem',type:'spki'});
    await writeFile(path.join(dir,'host.pem'),publicKey,{mode:0o600});
    const config={root,repo:dir,nativeReadPath:path.join(dir,'native.json'),hostPublicKeyPath:path.join(dir,'host.pem'),capturePublicKeyPath:path.join(dir,'host.pem'),ownerId:'11111111-1111-4111-8111-111111111111',workspace:'synthetic',projectId:'22222222-2222-4222-8222-222222222222',teamId:'33333333-3333-4333-8333-333333333333',channelId:'C_SYNTHETIC',reviewerIds:['U_SYNTHETIC'],maxTokens:50000,maxWallMs:20000,proposalTtlMs:3600000,provider:'hermes-astra',budget:{kind:'attempts',maxAttemptsPerDay:5,timeZone:'Europe/Berlin'},model:{account:'hermes-default-openai-codex',model:'gpt-6-astra',maxTurns:1,maxInputTokens:40000,maxOutputTokens:1000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000}};
    const file=path.join(dir,'operator.json');await writeFile(file,JSON.stringify(config),{mode:0o600});
    const env={ATLAS_LINEAR_REVIEW_ENABLED:'true',ATLAS_LINEAR_REVIEW_CONFIG:file,ATLAS_LINEAR_REVIEW_RECORD_KEY:Buffer.alloc(32,17).toString('base64url')};
    assert.equal((await runtimeMain(['status',id],env)).state,'parked');
    for(const changed of [{...config,maxJobUsd:5},{...config,model:{...config.model,fixture:true,fixtureOrigin:'http://127.0.0.1:1234'}},{...config,budget:{...config.budget,maxAttemptsPerDay:6}},{...config,provider:'unknown'}]) {
      await writeFile(file,JSON.stringify(changed));await assert.rejects(runtimeMain(['status',id],env),/runtime_blocked/);
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});
