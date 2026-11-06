import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateCitationBundle, parseCitationCsv, CITATION_SETTINGS, projectCitationRecord, citationFingerprint } from '../src/lib/field-velocity/citation-latency-feed.ts';
import snapshot from '../src/data/field-velocity/neurotech.snapshot.json' with { type: 'json' };
import {fixture,csv} from './helpers/citation-fixture.mjs';
test('historical source projects source-compatible median, intervals, reliable headline and patent twin only', async () => {
 const result = await validateCitationBundle(fixture());
 const original = snapshot.records.find(r => r.instrument === 'idea_vintage');
 const record = projectCitationRecord(result, original);
 assert.equal(record.instrument, 'idea_vintage');
 assert.equal(record.value, '8.0 years (2023)');
 assert.equal(record.window, '2000–2023');
 assert.equal(record.series.length, 27);
 assert.equal(record.series.filter(p => p.reliable).length, 24);
 assert.equal(record.series.at(-1).reliable, false);
 assert.equal(record.checkedAt, '2026-10-28T10:49:13+00:00');
 assert.equal(record.patentVintage, original.patentVintage);
 // The pinned PLRD recent-segment fit calls this historical sample unclear.
 assert.equal(record.direction, 'unclear');
 assert.equal(result.bundle.csv, csv);
});

test('original provider archive reproduces its complete idea-vintage mapping with only a newly pinned generator URL',()=>{
 const original=snapshot.records.find(r=>r.instrument==='idea_vintage');
 const parsed=parseCitationCsv(readFileSync('docs/citation-latency/archive-20260804.csv','utf8'));
 const projected=projectCitationRecord(parsed,original);
 assert.deepEqual({...projected,sources:original.sources},original);
});
test('strict admission rejects missing columns, year gaps, flags, counts, interval corruption and private/unknown keys', async () => {
 for (const text of [csv.replace('n_works_sampled,',''), csv.replace('2001,279,', '2000,279,'), csv.replace('1373,57,1','1373,81,1'), csv.replace('2024,6476,10973391,59.015,,9.0,8,10.0,2378,62,0', '2024,6476,10973391,59.015,,9.0,8,10.0,2378,62,1'), csv.replace('6,5.0,8,1373','6,7.0,8,1373'), csv.replace(',,6,5.0', ',3,6,5.0'), csv.replace('1373,57,1', '0,57,1')]) {
  await assert.rejects(() => validateCitationBundle(fixture(text)));
 }
 for (const change of [b => b.secret = 'private', b => b.provenance.complete = false, b => b.provenance.csvSha256 = '0'.repeat(64), b => b.provenance.generatedAt = '2026-02-30T10:49:13+00:00', b => b.provenance.settings = {...CITATION_SETTINGS, worksPerYear: 120}]) {
  const b = fixture(); change(b); await assert.rejects(() => validateCitationBundle(b));
 }
});

test('frozen integer reference-age median/bootstrap output rejects impossible sub-half-year precision',async()=>{
 await assert.rejects(()=>validateCitationBundle(fixture(csv.replace('6,5.0,8,1373','6.01,5.0,8,1373'))));
});
test('semantic fingerprint ignores acquisition timestamps but includes uncertainty and reliability', async () => {
 const a = await validateCitationBundle(fixture());
 const text = csv.replace('2026-10-28T10:49:13+00:00', '2026-10-28T10:49:14+00:00');
 const b = fixture(text); b.provenance.generatedAt = '2026-10-28T10:49:14+00:00';
 assert.equal(await citationFingerprint(a), await citationFingerprint(await validateCitationBundle(b)));
 const c = await validateCitationBundle(fixture(csv.replace('6,5.0,8,1373', '6,5.0,9,1373')));
 assert.notEqual(await citationFingerprint(a), await citationFingerprint(c));
});
