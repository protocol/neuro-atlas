import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentNeuronFileHash} from './helpers/neuron-reference-current.mjs';
import {createHash} from 'node:crypto';
import {restoreReviewedFile,validateReviewedFilesFixture} from '../scripts/qa/build-reviewed-delta.mjs';
import {parseCsv} from '../scripts/lib/funding-index.mjs';
import {restoreCopyMainFile,restoreMerged151Copy} from './helpers/sitewide-copy-baseline.mjs';
const lock=JSON.parse(readFileSync(new URL('./fixtures/financing-copy-current-revision-20261125.json',import.meta.url),'utf8'));
const fixture=validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('./fixtures/sitewide-copy-delta-20261125.json',import.meta.url),'utf8')));
const sha=s=>createHash('sha256').update(s).digest('hex');
const root=new URL('../',import.meta.url);
test('site-wide reader copy matches every independently reviewed exact source and generated file',()=>{
 for(const [file,digest] of Object.entries(lock.files))assert.equal(sha(readFileSync(new URL(file,root))),currentNeuronFileHash(file,digest),file);
});
test('M→B restores every immutable original copy after hash before prose-only comparisons',()=>{
 for(const file of fixture.files)assert.equal(sha(restoreCopyMainFile(readFileSync(new URL(file.path,root),'utf8'),file.path)),file.afterSha256,file.path);
});
test('every reviewed copy edit reverses to the exact merged-151 bytes without refreshing a historical golden',()=>{
 for(const file of fixture.files) {
  const current=readFileSync(new URL(file.path,root),'utf8');
  assert.equal(sha(restoreMerged151Copy(current,file.path)),file.beforeSha256,file.path);
 }
});
function verifyProseOnly(before,after,location,allowed) {
 assert.equal(typeof before,typeof after,location);
 if(before===null||typeof before!=='object') {
  if(before!==after){assert.equal(typeof before,'string',location);assert.ok(allowed.has(location.split('/').at(-1)),location);}
  return;
 }
 assert.deepEqual(Object.keys(after),Object.keys(before),location+': identities and array lengths');
 for(const key of Object.keys(before))verifyProseOnly(before[key],after[key],location+'/'+key,allowed);
}
test('all canonical CSV and generated/curated JSON changes are prose-only: values, dates, IDs and source fields stay exact',()=>{
 for(const file of fixture.files.filter(e=>/\.(json|csv)$/.test(e.path))) {
  const current=restoreCopyMainFile(readFileSync(new URL(file.path,root),'utf8'),file.path);const original=restoreReviewedFile(current,fixture,file.path);
  if(file.path.startsWith('public/data/google-trends/')) {
   assert.deepEqual(current.split('\n').slice(2),original.split('\n').slice(2),file.path+': all CSV data rows and column names');
   assert.equal(current.split('\n')[0],original.split('\n')[0],file.path+': source dates and normalization scope');
   continue;
  }
  const parse=file.path.endsWith('.csv')?parseCsv:JSON.parse;
  verifyProseOnly(parse(original),parse(current),file.path,new Set(['note','notes','definition','basis']));
 }
});
test('unlisted numeric or source-field mutations cannot pass the reviewed byte reconstruction',()=>{
 const file=fixture.files.find(e=>e.path==='src/data/funding-index.json');
 const current=readFileSync(new URL(file.path,root),'utf8');
 const mutated=JSON.parse(current);mutated.summary.observedCapitalUsdM+=1;
 let restored;try{restored=restoreMerged151Copy(JSON.stringify(mutated),file.path);}catch{return;}
 assert.notEqual(sha(restored),file.beforeSha256);
});
