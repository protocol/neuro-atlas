import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';
import { GoogleTrendsProvider } from '../src/components/google-trends-provider.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { BUNDLED_TRENDS_REVISION } from '../src/lib/field-velocity/google-trends-default.ts';

const snapshot = JSON.parse(readFileSync('public/data/google-trends/bundled-20261106/google-trends.json', 'utf8'));
const revision = '1234567890abcdef1234567890abcdef12345678';

test('remounting the page in the same document preserves its accepted release and single request', async () => {
  const original = globalThis.fetch;
  let calls = 0, remount;
  globalThis.fetch = async () => { calls++; return Response.json({ revision: calls === 1 ? revision : 'a'.repeat(40), snapshot }); };
  function Page() {
    const [key, setKey] = React.useState(0);
    remount = () => setKey(key + 1);
    return React.createElement(GoogleTrendsProvider, { key }, React.createElement(GoogleTrends));
  }
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Page)));
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(document.querySelector('[data-trends-revision]').dataset.trendsRevision, revision);
    await act(async () => { remount(); await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(calls, 1, 'An SPA remount must not change an old document’s source release');
    assert.deepEqual([...document.querySelectorAll('[data-trends-revision]')].map(el => el.dataset.trendsRevision), [revision, revision]);
  } finally { await cleanup(); globalThis.fetch = original; }
});

for (const [name, response] of [
  ['outage', () => { throw new Error('Synthetic source outage'); }],
  ['bad status', () => new Response('unavailable', { status: 503 })],
  ['HTML', () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } })],
  ['invalid feed', () => Response.json({ revision, snapshot: { ...snapshot, groups: [] } })],
]) test(`${name} preserves both bundled groups without a public fallback banner`, async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response(); };
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(GoogleTrendsProvider, null, React.createElement(GoogleTrends))));
  try {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(calls, 1);
    assert.deepEqual([...document.querySelectorAll('[data-trends-revision]')].map(el => el.dataset.trendsRevision), [BUNDLED_TRENDS_REVISION, BUNDLED_TRENDS_REVISION]);
    assert.doesNotMatch(document.body.textContent, /fallback|unavailable|outage/i);
  } finally { await cleanup(); globalThis.fetch = original; }
});
