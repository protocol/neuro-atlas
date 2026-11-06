import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceUrl } from '../src/lib/field-velocity/navigation.ts';

import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click, settle } from './modal-helpers.mjs';
import { navigatePerformance, performanceAnchors } from '../src/lib/field-velocity/navigation.ts';
import { FIELD_VELOCITY_LINKS, fieldVelocityLink } from '../src/data/field-velocity-links.ts';
import { draftChartAnchors, metricChartAnchors } from '../src/data/draft-chart-links.ts';
import { chartShareUrl } from '../src/lib/chart-export.ts';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const inventory = JSON.parse(readFileSync(new URL('./fixtures/readable-atlas-urls.json', import.meta.url), 'utf8'));

const core = [
  ['performance_curves', 'metrics'],
  ['draft-charts', 'metrics'],
  ['expectations', 'inflection-points'],
  ['idea_vintage', 'citation-latency'],
  ['latency_compression', 'latency-compression'],
  ['revealed_commitments', 'implanted-bci-participants-over-time'],
];
for (const [legacy, canonical] of core) test(`${legacy} shares the current visible title as #${canonical}`, () => {
  for (const base of ['https://www.plneuro.xyz/neuro-atlas/field-velocity?x=1&x=2', 'http://127.0.0.1:3389/custom/field-velocity?review=1']) {
    assert.equal(performanceUrl(`${base}#old`, legacy), `${base}#${canonical}`);
    assert.equal(performanceUrl(`${base}#old`, canonical), `${base}#${canonical}`);
  }
});


test('every rendered chart shares its actual visible title, including exports and related native links', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const doc = dom.window.document;
    const buttons = [...doc.querySelectorAll('button[aria-label^="Copy link to "]')];
    assert.equal(buttons.length, 24);
    assert.deepEqual(buttons.map(b => b.getAttribute('aria-label').slice(13)).sort(), inventory.map(([title]) => title).sort());
    for (const [title, slug] of inventory) {
      const button = buttons.find(b => b.getAttribute('aria-label') === `Copy link to ${title}`);
      const anchor = button.dataset.copyDraftLink ?? `google-trends-${button.closest('[data-trends-card]').dataset.trendsCard}`;
      assert.equal(performanceUrl('https://www.plneuro.xyz/neuro-atlas/field-velocity?x=1&x=2', anchor), `https://www.plneuro.xyz/neuro-atlas/field-velocity?x=1&x=2#${slug}`);
      assert.equal(new URL(chartShareUrl('https://www.plneuro.xyz/neuro-atlas/field-velocity?token=private&view=all', anchor)).hash, `#${slug}`);
    }
    const expectedRelated = ['selected-chronic-intracortical-recipients', 'neural-recording-hours-selected-datasets', 'neuroai-performance-cost-frontier', 'selected-structure-function-matches', 'flyvis-correct-contrast-preference'];
    assert.deepEqual([...doc.querySelectorAll('[data-related-measurement]')].map(a => a.getAttribute('href')), expectedRelated.map(s => `#${s}`));
  } finally { dom.window.close(); }
});

async function until(predicate) {
  for (let i = 0; i < 30 && !predicate(); i++) await settle();
  assert.ok(predicate(), 'Expected URL/modal/focus state settled');
}
for (const [legacy, canonical, title] of [
  ['expectations', 'inflection-points', null],
  ['idea_vintage', 'citation-latency', 'Citation latency'],
  ['revealed_commitments', 'implanted-bci-participants-over-time', 'Implanted BCI participants over time'],
  ['metric-panel-neuroai-imagenet', 'neuroai-performance-cost-frontier', 'NeuroAI performance–cost frontier'],
]) for (const entry of [legacy, canonical]) test(`fresh #${entry} resolves and replaces only the fragment, including StrictMode`, async () => {
  let length;
  const sentinel = { __NA: true, tree: ['router'], atlasRelatedMeasurement: 'metric-recording-hours', atlasModalFrom: null };
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Page)), `#${entry}`, win => {
    win.history.replaceState(sentinel, '', `/neuro-atlas/field-velocity?x=1&x=2#${entry}`);
    length = win.history.length;
    win.HTMLElement.prototype.scrollIntoView = function () {
      assert.ok(this.matches('[data-related-measurement]'), 'chart entry never scrolls the background');
    };
  });
  try {
    assert.equal(window.location.href, `https://atlas.example/neuro-atlas/field-velocity?x=1&x=2#${canonical}`);
    assert.equal(window.history.length, length, 'legacy normalization uses replace, never push');
    assert.deepEqual(window.history.state, sentinel, 'router and modal/related state preserved');
    assert.equal(document.querySelector('[aria-current=true]').textContent, title ? 'Metrics' : 'Inflection points');
    if (title) {
      await until(() => document.activeElement === document.querySelector('dialog[open] .pc-modal-header button'));
      assert.equal(document.querySelectorAll('dialog[open]').length, 1);
      assert.equal(document.querySelector('dialog[open] h2').textContent, title);
      assert.equal(document.querySelector('dialog[open]').closest('[hidden]'), null);
      await click(document.querySelector('dialog[open] .pc-modal-header button'));
      assert.equal(window.location.hash, '#metrics');
      assert.equal(document.querySelector('dialog'), null);
    }
  } finally { await cleanup(); }
});

test('unknown fragments remain untouched and unknown new share targets fail closed', async () => {
  const cleanup = await mount(React.createElement(Page), '#not-a-chart');
  try {
    assert.equal(window.location.hash, '#not-a-chart');
    assert.equal(document.querySelector('dialog'), null);
    for (const value of ['METRICS', 'metric-panel-unknown', 'neuroai-performance-cost-frontier/', 'selected tissue']) assert.throws(() => performanceUrl(window.location.href, value), /Unknown/);
  } finally { await cleanup(); }
});


test('registry is collision-free, explicit, and covers the entire frozen legacy contract', () => {
  const owners = new Map();
  for (const link of FIELD_VELOCITY_LINKS) {
    assert.match(link.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.doesNotMatch(link.slug, /^(draft|metric-panel)-|over-time.*neuroai/);
    for (const token of new Set([link.slug, link.target, ...link.aliases])) {
      assert.equal(owners.has(token), false, `Duplicate public identity ${token}`);
      owners.set(token, link.slug);
    }
  }
  for (const anchor of [...performanceAnchors, ...draftChartAnchors, ...metricChartAnchors]) {
    assert.ok(fieldVelocityLink(anchor), `Unmapped legacy URL ${anchor}`);
    assert.equal(performanceUrl('https://atlas.example/field-velocity', anchor), `https://atlas.example/field-velocity#${owners.get(anchor)}`);
  }
});

test('every canonical chart clears stale search/collapse, opens one real modal and retains Back/Forward', async () => {
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Page)), '#expectations');
  try {
    for (const [title, slug] of inventory) {
      await click(document.querySelector('[data-collapse-metrics]'));
      const search = document.querySelector('#metrics-search');
      await act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'no-dataset-matches');
        search.dispatchEvent(new Event('input', { bubbles: true }));
        navigatePerformance(slug);
      });
      await until(() => document.activeElement === document.querySelector('dialog[open] .pc-modal-header button'));
      assert.equal(window.location.hash, `#${slug}`);
      assert.equal(document.querySelectorAll('dialog[open]').length, 1);
      assert.equal(document.querySelector('dialog[open] h2').textContent, title);
      assert.equal(document.querySelector('dialog[open]').closest('[hidden]'), null);
      assert.equal(search.value, '');
      const length = window.history.length;
      await act(async () => navigatePerformance(fieldVelocityLink(slug).aliases[0]));
      assert.equal(window.history.length, length, 'legacy and canonical equivalent adds no history');
      await click(document.querySelector('dialog[open] .pc-modal-header button'));
      await until(() => window.location.hash === '#inflection-points');
      assert.equal(document.querySelector('dialog'), null);
      await act(async () => window.history.forward());
      await until(() => !!document.querySelector('dialog[open]'));
      assert.equal(window.location.hash, `#${slug}`);
      await act(async () => window.history.back());
      await until(() => window.location.hash === '#inflection-points');
    }
  } finally { await cleanup(); }
});

for (const [legacy, slug, group] of [
  ['draft-mapping-cost', 'cost-and-automation', 'Cost and automation'],
  ['metric-panel-paired-auto', 'mapping-scale', 'Mapping Scale'],
  ['draft-simulation-count', 'simulation-and-neuroai', 'Simulation and NeuroAI'],
  ['metric-panel-precision-temporary-recording', 'human-interfaces-and-recordings', 'Human interfaces and recordings'],
  ['google-trends-neuralink', 'neuralink-brand-context', 'Neurotech field engagement'],
]) test(`retired #${legacy} reveals its meaningful category without restoring a chart`, async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(Page), `#${legacy}`, win => {
    win.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  });
  try {
    await settle(); await settle();
    const toggle = document.querySelector(`[data-metric-toggle="${group}"]`);
    assert.equal(window.location.hash, `#${slug}`);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.ok(scrolled.includes(toggle.id), 'retired target lands on current category heading');
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(document.querySelectorAll('[data-coming-soon], [data-draft-chart-status=gap], [data-trends-card=neuralink]').length, 0);
  } finally { await cleanup(); }
});

test('actual copy controls and their denied-clipboard fallback use canonical URLs without navigating', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');
  let copied;
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText: async value => { copied = value; } } });
  const cleanup = await mount(React.createElement(Page), '#metrics');
  try {
    const buttons = [...document.querySelectorAll('button[aria-label^="Copy link to "]')];
    assert.equal(buttons.length, 24);
    for (const button of buttons) {
      const title = button.getAttribute('aria-label').slice(13);
      const slug = inventory.find(([name]) => name === title)[1];
      await click(button);
      assert.equal(copied, `https://atlas.example/field-velocity?review=1#${slug}`);
      assert.equal(window.location.hash, '#metrics');
      globalThis.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
      await click(button);
      assert.equal(button.parentElement.querySelector('input').value, copied);
      assert.equal(window.location.hash, '#metrics');
      globalThis.navigator.clipboard.writeText = async value => { copied = value; };
    }
  } finally {
    await cleanup();
    if (original) Object.defineProperty(globalThis.navigator, 'clipboard', original);
    else delete globalThis.navigator.clipboard;
  }
});


test('canonical recording export preserves exactly the same allowlisted view as its legacy alias', () => {
  const current = 'https://user:secret@atlas.example/neuro-atlas/field-velocity?recordingView=optical&token=private';
  assert.equal(chartShareUrl(current, 'simultaneous-neural-recordings'), 'https://atlas.example/neuro-atlas/field-velocity?recordingView=optical#simultaneous-neural-recordings');
  assert.equal(chartShareUrl(current + '&recordingView=optical', 'simultaneous-neural-recordings'), 'https://atlas.example/neuro-atlas/field-velocity#simultaneous-neural-recordings');
});


test('native hash and popstate entries normalize with replace and keep retained per-entry state', async () => {
  const cleanup = await mount(React.createElement(Page), '#metrics', win => {
    win.HTMLElement.prototype.scrollIntoView = function () {
      assert.ok(this.matches('[data-related-measurement]'), 'only related-link focus may scroll');
    };
  });
  try {
    const state = { __NA: true, tree: ['retained'], atlasRelatedMeasurement: 'metric-recording-hours', atlasModalFrom: null };
    await act(async () => {
      window.history.pushState(state, '', '/neuro-atlas/field-velocity?x=1&x=2#expectations');
      window.dispatchEvent(new window.PopStateEvent('popstate', { state }));
    });
    const length = window.history.length;
    assert.equal(window.location.hash, '#inflection-points');
    assert.deepEqual(window.history.state, state);
    await act(async () => { window.location.hash = 'draft-panel-neuroai-imagenet'; });
    await until(() => window.location.hash === '#neuroai-performance-cost-frontier' && !!document.querySelector('dialog[open]'));
    assert.equal(window.history.length, length + 1, 'only the native intentional navigation adds an entry');
    await act(async () => window.history.back());
    await until(() => window.location.hash === '#inflection-points');
    assert.deepEqual(window.history.state, state);
    assert.equal(window.location.pathname + window.location.search, '/neuro-atlas/field-velocity?x=1&x=2');
    await act(async () => window.history.forward());
    await until(() => window.location.hash === '#neuroai-performance-cost-frontier');
    assert.equal(document.querySelector('dialog[open] h2').textContent, 'NeuroAI performance–cost frontier');
  } finally { await cleanup(); }
});
