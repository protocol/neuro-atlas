import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadDocumentCitation } from '../src/components/citation-latency-provider.tsx';
import { validateCitationBundle, projectCitationRecord } from '../src/lib/field-velocity/citation-latency-feed.ts';
import { archivedCitationRecord } from '../src/lib/field-velocity/citation-latency-default.ts';
import { citationFileResponse } from '../src/lib/field-velocity/citation-latency-server.ts';
import { bundledCitation } from '../src/lib/field-velocity/citation-latency-bundled.ts';
import { fixture } from './helpers/citation-fixture.mjs';

test('citation transport outage retains the validated anonymous November 6 bundle and exact exports', async () => {
  const view = await loadDocumentCitation({},async()=>{throw new Error('offline fixture');});
  assert.equal(view.data?.generatedAt,'2026-11-06T09:48:35+00:00');
  const text = readFileSync('src/data/field-velocity/citation-latency.bundled-20261106.json','utf8');
  assert.equal(createHash('sha256').update(text).digest('hex'),'0e43c72e2176e21d5418ff88948f3e61396e36a381dc70b8ccb2cbb2a0866611');
  assert.equal(view.revision,createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex'));
  const validated = await validateCitationBundle(JSON.parse(text));
  assert.deepEqual(view.data,validated);
  assert.equal(validated.rows.length,27);
  assert.equal(validated.rows.filter(r=>r.reliable).length,24);
  assert.equal(validated.bundle.provenance.receiptCount,964);
  const original = structuredClone(archivedCitationRecord);
  const record = projectCitationRecord(validated,archivedCitationRecord);
  assert.equal(record.window,'2000–2023');
  assert.equal(record.checkedAt,'2026-11-06T09:48:35+00:00');
  assert.equal(record.metric,'median age of references in new work (years)');
  assert.deepEqual(archivedCitationRecord,original);
  assert.equal(record.patentVintage,archivedCitationRecord.patentVintage);
  for (const file of ['citation-latency.csv','citation-latency.json']) {
    const response = await citationFileResponse(view.revision,file);
    assert.equal(response.status,200);
    if(file.endsWith('.csv')) assert.equal(await response.text(),validated.bundle.csv);
    else assert.deepEqual(await response.json(),validated.bundle);
  }
});

test('an admitted older citation release cannot replace the fresh bundled last-good source', async () => {
  const old = {revision:'1'.repeat(40),bundle:fixture()};
  const view = await loadDocumentCitation({},async()=>Response.json(old));
  assert.equal(view.revision,bundledCitation.revision);
  assert.equal(view.data.generatedAt,'2026-11-06T09:48:35+00:00');
});
