import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act, StrictMode } from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import { SubTabs } from '../src/components/sub-tabs.tsx';

test('Selected Draft tab stays visible when the viewport narrows without navigation', async () => {
  globalThis.React = React;
  const cleanup = await mount(React.createElement(SubTabs, { selectedKey: 'draft', tabs: [
    { key: 'metrics', label: 'Metrics', node: null }, { key: 'draft', label: 'Draft charts', node: null },
  ] }));
  try {
    const active = document.querySelector('button[aria-current=true]');
    const rail = active.parentElement;
    rail.getBoundingClientRect = () => ({ left: 33, right: 272 });
    active.getBoundingClientRect = () => ({ left: 250 - rail.scrollLeft, right: 314 - rail.scrollLeft });
    // Drain the initial layout callback, then simulate a new width change.
    await settle();
    rail.scrollLeft = 0;
    await act(async () => window.dispatchEvent(new Event('resize')));
    await settle();
    assert.equal(rail.scrollLeft, 42);
    assert.equal(document.documentElement.scrollLeft, 0);
  } finally { await cleanup(); }
});
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
import { mount, click, settle } from './modal-helpers.mjs';
const data = selectPerformance(parseFeed(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'))));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));

async function until(predicate) {
  for (let attempts = 0; attempts < 30; attempts++) {
    await settle();
    if (predicate()) return;
  }
  assert.ok(predicate(), 'Expected history and focus transition within the bounded wait');
}

for (const strict of [false, true]) {
  test(`Draft links recover exact visible focus after close and Forward under StrictMode=${strict}`, async () => {
    globalThis.React = React;
    const tabs = React.createElement(VelocityTabs, { performance: React.createElement(PerformanceCurves, { data, provenance }) });
    const cleanup = await mount(strict ? React.createElement(StrictMode, null, tabs) : tabs, '#draft-charts');
    try {
      for (const id of ['tissue-mapped', 'neural-recording-hours']) {
        const link = document.querySelector(`.draft-charts a[href="#${id}"]`);
        link.focus();
        await click(link);
        assert.ok(document.querySelector('dialog[open]'));
        await click(document.querySelector('dialog .pc-modal-header button'));
        await until(() => window.location.hash === '#draft-charts' && document.activeElement === link);
        assert.equal(window.location.hash, '#draft-charts');
        assert.equal(document.activeElement === link, true, 'Close restores exact draft link');
        assert.equal(link.closest('[hidden]'), null);
        await act(async () => window.history.forward());
        await until(() => !!document.querySelector('dialog[open]'));
        assert.ok(document.querySelector('dialog[open]'));
        await click(document.querySelector('dialog .pc-modal-header button'));
        await until(() => window.location.hash === '#draft-charts' && document.activeElement === link);
        assert.equal(window.location.hash, '#draft-charts');
        assert.equal(document.activeElement === link, true, 'Forward then Close restores exact draft link');
      }
    } finally { await cleanup(); }
  });
}
