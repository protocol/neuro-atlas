import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('all three isolated data feeds are suppressed without disabling app deployments',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.deepEqual(config.git.deploymentEnabled,{'data/google-trends-feed':false,'data/openalex-citation-latency-feed':false,'data/openalex-publications-feed':false});
 assert.equal(config.git.deploymentEnabled.main,undefined);
});
