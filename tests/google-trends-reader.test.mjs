import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sources = Object.fromEntries(['neurotech', 'neuralink'].map(id => [id, { raw: readFileSync(`docs/google-trends/source/${id}.raw.json`, 'utf8'), request: readFileSync(`docs/google-trends/source/${id}.request.json`, 'utf8') }]));
const bundle = { version: 1, sources };
const revision = '1234567890abcdef1234567890abcdef12345678';

test('reader resolves branch once, then validates one atomic bundle from its immutable SHA', async () => {
  const { fetchLatestTrends } = await import('../src/lib/field-velocity/google-trends-reader.ts');
  const urls = [];
  const feed = await fetchLatestTrends(async (url, options) => {
    urls.push(url);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal);
    return Response.json(urls.length === 1 ? { object: { sha: revision } } : bundle);
  });
  assert.equal(feed.revision, revision);
  assert.deepEqual(feed.snapshot, JSON.parse(readFileSync('public/data/google-trends/google-trends.json', 'utf8')));
  assert.deepEqual(urls, [
    'https://api.github.com/repos/protocol/neuro-atlas/git/ref/heads/data/google-trends-feed',
    `https://raw.githubusercontent.com/protocol/neuro-atlas/${revision}/feed/google-trends/feed.json`,
  ]);
});


test('reader retains the verified last good whole window when a later refresh fails', async () => {
  const { retainingTrendsReader } = await import('../src/lib/field-velocity/google-trends-reader.ts');
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  const fallback = { ...validateTrendsBundle(bundle), revision: 'c5a18cfb03746c0e048e425fac82259488d089a4' };
  let available = true;
  const reader = retainingTrendsReader(async () => {
    if (!available) throw Error('source unavailable');
    return { ...fallback, revision };
  }, fallback);
  assert.equal((await reader()).revision, revision);
  available = false;
  assert.equal((await reader()).revision, revision);
  const cold = retainingTrendsReader(async () => { throw Error('HTTP 429'); }, fallback);
  assert.deepEqual(await cold(), fallback);
});


test('a stale but valid window cannot roll a newer retained source backward', async () => {
  const { retainingTrendsReader } = await import('../src/lib/field-velocity/google-trends-reader.ts');
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  const old = { ...validateTrendsBundle(bundle), revision };
  const current = { ...old, snapshot: { ...old.snapshot, end: '2026-10-30' } };
  assert.equal((await retainingTrendsReader(async () => old, current)()).snapshot.end, '2026-10-30');
});


for (const bad of [
  () => new Response('bad status', { status: 429 }),
  () => new Response('<html>not data</html>', { headers: { 'Content-Type': 'text/html' } }),
  () => Response.json({ object: { sha: '../../main' } }),
  () => Response.json({ version: 2, sources }),
  () => Response.json({ version: 1, sources: { neurotech: sources.neurotech } }),
  () => Response.json({ version: 1, sources: { ...sources, neuralink: { ...sources.neuralink, raw: sources.neuralink.raw.replace('"hasData"', '"wrongAvailability"') } } }),
  () => Response.json({ version: 1, sources: { ...sources, neuralink: { ...sources.neuralink, raw: sources.neuralink.raw.replace(/"isPartial"\s*:\s*true/, '"isPartial": "true"') } } }),
]) test(`bad upstream response ${bad.toString().slice(0, 65)} is rejected`, async () => {
  const { fetchLatestTrends } = await import('../src/lib/field-velocity/google-trends-reader.ts');
  let calls = 0;
  await assert.rejects(fetchLatestTrends(async () => ++calls === 1 && !bad.toString().includes('object:') ? Response.json({ object: { sha: revision } }) : bad()));
});


test('oversized upstream bodies are canceled while streaming, not buffered without a bound', async () => {
  const { fetchLatestTrends } = await import('../src/lib/field-velocity/google-trends-reader.ts');
  let chunks = 0, canceled = false, calls = 0;
  const stream = new ReadableStream({
    pull(controller) { if (++chunks <= 30) controller.enqueue(new Uint8Array(100_000)); else controller.close(); },
    cancel() { canceled = true; },
  });
  await assert.rejects(fetchLatestTrends(async () => ++calls === 1 ? Response.json({ object: { sha: revision } }) : new Response(stream, { headers: { 'Content-Type': 'text/plain' } })));
  assert.equal(canceled, true);
  assert.ok(chunks < 30);
});
