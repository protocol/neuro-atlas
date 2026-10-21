import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { ExpectationsSection } from '../src/components/sections/expectations-section.tsx';
import { act } from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const points = JSON.parse(readFileSync('src/data/velocity/neurotech_inflection_points.json', 'utf8')).points;

test('Expectations presents each exact source inflection signal, preserving compound conditions', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(ExpectationsSection)));
  try {
    const entries = [...dom.window.document.querySelectorAll('[data-inflection]')];
    assert.deepEqual(entries.map(node => node.dataset.inflection), points.map(point => point.title));
    for (const point of points) {
      const entry = entries.find(node => node.dataset.inflection === point.title);
      assert.equal(entry.querySelector('[data-inflection-signal]').textContent, point.signal);
    }
  } finally { dom.window.close(); }
});

const expectedLinks = [
  ['The BCI app store', ['metric-implanted-bci-humans']],
  ['Neural distillation', ['metric-recording-hours']],
  ['The neuromorphic energy pivot', ['metric-panel-neuroai-imagenet']],
  ['Memory retrieval in simulation', ['metric-paired-structure-function', 'metric-panel-flyvis-contrast']],
];

test('each inflection has bounded related measurements distinct from forecast proxies', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(ExpectationsSection)));
  try {
    const doc = dom.window.document;
    for (const [title, anchors] of expectedLinks) {
      const entry = [...doc.querySelectorAll('[data-inflection]')].find(node => node.dataset.inflection === title);
      const group = entry.querySelector('[data-related-measurements]');
      assert.ok(group, `${title}: related measurements group`);
      assert.match(group.textContent, /Related measurements/);
      assert.deepEqual([...group.querySelectorAll('a')].map(link => link.getAttribute('href')), anchors.map(anchor => `#${anchor}`));
      assert.ok([...group.querySelectorAll('[data-measurement-relationship]')].every(node => node.textContent.length > 0));
    }
    const forecasts = [...doc.querySelectorAll('[data-related-forecasts]')];
    assert.equal(forecasts.length, 3);
    assert.equal(forecasts.flatMap(node => [...node.querySelectorAll('a')]).length, 4);
    assert.ok(forecasts.every(node => !node.open));
    assert.doesNotMatch(doc.body.textContent, /coming soon|white space|low single digits|decades out|Live:|Next:/i);
    assert.equal(doc.querySelectorAll('[role=progressbar]').length, 0);
  } finally { dom.window.close(); }
});

test('related links reveal the real Metrics card, clear old search, and move keyboard focus through history', async () => {
  const scrolled = [];
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(VelocityTabs, { performance: null })), '#performance_curves', win => {
    win.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  });
  try {
    const search = document.querySelector('#metrics-search');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'nonexistent-data');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      navigatePerformance('expectations');
    });
    for (const [, anchors] of expectedLinks) for (const anchor of anchors) {
      const link = document.querySelector(`[data-related-measurement="${anchor}"]`);
      link.focus();
      await click(link); await settle(); await settle();
      assert.equal(window.location.hash, `#${anchor}`);
      assert.equal(window.location.pathname + window.location.search, '/field-velocity?review=1');
      const target = document.getElementById(anchor);
      assert.equal(target.closest('[hidden]'), null, 'target is visible');
      assert.equal(search.value, '', 'stale search cleared');
      assert.ok(scrolled.includes(anchor), 'target scrolled into view');
      assert.equal(document.activeElement === target.closest('article').querySelector('h4'), true, 'keyboard focus reaches chart heading');
      await act(async () => window.history.back()); await settle(); await settle();
      assert.equal(window.location.hash, '#expectations');
      assert.equal(document.activeElement === link, true, 'Back restores the originating link');
      await act(async () => window.history.forward()); await settle(); await settle();
      assert.equal(window.location.hash, `#${anchor}`);
      assert.equal(document.activeElement === target.closest('article').querySelector('h4'), true, 'Forward restores chart focus');
      await act(async () => window.history.back()); await settle(); await settle();
    }
  } finally { await cleanup(); }
});

test('modified related-link clicks keep native new-tab behavior without changing the current pane', async () => {
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }), '#expectations');
  try {
    const link = document.querySelector('[data-related-measurement]');
    for (const modifier of [{ctrlKey:true}, {metaKey:true}, {shiftKey:true}, {altKey:true}, {button:1}]) {
      let intercepted;
      document.addEventListener('click', event => { intercepted = event.defaultPrevented; event.preventDefault(); }, { once: true });
      await act(async () => link.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, ...modifier })));
      assert.equal(intercepted, false, JSON.stringify(modifier));
      assert.equal(window.location.hash, '#expectations');
    }
  } finally { await cleanup(); }
});

test('related anchors identify actual plotted evidence, with source signals and market questions unchanged', async () => {
  const { RELATED_MEASUREMENTS } = await import('../src/data/related-measurements.ts');
  const { DRAFT_CHART_LINKS, canonicalMetricAnchor } = await import('../src/data/draft-chart-links.ts');
  const { DRAFT_CHART_EVIDENCE } = await import('../src/data/draft-chart-observations.ts');
  assert.deepEqual(Object.keys(RELATED_MEASUREMENTS), points.map(point => point.title));
  for (const measurement of Object.values(RELATED_MEASUREMENTS).flat()) {
    const entry = DRAFT_CHART_LINKS.find(item => canonicalMetricAnchor(item.id) === measurement.anchor || item.panels.some(panel => canonicalMetricAnchor(panel.id) === measurement.anchor));
    assert.ok(entry, measurement.anchor);
    assert.equal(DRAFT_CHART_EVIDENCE[entry.title].status, 'plotted');
  }
  const markets = JSON.parse(readFileSync('src/data/velocity/neurotech_market_signals.json', 'utf8')).mappings;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(ExpectationsSection)));
  try {
    const actual = [...dom.window.document.querySelectorAll('[data-related-forecasts] a')];
    const expected = markets.flatMap(m => m.primary ? [m.primary, ...(m.fallback ? [m.fallback] : [])] : []);
    assert.deepEqual(actual.map(link => link.href), expected.map(item => item.url));
    expected.forEach((item, index) => assert.ok(actual[index].textContent.includes(item.question)));
  } finally { dom.window.close(); }
});

test('retained multi-entry history restores each measurement visit rather than the last link', async () => {
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(VelocityTabs, { performance: null })), '#expectations', win => { win.HTMLElement.prototype.scrollIntoView = function () {}; });
  try {
    window.history.replaceState({ nextRouterState: { retained: true } }, '', window.location.href);
    const a = document.querySelector('[data-related-measurement="metric-implanted-bci-humans"]');
    const b = document.querySelector('[data-related-measurement="metric-recording-hours"]');
    await click(a); await settle(); await settle();
    await click([...document.querySelectorAll('button')].find(x => x.textContent === 'Expectations'));
    await settle();
    await click(b); await settle(); await settle();
    const steps = [
      ['#expectations', b],
      ['#metric-implanted-bci-humans', document.getElementById('metric-implanted-bci-humans').closest('article').querySelector('h4')],
      ['#expectations', a],
    ];
    for (const [hash, focus] of steps) {
      await act(async () => window.history.back()); await settle(); await settle();
      assert.equal(window.location.hash, hash);
      assert.equal(document.activeElement === focus, true, `focus for history entry ${hash}`);
      assert.deepEqual(window.history.state.nextRouterState, { retained: true }, 'unrelated router state preserved');
    }
    for (const [hash, focus] of [steps[1], steps[0], ['#metric-recording-hours', document.getElementById('metric-recording-hours').closest('article').querySelector('h4')]]) {
      await act(async () => window.history.forward()); await settle(); await settle();
      assert.equal(window.location.hash, hash);
      assert.equal(document.activeElement === focus, true, `forward focus ${hash}`);
    }
  } finally { await cleanup(); }
});
