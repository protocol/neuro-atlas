import test from 'node:test';
test('canonical and generated structured data change only the exact reviewed prose fields',()=>{
 const reviewed=JSON.parse(readFileSync(new URL('./fixtures/sitewide-copy-data-20261125.json',import.meta.url),'utf8'));
 const byFile=Map.groupBy(reviewed,e=>e.file);
 for(const [file,changes] of byFile) {
  const current=JSON.parse(readFileSync(new URL(file,root),'utf8'));
  for(const change of changes) {
   const keys=change.path.slice(1).split('/');let obj=current;
   for(const key of keys.slice(0,-1))obj=obj[key];
   assert.ok(['note','notes','definition','basis'].includes(keys.at(-1)));
   assert.equal(obj[keys.at(-1)],change.after,file+change.path);
   obj[keys.at(-1)]=change.before;
  }
  const original=JSON.parse(restoreReviewedFile(readFileSync(new URL(file,root),'utf8'),delta,file));
  assert.deepEqual(current,original,file+': every number, date, ID, source, cohort and other field stays exact');
 }
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/sitewide-copy-20261125.json',import.meta.url),'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
import {restoreReviewedFile} from '../scripts/qa/build-reviewed-delta.mjs';
const delta=JSON.parse(readFileSync(new URL('./fixtures/sitewide-copy-delta-20261125.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url);
test('site-wide reader copy matches the independently reviewed exact replacement set',()=>{
 for(const [path,hashes] of Object.entries(fixture.files)) {
  const current=readFileSync(new URL(path,root),'utf8');
  assert.equal(sha(current),hashes.candidate,path+' must contain the reviewed copy');
 }
});
test('every reviewed copy edit reverses to the unchanged merged-151 source bytes',()=>{
 for(const [path,hashes] of Object.entries(fixture.files)) {
  let current=readFileSync(new URL(path,root),'utf8');
  current=restoreReviewedFile(current,delta,path);
  assert.equal(sha(current),hashes.baseline,path+': exact old source, including URLs, identifiers and code');
 }
});
