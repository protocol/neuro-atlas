import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
test('application configuration suppresses only the three approved data branches',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 assert.deepEqual(config.git.deploymentEnabled,{'data/google-trends-feed':false,'data/openalex-citation-latency-feed':false,'data/openalex-publications-feed':false});
});
test('CLI refuses publish without a prior stage/expected ref and refuses automatic absent bootstrap',()=>{
 for(const args of [['--publish'],['--publish','--staged','.qa/absent','--expected','absent']]){
  const result=spawnSync(process.execPath,['--import','tsx','scripts/weekly-citation-latency-feed.ts',...args],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/stage|expected|bootstrap/i);
 }
});
