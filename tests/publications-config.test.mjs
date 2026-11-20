import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('three isolated data feeds and two held feature branches are suppressed without disabling main',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.deepEqual(config.git.deploymentEnabled,{'data/google-trends-feed':false,'data/openalex-citation-latency-feed':false,'data/openalex-publications-feed':false,'feat/persistent-graph-pages-20261119':false,'feat/graph-comparison-dashboards-20261119':false});
 assert.equal(config.git.deploymentEnabled.main,undefined);
});
