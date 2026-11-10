import test from 'node:test';
import assert from 'node:assert/strict';
import {ids} from './feedback-linear-server-fixture.test.mjs';
import {loadLinearConfig} from '../src/lib/feedback-linear/server/config.ts';
const env={FEEDBACK_ENABLED:'true',FEEDBACK_BACKEND:'linear',FEEDBACK_PUBLIC_ORIGIN:'https://www.plneuro.xyz',FEEDBACK_LINEAR_CLIENT_ID:'synthetic',FEEDBACK_LINEAR_OWNER_ID:ids.ownerId,FEEDBACK_LINEAR_WORKSPACE_ID:ids.workspaceId,FEEDBACK_LINEAR_WORKSPACE_KEY:'synthetic-workspace',FEEDBACK_LINEAR_PROJECT_ID:ids.projectId,FEEDBACK_LINEAR_TEAM_ID:ids.teamId,FEEDBACK_LINEAR_SESSION_KEY:Buffer.alloc(32,7).toString('base64url'),FEEDBACK_LINEAR_SYNC_AUDIT:'ordinary-comments-isolated-v1'};
test('witness configuration is server-only, exact HTTPS endpoint, paired opaque token and no implicit fixture downgrade',()=>{
 const url='https://witness.example.invalid/v1/intake-witness',token=Buffer.alloc(32,9).toString('base64url'),full={...env,FEEDBACK_LINEAR_WITNESS_URL:url,FEEDBACK_LINEAR_WITNESS_TOKEN:token};
 assert.deepEqual(loadLinearConfig(full).witness,{url,token});assert.equal(loadLinearConfig(env).witness,undefined);
 for(const patch of [{FEEDBACK_LINEAR_WITNESS_URL:undefined},{FEEDBACK_LINEAR_WITNESS_TOKEN:undefined},{FEEDBACK_LINEAR_WITNESS_TOKEN:'not-valid'},{FEEDBACK_LINEAR_WITNESS_URL:'http://127.0.0.1:1/v1/intake-witness'},{FEEDBACK_LINEAR_WITNESS_URL:url+'?secret=bad'},{FEEDBACK_LINEAR_WITNESS_URL:'https://user:bad@witness.example.invalid/v1/intake-witness'},{FEEDBACK_LINEAR_WITNESS_URL:url+'/'}])assert.equal(loadLinearConfig({...full,...patch}),null);
});
