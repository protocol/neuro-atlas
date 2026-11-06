import test from 'node:test';
import assert from 'node:assert/strict';
import { citationLatestResponse, citationFileResponse, verifiedArchivedCitation } from '../src/lib/field-velocity/citation-latency-server.ts';
import { ARCHIVED_CITATION_REVISION, archivedCitationRecord } from '../src/lib/field-velocity/citation-latency-default.ts';
import { validateCitationBundle } from '../src/lib/field-velocity/citation-latency-feed.ts';
import { fixture } from './helpers/citation-fixture.mjs';
const revision='1'.repeat(40);
test('private latest and immutable CSV/JSON preserve displayed revision and accepted bytes', async()=> {
 const bundle=(await validateCitationBundle(fixture())).bundle;
 const release={revision,bundle};
 const latest=await citationLatestResponse(async()=>release);
 assert.equal(latest.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(await latest.json(),release);
 const load=async requested=> {assert.equal(requested,revision);return release;};
 for(const file of ['citation-latency.csv','citation-latency.json']) {
  const response=await citationFileResponse(revision,file,load);
  assert.equal(response.status,200); assert.equal(response.headers.get('x-citation-revision'),revision);
  assert.equal(response.headers.get('cache-control'),'private, max-age=31536000, immutable');
  const text=await response.text();
  if(file.endsWith('.csv'))assert.equal(text,bundle.csv);else assert.deepEqual(JSON.parse(text),bundle);
 }
});
test('old exact revision unavailable returns 503 without substituting latest/archive; invalid route 404', async()=> {
 const fail=async()=>{throw new Error('gone');};
 assert.equal((await citationFileResponse(revision,'citation-latency.csv',fail)).status,503);
 assert.equal((await citationFileResponse('main','citation-latency.csv',fail)).status,404);
 assert.equal((await citationFileResponse(revision,'../private',fail)).status,404);
});
test('archived fallback CSV independently matches retained snapshot and source provenance', async()=> {
 const archived=await verifiedArchivedCitation();assert.equal(archived.revision,ARCHIVED_CITATION_REVISION);
 const json=await citationFileResponse(ARCHIVED_CITATION_REVISION,'citation-latency.json');
 assert.deepEqual((await json.json()).record,archivedCitationRecord);
 const csv=await citationFileResponse(ARCHIVED_CITATION_REVISION,'citation-latency.csv');assert.equal(csv.status,200);
 assert.match(await csv.text(),/# generated: 2026-08-04/);
});
