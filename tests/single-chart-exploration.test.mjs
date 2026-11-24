import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { click, mount } from './modal-helpers.mjs';

globalThis.React = React;
const graphPage = graphModule.default.default ?? graphModule.default;
const bitrate = 'bci-information-transfer-over-time';
const recording = 'simultaneous-neural-recordings';
const tissue = 'selected-tissue-volume-checkpoints';
const button = selector => document.querySelector(selector);
async function standalone(slug, search = '') {
  return mount(await graphPage({ params: Promise.resolve({ slug }) }), '', win => {
    win.history.replaceState({}, '', atlasPath('/field-velocity/' + slug) + search);
    win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  });
}

test('bitrate legend changes actual marks and recomputes the visible eligible model without removing evidence', async () => {
  const close = await standalone(bitrate);
  try {
    const chart = document.querySelector('.graph-detail');
    const toggle = () => chart.querySelector('[data-exploration-fit-toggle]');
    const fit = () => chart.querySelector('[data-exploration-fit-line]');
    const key = term => [...chart.querySelectorAll('[data-exploration-series]')].find(b => b.textContent.includes(term));
    const marks = () => chart.querySelectorAll('svg [data-source-observation]').length;
    assert.equal(marks(), 14);
    assert.equal(fit(), null);
    assert.ok(toggle(), 'extrapolation is opt-in');
    await click(toggle());
    assert.equal(fit()?.dataset.fitN, '9');
    const geometry = fit().getAttribute('points');
    await click(key('Speech decoding'));
    assert.equal(key('Speech decoding').getAttribute('aria-pressed'), 'false');
    assert.equal(marks(), 9);
    assert.equal(fit()?.dataset.fitN, '4');
    assert.notEqual(fit().getAttribute('points'), geometry);
    await click(key('Cursor / grid control'));
    assert.equal(fit()?.dataset.fitN, '4');
    for (const term of ['Endovascular switch', 'Text selection', 'Handwriting']) await click(key(term));
    assert.equal(marks(), 0);
    assert.equal(fit(), null);
    assert.ok(chart.querySelector('[data-exploration-empty]'));
    assert.equal(chart.querySelectorAll('.draft-plot-data tbody tr').length, 14);
    await click(chart.querySelector('[data-exploration-reset]'));
    assert.equal(marks(), 14);
  } finally { await close(); }
});

test('bitrate controls sit between the plot and the study key even with diagnostics open', async () => {
  const close = await standalone(bitrate);
  try {
    const chart = document.querySelector('.graph-detail');
    const el = selector => chart.querySelector(selector);
    const before = (a, b) => !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    const svg = el('svg.draft-plot-svg');
    const study = el('[data-point-annotation]');
    const fit = el('[data-exploration-fit-toggle]');
    const sensory = el('[data-sensory-toggle]');
    const filters = [...chart.querySelectorAll('[data-exploration-series]')];
    assert.ok(filters.length > 0);
    for (const control of [...filters, fit, sensory]) {
      assert.ok(before(svg, control) && before(control, study), 'plot controls precede the long study key');
    }
    await click(fit);
    assert.ok(before(sensory, el('[data-exploration-fit-diagnostics]')), 'both switches are reachable before fit diagnostics');
  } finally { await close(); }
});

test('retinal context adds an opt-in exact-rate dotted log-axis reference without becoming BCI evidence or a fit input', async () => {
  const close = await standalone(bitrate);
  try {
    const chart = document.querySelector('.graph-detail');
    const el = selector => chart.querySelector(selector);
    const svg = () => el('svg.draft-plot-svg');
    assert.equal(el('[data-sensory-toggle]').getAttribute('aria-checked'), 'false');
    assert.equal(el('[data-sensory-reference]'), null);
    assert.equal(el('[data-sensory-context]'), null);
    const original = svg().outerHTML;
    const rows = el('.draft-plot-data tbody').outerHTML;
    const sourceLinks = () => [...chart.querySelectorAll('.draft-plot-data a, a[download]')].map(link => [link.getAttribute('href'), link.getAttribute('download'), link.textContent]);
    const sources = sourceLinks();
    assert.ok(sources.length > 0, 'retain the chart’s existing source/method links');
    await click(el('[data-exploration-fit-toggle]'));
    const modeled = svg().outerHTML;
    const diagnostics = el('[data-exploration-fit-diagnostics]').textContent;
    const ids = [...svg().querySelectorAll('[data-source-observation]')].map(mark => mark.dataset.sourceObservation);
    await click(el('[data-sensory-toggle]'));
    const line = el('svg [data-sensory-reference]');
    assert.ok(line, 'sensory context must appear inside the actual chart');
    assert.equal(line.tagName, 'line');
    assert.equal(line.dataset.value, '8750000', 'geometry uses the exact source scenario, not rounded 9 Mb/s');
    assert.equal(line.getAttribute('y1'), line.getAttribute('y2'), 'reference is horizontal');
    assert.equal(line.getAttribute('stroke-dasharray'), '2 5', 'short dotted reference is distinct from the model continuation');
    const ticks = [...svg().querySelectorAll('g')].flatMap(group => {
      const grid = group.querySelector(':scope > .draft-plot-gridline');
      const label = group.querySelector(':scope > .draft-plot-tick');
      return grid && label ? [{ value: Number(label.textContent.replaceAll(',', '')), y: +grid.getAttribute('y1'), grid }] : [];
    });
    const low = ticks[0], high = ticks.at(-1);
    const expectedY = low.y + (Math.log10(8750000) - Math.log10(low.value)) / (Math.log10(high.value) - Math.log10(low.value)) * (high.y - low.y);
    assert.ok(Math.abs(+line.getAttribute('y1') - expectedY) < 1e-9, 'reference uses the same log interpolation as the axis');
    assert.ok(+line.getAttribute('y1') > high.y && +line.getAttribute('y1') < low.y, 'axis includes the reference with headroom');
    for (const attr of ['x1', 'x2']) assert.equal(line.getAttribute(attr), low.grid.getAttribute(attr), 'reference spans the plot, not a separate scale');
    const label = el('svg [data-sensory-reference-label]');
    assert.match(label.textContent, /Eye → brain.*≈9 Mb\/s.*animal-scaled.*human retinal scenario/s);
    assert.equal(label.closest('details'), null, 'the qualified label is visible without expanding notes');
    assert.equal(el('[data-exploration-fit-line]').dataset.fitN, '9');
    assert.equal(el('[data-exploration-fit-diagnostics]').textContent, diagnostics, 'cohort, coefficients and R² do not change');
    assert.deepEqual([...svg().querySelectorAll('[data-source-observation]')].map(mark => mark.dataset.sourceObservation), ids);
    assert.equal(el('.draft-plot-data tbody').outerHTML, rows);
    assert.deepEqual(sourceLinks(), sources);
    // #142 supersedes PR134's separate eye/ear prose panel with a compact,
    // qualified chart reference and the primary-source assumptions disclosure.
    const panel = el('[data-sensory-assumptions]');
    assert.match(panel.textContent, /guinea pig/);
    assert.match(panel.textContent, /8,750,000/);
    assert.match(panel.textContent, /not a direct human measurement.*capacity.*BCI target/i);
    assert.equal(el('[data-sensory-context]'), null);
    assert.equal(panel.querySelector('a').href, 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/');
    await click(el('[data-sensory-toggle]'));
    assert.equal(svg().outerHTML, modeled, 'Off restores exact modeled SVG');
    await click(el('[data-exploration-fit-toggle]'));
    assert.equal(svg().outerHTML, original, 'both toggles Off restore the original SVG');
  } finally { await close(); }
});

test('retinal reference wraps within narrow plots, clears numbered badges and keeps measured rates readable', async () => {
  const previous = globalThis.ResizeObserver, observers = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() {}
  };
  const close = await standalone(bitrate);
  try {
    const chart = document.querySelector('.graph-detail');
    const el = selector => chart.querySelector(selector);
    await click(el('[data-sensory-toggle]'));
    const observer = observers.find(observer => observer.target.matches('figure.draft-plot'));
    for (const width of [252, 320, 390, 560, 1440]) {
      await act(async () => observer.callback([{ contentRect: { width } }]));
      for (const modeled of [false, true]) {
        if (modeled) await click(el('[data-exploration-fit-toggle]'));
        const svg = el('svg.draft-plot-svg');
        assert.equal(+svg.getAttribute('viewBox').split(' ')[2], width);
        const line = el('[data-sensory-reference]');
        const label = el('[data-sensory-reference-label]');
        const lines = [...label.querySelectorAll('tspan')];
        assert.ok(lines.length >= (width <= 390 ? 2 : 1), `qualified reference wraps as needed at ${width}px`);
        const fontSize = +label.getAttribute('font-size');
        const x = +label.getAttribute('x'), firstY = +label.getAttribute('y');
        const lineHeight = lines.length > 1 ? +lines[1].getAttribute('dy') : 0;
        const region = { left: x - 3, right: x + Math.max(...lines.map(span => span.textContent.trim().length)) * 7 + 3,
          top: firstY - fontSize - 3, bottom: firstY + (lines.length - 1) * lineHeight + 3 };
        assert.ok(region.left > +line.getAttribute('x1') && region.right < +line.getAttribute('x2'), `label stays within plot at ${width}px`);
        assert.ok(region.bottom < +line.getAttribute('y1'), 'merged compact label stays above its dotted line');
        assert.ok(lines.every(span => +span.getAttribute('x') === x));
        for (const rect of svg.querySelectorAll('[data-annotation-key] rect')) {
          const left = +rect.getAttribute('x'), top = +rect.getAttribute('y');
          assert.ok(left + +rect.getAttribute('width') < region.left || left > region.right
            || top + +rect.getAttribute('height') < region.top || top > region.bottom,
          `numbered study badge clears the sensory label at ${width}px`);
        }
        const calendarTicks = [...svg.children].filter(node => node.matches('text.draft-plot-tick[text-anchor="middle"]'));
        for (let index = 1; index < calendarTicks.length; index++) {
          assert.ok(+calendarTicks[index].getAttribute('x') - +calendarTicks[index - 1].getAttribute('x') >= 34,
            `calendar labels retain a readable gap in sensory view at ${width}px`);
        }
        const centers = [...svg.querySelectorAll('[data-annotation-leader]')].map(leader => +leader.getAttribute('y1'));
        assert.equal(centers.length, 14, 'all measured/context BCI marks retain their study key');
        assert.ok(Math.max(...centers) - Math.min(...centers) >= 80, 'extending the log domain must not squash the measured range into a tiny strip');
        assert.ok(region.bottom < Math.min(...centers), 'sensory label clears the observed BCI range');
        if (modeled) await click(el('[data-exploration-fit-toggle]'));
      }
    }
  } finally {
    await close();
    if (previous === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previous;
  }
});

test('sensory rescaling clears a pinned source tooltip on both toggle directions', async () => {
  const close = await standalone(bitrate);
  try {
    const chart = document.querySelector('.graph-detail');
    for (const enabled of [true, false]) {
      await click(chart.querySelector('[data-point-annotation]'));
      assert.ok(document.querySelector('[role="tooltip"][data-pinned]'), 'pin a real BCI source detail before rescaling');
      await click(chart.querySelector('[data-sensory-toggle]'));
      assert.equal(chart.querySelector('[data-sensory-toggle]').getAttribute('aria-checked'), String(enabled));
      assert.ok(document.querySelector('[role="tooltip"]') === null, 'the old point inspection must not survive changed geometry');
    }
  } finally { await close(); }
});

test('sensory reference composes with filtering, all-hidden, reset and fresh URL state without changing refits or sources', async () => {
  let close = await standalone(bitrate);
  let hiddenSearch, hiddenReference, originalRows;
  const el = selector => document.querySelector('.graph-detail').querySelector(selector);
  const reference = () => [el('[data-sensory-reference]').outerHTML, el('[data-sensory-reference-label]').outerHTML];
  try {
    await click(el('[data-exploration-fit-toggle]'));
    const originalModeled = el('svg.draft-plot-svg').outerHTML;
    originalRows = el('.draft-plot-data tbody').outerHTML;
    for (const selection of ['all', 'no speech', 'none']) {
      if (selection === 'no speech') await click(el('[data-exploration-series="Speech decoding"]'));
      if (selection === 'none') for (const control of document.querySelectorAll('[data-exploration-series][aria-pressed="true"]')) await click(control);
      const offSvg = el('svg.draft-plot-svg').outerHTML;
      const diagnostics = el('[data-exploration-fit-diagnostics]').textContent;
      const n = el('[data-exploration-fit-line]')?.dataset.fitN;
      const marks = [...document.querySelectorAll('svg [data-source-observation]')].map(mark => mark.dataset.sourceObservation);
      await click(el('[data-sensory-toggle]'));
      assert.equal(el('[data-sensory-reference]').dataset.value, '8750000');
      assert.equal(el('[data-exploration-fit-diagnostics]').textContent, diagnostics, `${selection}: no model changes`);
      assert.equal(el('[data-exploration-fit-line]')?.dataset.fitN, n);
      assert.deepEqual([...document.querySelectorAll('svg [data-source-observation]')].map(mark => mark.dataset.sourceObservation), marks);
      assert.equal(el('.draft-plot-data tbody').outerHTML, originalRows);
      assert.equal(el('[data-copy-chart]'), null, 'sensory views stay link-only');
      assert.equal(el('[data-download-chart]'), null);
      if (selection === 'none') {
        assert.equal(marks.length, 0);
        assert.ok(el('[data-exploration-empty]'));
        assert.equal(n, undefined, 'a reference cannot create a model when all observations are hidden');
        hiddenSearch = window.location.search;
        hiddenReference = reference();
      }
      await click(el('[data-sensory-toggle]'));
      assert.equal(el('svg.draft-plot-svg').outerHTML, offSvg, `${selection}: Off restores exact filtered SVG`);
    }
    await click(el('[data-sensory-toggle]'));
    await click(el('[data-exploration-reset]'));
    assert.equal(document.querySelectorAll('svg [data-source-observation]').length, 14);
    assert.equal(el('[data-exploration-fit-line]').dataset.fitN, '9');
    assert.ok(el('[data-sensory-reference]'), 'reset restores series without disabling the requested reference');
    await click(el('[data-sensory-toggle]'));
    assert.equal(el('svg.draft-plot-svg').outerHTML, originalModeled);
  } finally { await close(); }
  close = await standalone(bitrate, hiddenSearch);
  try {
    assert.deepEqual(reference(), hiddenReference, 'fresh URL restores the actual reference geometry and wrapped label');
    assert.equal(document.querySelectorAll('svg [data-source-observation]').length, 0);
    assert.ok(el('[data-exploration-empty]'));
    assert.equal(el('[data-exploration-fit-line]'), null);
    assert.equal(el('.draft-plot-data tbody').outerHTML, originalRows);
  } finally { await close(); }
});

test('tissue reference lines and the nominal voxel view reuse the brain model without changing original evidence', async () => {
  const close = await standalone(tissue);
  try {
    const chart = document.querySelector('.graph-detail');
    const el = s => chart.querySelector(s);
    const references = () => [...chart.querySelectorAll('[data-brain-scale-reference]')].map(ref => +ref.dataset.value);
    const axes = () => el('svg.draft-plot-svg text').textContent;
    const svg = () => el('svg.draft-plot-svg').outerHTML;
    const original = svg();
    const evidence = el('.draft-plot-data table').textContent;
    assert.deepEqual(references(), []);
    assert.ok(el('[data-brain-scale-toggle]'), 'tissue chart has an anatomical scale switch');
    await click(el('[data-brain-scale-toggle]'));
    assert.deepEqual(references(), [.45, 78.55, 1200]);
    await click(el('[data-voxel-view-toggle]'));
    assert.match(axes(), /Nominal image voxels/);
    assert.deepEqual(references().map(n => n.toPrecision(5)), ['7.0313e+17', '1.2273e+20', '1.8750e+21']);
    assert.equal(el('.draft-plot-data table').textContent, evidence);
    await click(el('[data-voxel-view-toggle]'));
    await click(el('[data-brain-scale-toggle]'));
    assert.equal(svg(), original);
  } finally { await close(); }
});

test('Trends legend hides the selected keyword line and hit targets, preserving source rows', async () => {
  const close = await standalone('neurotech-search-terms');
  try {
    const card = document.querySelector('.graph-detail');
    assert.equal(card.querySelectorAll('[data-trend-line]').length, 2);
    const keys = [...card.querySelectorAll('[data-exploration-series]')];
    assert.equal(keys.length, 2, 'mounted Trends plot has two keyword filters');
    const rows = card.querySelectorAll('[data-trends-row]').length;
    const hidden = keys[0].dataset.explorationSeries;
    await click(keys[0]);
    assert.equal(card.querySelectorAll('[data-trend-line]').length, 1);
    assert.ok([...card.querySelectorAll('[data-trend-point]')].every(p => p.dataset.term !== hidden));
    await click(keys[1]);
    assert.equal(card.querySelectorAll('[data-trend-line]').length, 0);
    assert.ok(card.querySelector('[data-exploration-empty]'));
    assert.equal(card.querySelectorAll('[data-trends-row]').length, rows);
  } finally { await close(); }
});

test('publication filter hides the selected comparison line and its targets without rebasing the axis', async () => {
  const close = await standalone('neurotech-papers-per-year');
  try {
    const card = document.querySelector('.graph-detail');
    const ticks = () => [...card.querySelectorAll('[data-annual-index-tick]')].map(t => t.textContent);
    const initial = ticks();
    assert.ok(initial.length > 0);
    const key = card.querySelector('[data-exploration-series="all-research"]');
    assert.ok(key, 'annual publications exposes its science reference key');
    await click(key);
    assert.equal(card.querySelector('polyline[data-science-context]'), null);
    assert.equal(card.querySelectorAll('[data-science-year]').length, 0);
    assert.ok(card.querySelector('polygon[data-science-context]'));
    assert.deepEqual(ticks(), initial);
    assert.ok(card.querySelector('table'));
  } finally { await close(); }
});

test('a recording legend hides the plotted view without conflating its track with another recording view', async () => {
  const close = await standalone(recording);
  try {
    const key = button('[data-exploration-series="historical"]');
    assert.ok(key, 'recording plot exposes its track in the legend');
    await click(key);
    assert.equal(document.querySelectorAll('[data-curve-point]').length, 0);
    assert.equal(document.querySelectorAll('svg [data-historical-fit]').length, 0);
    assert.ok(button('[data-exploration-empty]'));
    assert.ok(button('[data-recording-source-json]'));
    const selector = button('[data-recording-view-select]');
    await act(async () => { selector.value = 'optical'; selector.dispatchEvent(new Event('change', { bubbles: true })); });
    assert.ok(document.querySelectorAll('[data-curve-point]').length > 0);
    assert.equal(button('[data-exploration-empty]'), null);
    await act(async () => { selector.value = 'historical'; selector.dispatchEvent(new Event('change', { bubbles: true })); });
    assert.equal(document.querySelectorAll('[data-curve-point]').length, 0);
  } finally { await close(); }
});

test('acquisition continuations stay in separate method families and omit prospective observations', async () => {
  const close = await standalone('estimated-acquisition-efficiency-voxels-per-dollar');
  try {
    const chart = document.querySelector('.graph-detail');
    await click(chart.querySelector('[data-exploration-fit-toggle]'));
    const fitted = () => [...chart.querySelectorAll('[data-exploration-fit-line]')].map(node => [node.dataset.explorationFitLine, node.dataset.fitN, node.getAttribute('points')]);
    const before = fitted();
    assert.deepEqual(before.map(row => row.slice(0,2)), [['Expansion microscopy · estimates','4'], ['EM · reported-tech estimates','4']]);
    await click(chart.querySelector('[data-exploration-series="PEEM · prospective"]'));
    assert.equal(chart.querySelector('svg [data-source-observation="peem2024"]'), null);
    assert.deepEqual(fitted(), before);
    await click(chart.querySelector('[data-exploration-series="Expansion microscopy · estimates"]'));
    assert.deepEqual(fitted().map(row => row.slice(0,2)), [['EM · reported-tech estimates','4']]);
  } finally { await close(); }
});

test('the standalone publication-growth baseline changes the reference, not the numerator or original source payload', async () => {
  const close = await standalone('publication-growth-by-group');
  try {
    const baseline = () => button('[data-growth-baseline]').dataset.growthBaseline;
    const svg = () => button('.publication-full-plot svg');
    const original = svg().outerHTML;
    const numerator = () => [...svg().querySelectorAll('[data-growth-series="neurotech"]')].map(mark => ['cx', 'cy', 'r'].map(attribute => mark.getAttribute(attribute)));
    const originalNumerator = numerator();
    const source = () => button('a[download$="-source.json"]').getAttribute('href');
    const originalSource = source();
    assert.equal(baseline(), 'science');
    await click(button('[data-baseline-option="matched"]'));
    assert.equal(baseline(), 'matched');
    assert.equal(svg().querySelector('[data-science-context]'), null);
    assert.deepEqual(numerator(), originalNumerator);
    assert.equal(source(), originalSource);
    await click(button('[data-baseline-option="science"]'));
    assert.equal(svg().outerHTML, original);
  } finally { await close(); }
});
