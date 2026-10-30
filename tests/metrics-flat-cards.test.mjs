import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { selectPerformance, selectPace } from '../src/lib/field-velocity/performance.ts';
globalThis.React = React;
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));

function documentFor(element) { return new JSDOM(renderToStaticMarkup(element)).window.document; }

test('flat reference renderers return only individual chart-card peers, without subgroup chrome', () => {
  for (const [component, props, ids] of [
    [PerformanceCurves, { data: selectPerformance(feed), provenance, selection: ['simultaneously-recorded-neurons'] }, ['simultaneously-recorded-neurons']],
    [PaceReadings, { data: selectPace(feed) }, ['idea_vintage', 'latency_compression']],
  ]) {
    const doc = documentFor(React.createElement(component, { ...props, flat: true }));
    assert.deepEqual([...doc.body.children].map(n => n.dataset.performanceCard), ids);
    assert.ok([...doc.body.children].every(n => n.matches('article.pc-card')));
    assert.equal(doc.querySelector('.pc-grid, .pc-section-header, .pc-intro, .pc-provenance'), null);
    assert.equal(doc.querySelector('dialog, table, .pc-point-readout'), null, 'Detail stays unmounted at rest');
  }
});

import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, isVisibleMetric } from '../src/data/metric-chart-visibility.ts';

test('flat curated rendering gives each real plot and timeline its own peer article', () => {
  const doc = documentFor(React.createElement(DraftChartsSection, { flat: true, showGaps: false }));
  const cards = [...doc.body.children];
  const visible = METRIC_CHARTS.filter(isVisibleMetric);
  const expected = visible.reduce((n, chart) => n + METRIC_CHART_EVIDENCE[chart.title].plots.length + Number(!!METRIC_CHART_EVIDENCE[chart.title].timeline), 0);
  assert.equal(cards.length, expected);
  for (const card of cards) {
    assert.ok(card.matches('article[data-draft-chart-card]'));
    assert.equal(card.querySelectorAll('[data-draft-popout]').length, 1, 'One real panel per chart card');
    assert.equal(card.querySelector('article, .draft-chart-grid, .draft-chart-plots'), null, 'No chart-in-card-in-card');
    assert.equal(card.querySelector('[data-draft-popout]').closest('article'), card);
  }
  const ids = [...doc.querySelectorAll('[id]')].map(n => n.id);
  assert.equal(ids.length, new Set(ids).size, 'Candidate, canonical, panel and legacy aliases stay unique');
  assert.deepEqual([...doc.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation).sort(),
    visible.flatMap(chart => METRIC_CHART_EVIDENCE[chart.title].plots.flatMap(plot => plot.points.map(p => p.id))).sort());
  assert.equal(doc.querySelectorAll('[data-source-event]').length, visible.reduce((n, chart) => n + (METRIC_CHART_EVIDENCE[chart.title].timeline?.events.length ?? 0), 0));
});

import { mount, click } from './modal-helpers.mjs';

test('flat curated cards keep essential scope visible and move complete definitions into their own modal', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection, { flat: true, showGaps: false }));
  try {
    assert.equal(document.querySelector('[data-draft-methodology], .draft-chart-summary'), null);
    const chart = METRIC_CHARTS.find(c => c.title === 'Largest published connectome over time');
    const cards = [...document.querySelectorAll('[data-draft-chart-card]')].filter(c => c.dataset.draftChartCard === chart.title);
    assert.equal(cards.length, 2);
    for (const card of cards) {
      assert.ok(card.querySelector('[data-metric-scope]')?.textContent.trim(), 'Scientific scope remains visible');
      assert.match(card.textContent, /Hemibrain|MICrONS|FlyWire/);
      await click(card.querySelector('[data-draft-popout-trigger]'));
      const modal = card.querySelector('dialog[open]');
      assert.equal(modal.querySelector('[data-draft-methodology] dd').textContent, chart.axes);
      assert.ok(modal.textContent.includes(chart.definition));
      assert.ok(modal.textContent.includes(chart.constraint));
      assert.ok(modal.textContent.includes(METRIC_CHART_EVIDENCE[chart.title].summary));
      assert.equal(modal.querySelector('.draft-plot-inspector').textContent, '');
      assert.ok(modal.querySelector('[data-copy-chart]'));
      assert.ok(modal.querySelector('[data-download-chart]'));
      await click(modal.querySelector('.pc-modal-header button'));
    }
  } finally { await cleanup(); }
});

import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('category expansion keeps all chart families in one native horizontal rail with an outside action', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    document.head.append(style);
    assert.equal(document.querySelectorAll('[data-metric-rail]').length, 5);
    assert.equal(document.body.textContent.split('Open a chart for methodology and downloadable source values.').length - 1, 1);
    assert.doesNotMatch(document.querySelector('.metrics-index > [role=status]')?.textContent ?? '', /5 groups|featured chart/);
    for (const category of document.querySelectorAll('[data-metrics-category]')) {
      assert.equal(category.classList.contains('card'), false, 'Category is a heading, not an enclosing padded card');
      assert.equal(category.querySelector('.metric-category-summary'), null);
      const grid = category.querySelector('[data-metric-rail]');
      assert.equal(getComputedStyle(grid).gridAutoFlow, 'column');
      assert.equal(getComputedStyle(grid).overflowX, 'auto');
      assert.equal(grid.tabIndex, 0, 'Native keyboard scrolling stays available');
      assert.equal(grid.getAttribute('aria-label'), `${category.dataset.metricsCategory} charts`);
      const more = category.querySelector('[data-metric-more]');
      assert.equal(more.parentElement, grid.parentElement, 'The action stays outside the scrollable track');
      assert.equal(grid.contains(more), false);
      assert.equal(more.textContent, 'show more charts');
      const featured = [...grid.querySelectorAll('article')].filter(n => !n.closest('[hidden]'));
      assert.equal(featured.length, 1);
      for (const hidden of grid.querySelectorAll('[hidden]')) assert.equal(getComputedStyle(hidden).display, 'none', 'display:contents must not reveal hidden fragments or tiles');
      await click(more);
      assert.equal(featured[0].isConnected, true, 'Do not replace/remount the featured chart');
      assert.equal(featured[0].closest('[hidden]'), null);
      assert.equal([...grid.querySelectorAll('article')].filter(n => !n.closest('[hidden]'))[0], featured[0], 'Revealed peers follow the unchanged featured tile in every family');
      assert.equal(more.textContent, 'show only featured');
      assert.equal(grid.querySelector('.pc-grid, .draft-chart-grid, .pc-section-header'), null, 'No nested subgroup grids or headings in the rail');
      assert.ok([...grid.querySelectorAll('article')].filter(n => !n.closest('[hidden]')).length > 1);
      for (const card of grid.querySelectorAll('article')) {
        assert.ok(card.hasAttribute('data-metric-tile') || card.hasAttribute('data-trends-card'), 'Every chart or scalar reading has a stable tile selector (Trends retains its owned selector)');
        assert.equal(card.closest('[data-metric-rail]'), grid);
        assert.equal(card.parentElement === grid || card.parentElement.classList.contains('metric-chart-fragment'), true);
      }
      await click(more);
      assert.equal([...grid.querySelectorAll('article')].filter(n => !n.closest('[hidden]')).length, 1);
    }
    const commitment = document.getElementById('revealed_commitments');
    assert.ok(commitment.matches('article[data-metric-tile]'), 'Historical cohort reading remains a peer, not a fifth chart');
  } finally { await cleanup(); }
});

import { DraftChartShare } from '../src/components/draft-chart-share.tsx';
import { act } from 'react';

test('each chart has only Copy link at rest, with selectable URL fallback only after clipboard failure', async () => {
  let copied;
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText: async value => { copied = value; } } });
  const cleanup = await mount(React.createElement(React.Fragment, null,
    React.createElement(DraftChartShare, { anchor: 'draft-recording-hours', label: 'Recording hours' }),
    React.createElement(PaceReadings, { data: selectPace(feed), flat: true })));
  try {
    assert.equal(document.querySelectorAll('a, input[readonly], .pc-expand').length, 0, 'No repeated Direct link / View chart hints');
    assert.equal(document.querySelectorAll('button[aria-label^="Copy link"]').length, 3);
    const button = document.querySelector('[data-copy-draft-link="metric-recording-hours"]');
    const before = window.location.href;
    await click(button);
    assert.equal(copied, 'https://atlas.example/field-velocity?review=1#metric-recording-hours');
    assert.equal(window.location.href, before, 'Copy does not navigate');
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
    await click(button);
    const fallback = button.parentElement.querySelector('input[readonly]');
    assert.equal(fallback.value, copied);
    assert.equal(button.parentElement.querySelector('a').href, copied);
    // React was imported before jsdom existed; its legacy input-event probe needs this browser seam.
    fallback.attachEvent = () => {};
    fallback.detachEvent = () => {};
    await act(async () => fallback.focus());
    assert.equal(fallback.selectionStart, 0);
    assert.equal(fallback.selectionEnd, copied.length);
  } finally {
    await cleanup();
    if (original) Object.defineProperty(globalThis.navigator, 'clipboard', original); else delete globalThis.navigator.clipboard;
  }
});

test('curated tiles remove repeated enlargement and observation-count copy while retaining a named full-card trigger', () => {
  const doc = documentFor(React.createElement(DraftChartsSection, { flat: true, showGaps: false }));
  assert.equal(doc.querySelectorAll('.draft-popout-hint, .draft-chart-readiness, .draft-chart-card-header').length, 0);
  for (const trigger of doc.querySelectorAll('[data-draft-popout-trigger]')) {
    assert.match(trigger.getAttribute('aria-label'), /^Enlarge .+/);
    assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
  }
});

test('reference previews use readable compact axes with wrapped HTML date labels, independent of full-chart geometry', () => {
  const doc = documentFor(React.createElement(React.Fragment, null,
    React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance, flat: true, selection: ['simultaneously-recorded-neurons'] }),
    React.createElement(PaceReadings, { data: selectPace(feed), flat: true })));
  const style = doc.createElement('style');
  style.textContent = readFileSync('src/components/performance-curves.css', 'utf8');
  doc.head.append(style);
  for (const preview of doc.querySelectorAll('.pc-preview')) {
    const svg = preview.querySelector('svg');
    const [, , width] = svg.getAttribute('viewBox').split(' ').map(Number);
    assert.ok(width <= 360, '720-unit modal geometry is too dense for a compact card');
    assert.ok(parseFloat(doc.defaultView.getComputedStyle(svg.querySelector('text')).fontSize) * 230 / width >= 11, 'Legible effective tick text at a 230px preview');
    assert.ok(preview.querySelector('.pc-preview-axis')?.textContent, 'Long axis label wraps as HTML, not squeezed SVG text');
    for (const marker of svg.querySelectorAll('circle')) {
      assert.ok(+marker.getAttribute('cx') >= 60);
      assert.ok(+marker.getAttribute('cx') < width - 10);
    }
    for (const label of svg.querySelectorAll('text')) assert.ok(label.textContent.length < 30, 'Compact ticks and units only');
  }
});

test('flat reference and curated cards retain theme paint and keyboard source affordances without retired wrappers', async () => {
  const cleanup = await mount(React.createElement(React.Fragment, null,
    React.createElement(PaceReadings, { data: selectPace(feed), flat: true }),
    React.createElement(DraftChartsSection, { flat: true, showGaps: false })), '#idea_vintage');
  try {
    const style = document.createElement('style');
    style.textContent = ['performance-curves.css', 'draft-chart-plot.css'].map(f => readFileSync(`src/components/${f}`, 'utf8')).join('\n');
    document.head.append(style);
    document.body.style.fontFamily = 'Arial';
    const tick = document.querySelector('.pc-preview svg text');
    assert.equal(getComputedStyle(tick).fill, 'var(--muted)');
    assert.equal(getComputedStyle(tick).fontFamily, getComputedStyle(tick.parentElement).fontFamily);
    const source = document.querySelector('dialog .pc-sources a');
    assert.equal(getComputedStyle(source).color, 'var(--accent)');
    // jsdom does not model native keyboard :focus-visible reliably; inspect the actual scoped rule.
    const focusRule = scope => [...style.sheet.cssRules].find(rule => rule.selectorText?.includes(scope) && rule.selectorText.includes(':focus-visible'));
    await act(async () => source.focus());
    assert.ok(source.closest('.pc-card'));
    assert.match(focusRule('.pc-card')?.style.outline ?? '', /3px solid/);
    await click(document.querySelector('dialog .pc-modal-header button'));
    await click(document.querySelector('[data-draft-popout-trigger]'));
    const summary = document.querySelector('dialog .draft-plot-data > summary');
    await act(async () => summary.focus());
    assert.ok(summary.closest('.metric-chart-card'));
    assert.match(focusRule('.metric-chart-card')?.style.outline ?? '', /2px solid/);
  } finally { await cleanup(); }
});

test('flat reference cards keep provider export timestamps and revision provenance in the modal, not a repeated footer', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance, flat: true, selection: ['simultaneously-recorded-neurons'] }));
  try {
    assert.equal(document.querySelector('.pc-provenance'), null);
    await click(document.querySelector('.pc-trigger'));
    const details = document.querySelector('dialog .pc-provenance');
    assert.ok(details, 'Detailed provider provenance must not be discarded with the retired wrapper');
    for (const value of [provenance.exportGeneratedAt, provenance.providerCommit, provenance.sha256]) assert.ok(details.textContent.includes(value));
    assert.ok(details.querySelector(`a[href="${provenance.source.repository}/tree/${provenance.providerCommit}"]`));
  } finally { await cleanup(); }
});
