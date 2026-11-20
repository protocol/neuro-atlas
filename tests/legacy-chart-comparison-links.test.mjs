import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import legacyModule from '../src/app/field-velocity/dashboard/page.tsx';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { FIELD_VELOCITY_GRAPHS } from '../src/data/field-velocity-links.ts';
import { atlasBasePath, atlasPath } from '../src/lib/atlas-path.ts';
import { legacyComparisonDestination } from '../src/lib/field-velocity/legacy-comparison.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const LegacyPage = legacyModule.default ?? legacyModule;
const graphPage = graphModule.default.default ?? graphModule.default;
const route = atlasPath('/field-velocity/dashboard');
const recording = 'simultaneous-neural-recordings';
const storageKey = 'neuro-atlas:dashboards:v1';

async function retiredAddress(suffix, expected) {
  const calls = [], storageCalls = [];
  const saved = '[{"name":"Keep this untouched","cards":[]}]';
  const cleanup = await mount(React.createElement(AppRouterContext.Provider, { value: {
    replace(href) { calls.push(href); },
    push() { assert.fail('compatibility must replace, not append history'); },
  } }, React.createElement(LegacyPage)), '', win => {
    win.history.replaceState({ retained: true }, '', route + suffix);
    win.localStorage.setItem(storageKey, saved);
    const prototype = win.Storage.prototype;
    for (const operation of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      const original = prototype[operation];
      prototype[operation] = function (...args) { storageCalls.push(operation); return original.apply(this, args); };
    }
  });
  try {
    assert.deepEqual(calls, [expected], `legacy address: ${suffix}`);
    assert.deepEqual(storageCalls, [], 'retirement never reads, writes, enumerates, or deletes saved dashboards');
    assert.equal(window.localStorage[storageKey], saved);
    assert.equal(document.querySelectorAll('[data-dashboard], .graph-detail, input, button, svg').length, 0, 'the retired route cannot compose or multiply charts');
    assert.doesNotMatch(document.body.textContent, /dashboard|comparison|Save locally|Add chart/i);
    assert.equal(document.querySelector('a').getAttribute('href'), atlasPath(expected));
    assert.equal(document.querySelector('a').textContent, expected.startsWith('/field-velocity/') ? 'Open chart' : 'Back to Field velocity');
  } finally { await cleanup(); }
  if (expected.startsWith('/field-velocity/')) {
    const slug = expected.split('?')[0].split('/').at(-1);
    const closeGraph = await mount(await graphPage({ params: Promise.resolve({ slug }) }), '', win => {
      win.history.replaceState({}, '', atlasPath(expected));
    });
    try {
      assert.equal(document.querySelectorAll('[data-graph-page], .graph-detail').length, 2, 'one page, one detail');
      assert.equal(document.querySelector('[data-graph-page]').dataset.graphPage, slug);
      if (slug === recording) assert.equal(document.querySelector('[data-recording-view]').dataset.recordingView, new URL(expected, 'https://atlas.example').searchParams.get('recordingView') ?? 'historical');
    } finally { await closeGraph(); }
  }
}

test('every old add link resolves to its single real graph, not a composer', async () => {
  assert.equal(FIELD_VELOCITY_GRAPHS.length, 25);
  for (const { slug } of FIELD_VELOCITY_GRAPHS) await retiredAddress(`?add=${slug}`, `/field-velocity/${slug}`);
});

test('old add links retain valid recording selections and safe repeated query values only', async () => {
  await retiredAddress(`?add=${recording}&recordingView=optical&utm_campaign=a&utm_campaign=b&token=secret&review=1`, `/field-velocity/${recording}?recordingView=optical&utm_campaign=a&utm_campaign=b&review=1`);
  for (const query of ['bad', 'optical&recordingView=optical', 'optical&recordingView=electrical']) {
    await retiredAddress(`?add=${recording}&recordingView=${query}`, `/field-velocity/${recording}`);
  }
  await retiredAddress('?add=citation-latency&recordingView=optical', '/field-velocity/citation-latency');
});

test('plain, invalid, duplicate, and unsafe old add addresses recover to Field velocity', async () => {
  for (const suffix of ['', '?add=unknown', '?add=citation-latency&add=citation-latency', '?add=//evil.example', '?add=javascript:alert(1)', '?add=../funding', '?add=toString', '?add=idea_vintage']) {
    await retiredAddress(suffix, '/field-velocity');
  }
  assert.equal(route, `${atlasBasePath}/field-velocity/dashboard`);
});

// Encode the published v1 wire format independently; production has no link writer.
const oldLink = cards => '#d=' + Buffer.from(JSON.stringify([1, 'Retained comparison 🧠', cards])).toString('base64url');

test('encoded comparison links recover to Field velocity without restoring removed composition', async () => {
  for (const suffix of [
    oldLink([{ slug: 'citation-latency' }, { slug: recording }]),
    '?utm_campaign=a&token=secret' + oldLink([{ slug: recording, settings: { recordingView: 'optical', hidden: ['electrical'] } }]),
    '?recordingView=electrical' + oldLink([{ slug: recording, settings: { recordingView: 'human-channels' } }]),
  ]) await retiredAddress(suffix, '/field-velocity');
});

test('malformed, oversize, ambiguous, and all-invalid legacy fragments fail closed to the catalog', async () => {
  for (const suffix of ['#d=not-a-link', '#d=' + 'A'.repeat(8192), '#unknown', oldLink([]), oldLink([{ slug: '//evil.example' }, { slug: '../funding' }, { slug: 'toString' }]), oldLink(Array.from({ length: 9 }, () => ({ slug: recording }))), '?add=citation-latency' + oldLink([{ slug: recording }]), '#d=' + Buffer.from(JSON.stringify([2, 'Future', [{ slug: recording }]])).toString('base64url')]) {
    await retiredAddress(suffix, '/field-velocity');
  }
});

test('retired-address translation stays internal, base-path aware, and terminates on canonical pages', () => {
  for (const base of ['', '/neuro-atlas']) {
    const source = `https://atlas.example${base}/field-velocity/dashboard/`;
    const target = `${base}/field-velocity/${recording}?recordingView=optical`;
    assert.equal(legacyComparisonDestination(source + oldLink([{ slug: recording, settings: { recordingView: 'optical' } }]), base), `${base}/field-velocity`);
    assert.equal(legacyComparisonDestination(source + `?add=${recording}&recordingView=optical`, base), target);
    assert.equal(legacyComparisonDestination('https://atlas.example' + target, base), null, 'no loops');
    assert.equal(legacyComparisonDestination(source + '?add=https://evil.example', base), `${base}/field-velocity`);
  }
  for (const source of ['not a URL', 'javascript:alert(1)', 'https://atlas.example/funding?add=citation-latency']) assert.equal(legacyComparisonDestination(source), null);
  assert.equal(legacyComparisonDestination('https://atlas.example/field-velocity/dashboard', '//evil.example'), null);
});

test('hash and history changes on a retained legacy route translate once without touching saves', async () => {
  const calls = [];
  const cleanup = await mount(React.createElement(AppRouterContext.Provider, { value: { replace: href => calls.push(href) } }, React.createElement(React.StrictMode, null, React.createElement(LegacyPage))), '', win => {
    win.history.replaceState({}, '', route + '?add=citation-latency');
  });
  try {
    assert.deepEqual(calls, ['/field-velocity/citation-latency']);
    await act(async () => {
      window.history.replaceState({}, '', route + oldLink([{ slug: recording, settings: { recordingView: 'optical' } }]));
      window.dispatchEvent(new Event('hashchange'));
    });
    assert.deepEqual(calls, ['/field-velocity/citation-latency', '/field-velocity']);
    await act(async () => window.dispatchEvent(new Event('popstate')));
    assert.equal(calls.length, 2, 'same address is not translated twice');
    await act(async () => {
      window.history.replaceState({}, '', atlasPath(`/field-velocity/${recording}`));
      window.dispatchEvent(new Event('popstate'));
    });
    assert.equal(calls.length, 2, 'canonical addresses are never bounced back to the catalog');
  } finally { await cleanup(); }
});
