import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/citation-fixture.mjs';
import { fetchLatestCitation, fetchCitationRevision, retainingCitationReader, CITATION_BRANCH, CITATION_FEED_PATH } from '../src/lib/field-velocity/citation-latency-reader.ts';
import { archivedCitation } from '../src/lib/field-velocity/citation-latency-default.ts';
const rev = '1'.repeat(40);
const json = v => new Response(JSON.stringify(v), {headers:{'content-type':'application/json'}});
test('latest pins raw download to exact GitHub ref SHA and strict feed', async () => {
 const urls = [];
 const result = await fetchLatestCitation(async (url, options) => {
  urls.push(url); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
  return json(url.includes('api.github.com') ? {object:{sha:rev}} : fixture());
 });
 assert.equal(result.revision, rev);
 assert.equal(urls[0], `https://api.github.com/repos/protocol/neuro-atlas/git/ref/heads/${CITATION_BRANCH}`);
 assert.equal(urls[1], `https://raw.githubusercontent.com/protocol/neuro-atlas/${rev}/${CITATION_FEED_PATH}`);
});
test('rejects invalid immutable token before transport and status/type/redirect/size/schema failures', async () => {
 let count = 0; const f = async () => { count++; return json(fixture()); };
 for (const token of ['main','1'.repeat(39),'../'+rev,rev.toUpperCase().replace('1','A')]) await assert.rejects(() => fetchCitationRevision(token,f));
 assert.equal(count,0);
 for (const response of [new Response('{}',{status:503}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response(' '.repeat(1_100_001),{headers:{'content-type':'text/plain'}}),json({}),json({...fixture(), private:true})]) {
  await assert.rejects(() => fetchCitationRevision(rev,async()=>response));
 }
});
test('last good survives failed/stale loads; cold process begins at archived record', async () => {
 let mode = 'error'; const accepted = await fetchCitationRevision(rev,async()=>json(fixture()));
 const reader = retainingCitationReader(async()=> { if(mode==='error') throw new Error('source unavailable'); return mode==='old' ? archivedCitation : accepted; },archivedCitation);
 assert.equal(await reader(),archivedCitation);
 mode='ok'; assert.equal((await reader()).revision,rev);
 mode='error'; assert.equal((await reader()).revision,rev);
 mode='old'; assert.equal((await reader()).revision,rev);
});
