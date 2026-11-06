import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { mount, click } from './modal-helpers.mjs';

const revision = '1234567890abcdef1234567890abcdef12345678';
test('both chart selections adopt one atomic revision once per document and old tabs keep pinned downloads', async () => {
  const { GoogleTrendsProvider } = await import('../src/components/google-trends-provider.tsx');
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  const snapshot = JSON.parse(readFileSync('public/data/google-trends/bundled-20261106/google-trends.json', 'utf8'));
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ revision, snapshot }); };
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(GoogleTrendsProvider, null,
    React.createElement(GoogleTrends, { selection: ['neurotech'] }), React.createElement(GoogleTrends, { selection: ['neuralink'] })
  )), '#google-trends-neurotech');
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
    assert.equal(calls, 1);
    assert.deepEqual([...document.querySelectorAll('[data-trends-revision]')].map(el => el.dataset.trendsRevision), [revision, revision]);
    for (const a of document.querySelectorAll('a[download]')) assert.match(a.getAttribute('href'), new RegExp(`/api/google-trends/${revision}/`));
    const hrefs = [...document.querySelectorAll('a[download]')].map(a => a.href);
    await act(async () => window.dispatchEvent(new window.Event('focus')));
    assert.equal(calls, 1, 'Open tabs do not refresh beneath an export');
    assert.deepEqual([...document.querySelectorAll('a[download]')].map(a => a.href), hrefs);
  } finally { await cleanup(); globalThis.fetch = original; }
});

test('admitted capture flows through the reader, latest API response, both chart tables and pinned exports', async () => {
  const { fetchLatestTrends } = await import('../src/lib/field-velocity/google-trends-reader.ts');
  const { trendsLatestResponse } = await import('../src/lib/field-velocity/google-trends-server.ts');
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  const { GoogleTrendsProvider } = await import('../src/components/google-trends-provider.tsx');
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  // Optional real, unpublished capture; all transport/revision identities remain fixtures.
  const bundle = process.env.TRENDS_TEST_FEED ? JSON.parse(readFileSync(process.env.TRENDS_TEST_FEED, 'utf8')) : { version: 1, sources: Object.fromEntries(['neurotech', 'neuralink'].map(id => [id, {
    raw: readFileSync(`docs/google-trends/bundled-20261106/source/${id}.raw.json`, 'utf8'),
    request: readFileSync(`docs/google-trends/bundled-20261106/source/${id}.request.json`, 'utf8'),
  }])) };
  const expected = validateTrendsBundle(bundle);
  let upstreamCalls = 0;
  const admitted = await fetchLatestTrends(async () => ++upstreamCalls === 1 ? Response.json({ object: { sha: revision } }) : Response.json(bundle));
  assert.equal(upstreamCalls, 2);
  assert.deepEqual(admitted.snapshot, expected.snapshot);
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return trendsLatestResponse(async () => admitted); };
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(GoogleTrendsProvider, null,
    React.createElement(GoogleTrends, { selection: ['neurotech'] }), React.createElement(GoogleTrends, { selection: ['neuralink'] })
  )), '#google-trends-neurotech');
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    for (const group of expected.snapshot.groups) {
      if (window.location.hash !== `#google-trends-${group.id}`) await click(document.querySelector(`[data-trends-card="${group.id}"] button[aria-haspopup="dialog"]`));
      const modal = document.querySelector('dialog[open]');
      const points = [...modal.querySelectorAll('[data-trend-point]')].map(point => [point.dataset.date, point.dataset.term, Number(point.dataset.value)]);
      assert.deepEqual(points, group.rows.filter(row => !row.partial).flatMap(row => row.values.flatMap((value, i) => value === null ? [] : [[row.date, group.terms[i], value]])));
      assert.deepEqual([...modal.querySelectorAll('[data-trends-row]')].map(row => [...row.querySelectorAll('td')].slice(0, -1).map(cell => cell.textContent)), group.rows.map(row => row.displayValues));
      assert.deepEqual([...modal.querySelectorAll('a[download]')].map(a => a.getAttribute('href')), [`/api/google-trends/${revision}/${group.id}.csv`, `/api/google-trends/${revision}/google-trends.json`]);
      assert.equal(new URL(modal.querySelector('a[href^="https://trends.google.com/trends/explore?"]').href).searchParams.get('date'), `${group.start} ${group.end}`);
      assert.match(modal.textContent, new RegExp(group.rawSha256));
      assert.ok(admitted.files[`${group.id}.csv`].includes(`captured ${group.capturedAt}`));
      assert.deepEqual(JSON.parse(admitted.files['google-trends.json']), expected.snapshot);
      await click(modal.querySelector('button[aria-label^="Close"]'));
    }
    assert.equal(calls, 1);
  } finally { await cleanup(); globalThis.fetch = original; }
});
