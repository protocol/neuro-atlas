import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('approved isolated data feeds and all held feature branches are suppressed without disabling main',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.deepEqual(config.git.deploymentEnabled,{'data/google-trends-feed':false,'data/openalex-citation-latency-feed':false,'data/openalex-publications-feed':false,'feat/bci-sensory-reference-only-20261120':false,'feat/persistent-graph-pages-20261119':false,'feat/graph-comparison-dashboards-20261119':false,'feat/shareable-chart-pages-20261120':false});
 assert.equal(config.git.deploymentEnabled.main,undefined);
});
