import test from 'node:test';
import {PR144_MAIN_INTEGRATION,restorePr144Integration} from './helpers/pr144-main-integration.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {restoreReviewedFile,validateReviewedFilesFixture} from '../scripts/qa/build-reviewed-delta.mjs';
import {parseCsv} from '../scripts/lib/funding-index.mjs';
const fixture=validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('./fixtures/sitewide-copy-delta-20261125.json',import.meta.url),'utf8')));
const sha=s=>createHash('sha256').update(s).digest('hex');
const root=new URL('../',import.meta.url);
test('site-wide reader copy matches every independently reviewed exact source and generated file',()=>{
 for(const file of fixture.files) {
  const current=readFileSync(new URL(file.path,root),'utf8');
  const integration=PR144_MAIN_INTEGRATION.files.find(entry=>entry.path===file.path);
  if(integration)assert.equal(integration.beforeSha256,file.afterSha256,file.path+': independent accepted-main hash');
  assert.equal(sha(current),integration?.afterSha256 ?? file.afterSha256,file.path+': exact accepted-parent composition');
  assert.equal(sha(restorePr144Integration(current,file.path)),file.afterSha256,file.path+': exact accepted main');
 }
});
test('every reviewed copy edit reverses to the exact merged-151 bytes without refreshing a historical golden',()=>{
 for(const file of fixture.files) {
  const current=readFileSync(new URL(file.path,root),'utf8');
  assert.equal(sha(restoreReviewedFile(restorePr144Integration(current,file.path),fixture,file.path)),file.beforeSha256,file.path);
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
  const current=readFileSync(new URL(file.path,root),'utf8');const original=restoreReviewedFile(restorePr144Integration(current,file.path),fixture,file.path);
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
 for(const mutate of [data=>{data.summary.observedCapitalUsdM+=1;},data=>{data.rounds[0].sourceUrl='https://invalid.example/unreviewed-source';}]) {
  const mutated=JSON.parse(current);mutate(mutated);
  let rejected=false;
  try {rejected=sha(restoreReviewedFile(restorePr144Integration(JSON.stringify(mutated),file.path),fixture,file.path))!==file.beforeSha256;}catch {rejected=true;}
  assert.ok(rejected,'Unreviewed amount/source mutation must remain detectable');
 }
});

test('parent-composition normalization cannot hide unrelated renderer or source mutations',()=>{
 for(const [path,from,to] of [
  ['src/components/draft-chart-plot.tsx','usePointTooltip(shown)','usePointTooltip(plot.points)'],
  ['src/app/funding/page.tsx','export default','export const unreviewed = 1;\nexport default'],
 ]) {
  const current=readFileSync(new URL(path,root),'utf8');
  // Every probe must actually change a present token, not pass vacuously.
  assert.ok(current.includes(from),path+': mutation target exists');
  const mutated=current.replace(from,to);
  const original=fixture.files.find(file=>file.path===path);
  let rejected=false;
  try {rejected=sha(restorePr144Integration(mutated,path))!==original.afterSha256;}catch {rejected=true;}
  assert.ok(rejected,path+': unlisted mutation survives or fails exact reversal');
 }
});
