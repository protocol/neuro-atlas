import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bundledTrends, BUNDLED_TRENDS_REVISION } from '../src/lib/field-velocity/google-trends-default.ts';
import { validateTrendsBundle } from '../src/lib/field-velocity/google-trends-feed.ts';
import { getTrendsRevision, verifiedBundledTrends } from '../src/lib/field-velocity/google-trends-server.ts';
const hash = text => createHash('sha256').update(text).digest('hex');

test('cold-start Trends bundle is the exact accepted November 6 whole-window source', async () => {
  assert.equal(bundledTrends.snapshot.end, '2026-11-06');
  assert.equal(bundledTrends.snapshot.start, '2023-11-06');
  const sources = Object.fromEntries(['neurotech','neuralink'].map(id => [id, {
    raw: readFileSync(`docs/google-trends/bundled-20261106/source/${id}.raw.json`, 'utf8'),
    request: readFileSync(`docs/google-trends/bundled-20261106/source/${id}.request.json`, 'utf8'),
  }]));
  const feed = JSON.stringify({version:1,sources}, null, 2)+'\n';
  assert.equal(hash(feed), '37daa50d680c8fa6706a69dd51eee3eb603f4f650f3fdb1b047864a17fccc862');
  assert.equal(BUNDLED_TRENDS_REVISION, createHash('sha1').update(`blob ${Buffer.byteLength(feed)}\0`).update(feed).digest('hex'));
  const expected = validateTrendsBundle(JSON.parse(feed));
  assert.deepEqual(verifiedBundledTrends.snapshot, expected.snapshot);
  assert.deepEqual(bundledTrends.snapshot, expected.snapshot);
  for (const [name,bytes] of Object.entries(expected.files)) assert.equal(readFileSync(`public/data/google-trends/bundled-20261106/${name}`,'utf8'),bytes);
  assert.deepEqual((await getTrendsRevision(BUNDLED_TRENDS_REVISION)).snapshot, expected.snapshot);
  const { GET } = await import('../src/app/api/google-trends/[revision]/[file]/route.ts');
  for (const [file,bytes] of Object.entries(expected.files)) {
    const response = await GET(new Request('https://atlas.example/api/google-trends/bundled/source'), {params:Promise.resolve({revision:BUNDLED_TRENDS_REVISION,file})});
    assert.equal(response.status,200);
    assert.equal(await response.text(),bytes);
  }
});

test('original October 15 revision retains exact archived downloads', async () => {
  const archive = await getTrendsRevision('c5a18cfb03746c0e048e425fac82259488d089a4');
  assert.equal(archive.snapshot.end,'2026-10-15');
  for (const [name,bytes] of Object.entries(archive.files)) assert.equal(bytes,readFileSync(`public/data/google-trends/${name}`,'utf8'));
});
