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
async function standalone(slug) {
  return mount(await graphPage({ params: Promise.resolve({ slug }) }), '', win => {
    win.history.replaceState({}, '', atlasPath('/field-velocity/' + slug));
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

test('retinal context is opt-in, animal-extrapolated and geometrically separate from the BCI plot and fit', async () => {
  const close = await standalone(bitrate);
  try {
    const chart = document.querySelector('.graph-detail');
    assert.ok(chart.querySelector('[data-sensory-toggle]'), 'BCI exposes sensory context');
    assert.ok(!chart.querySelector('[data-sensory-context]'));
    await click(chart.querySelector('[data-exploration-fit-toggle]'));
    const svg = chart.querySelector('svg.draft-plot-svg').outerHTML;
    await click(chart.querySelector('[data-sensory-toggle]'));
    const panel = chart.querySelector('[data-sensory-context]');
    assert.equal(panel.querySelector('[data-retinal-bits-per-second]').dataset.retinalBitsPerSecond, '8750000');
    assert.match(panel.textContent, /≈9 Mb\/s.*guinea pig/s);
    assert.match(panel.textContent, /ear.*no verified direct human whole-auditory-nerve rate/is);
    assert.equal(panel.querySelector('a').href, 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/');
    assert.equal(chart.querySelector('svg.draft-plot-svg').outerHTML, svg);
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
