import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { JSDOM } from 'jsdom';
import { canonicalPerformanceAnchor } from '../src/data/field-velocity-links.ts';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { beforeFafbAttribution, preAttributionEvidence } from './helpers/fafb-attribution-baseline.mjs';
import { withoutConnectomicsBackfill } from './helpers/connectomics-provenance-baseline.mjs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const plots = evidence => Object.values(evidence).flatMap(entry => entry.plots);
const selected = (evidence, id) => plots(evidence).find(plot => plot.id === id);
const observed = (evidence, id) => plots(evidence).flatMap(plot => plot.points).find(point => point.id === id);
const fullGolden = evidence => createHash('sha256').update(JSON.stringify(beforeFafbAttribution(withoutConnectomicsBackfill(evidence)))).digest('hex');
const golden = { draft: 'c231dfa219a15927b66ddafe492b3975d2457c8dab1b76082b1e1091acda4731', metric: 'dfbfce299a553a3aff505b70522291a74668940297ebbd011c2ecc5e3d45ee43' };
const addedIds = ['malecns-neurons-2025', 'eyewire-ii-neurons-2026', 'white-1986-canonical-neurons', 'helmstaedter-2013-retina-neurons', 'ryan-2016-ciona-cns-neurons', 'helmstaedter-2013-retina-volume'];

for (const [plotId, count, pointId] of [
  ['largest-connectome-neurons', 10, 'flywire-neurons'],
  ['tissue-cm3', 8, 'flywire-fly-neuropil-2024-01-01'],
]) test(`${plotId}: primary, supporting and discovery provenance coexist in Sources, JSON and SVG metadata`, async () => {
  const plot = selected(METRIC_CHART_EVIDENCE, plotId);
  const point = observed(METRIC_CHART_EVIDENCE, pointId);
  const anchor = `metric-panel-${plotId}`;
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), `#${canonicalPerformanceAnchor(anchor)}`, win => {
    if (plotId !== 'largest-connectome-neurons') return;
    const url = new URL(win.location.href);
    url.searchParams.set('neuronRefs', 'mouse,macaque,human');
    win.history.replaceState(null, '', url);
  });
  let output;
  try {
    const modal = document.querySelector('dialog[open]');
    assert.ok(modal);
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, count);
    const sources = modal.querySelector('.mx-sources');
    const refs = [{ role: point.sourceRole, title: point.sourceTitle, url: point.sourceUrl }, ...point.supportingReferences];
    for (const ref of refs) {
      const rowReferences = modal.querySelector(".mx-data");
      assert.ok(rowReferences.querySelector(`a[href="${ref.url}"]`));
      assert.ok(rowReferences.textContent.includes(`${ref.role}:`));
    }
    const catalog = sources.querySelector(`a[href="${plot.curationSource.url}"]`);
    assert.ok(catalog.parentElement.textContent.startsWith('Dataset discovery:'));
    assert.equal(catalog.closest('.pc-sources'), null, 'Discovery is not a primary measurement citation');
    const download = modal.querySelector('a[data-selected-plot-json]');
    const data = JSON.parse(decodeURIComponent(download.href.split('charset=utf-8,')[1]));
    if (plotId === 'largest-connectome-neurons') {
      const { visibleNeuronReferences, ...source } = data;
      assert.deepEqual(visibleNeuronReferences, ['mouse', 'macaque', 'human']);
      assert.deepEqual(source, plot);
    } else assert.deepEqual(data, plot);
    assert.equal(data.datasetCredit, plot.datasetCredit);
    const specification = (await whenChartRegistered(anchor)).getChart();
    output = new JSDOM(buildChartImage(specification, window.location.href).svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    const description = doc.querySelector('desc').textContent;
    for (const ref of refs) {
      assert.ok(description.includes(`${ref.role}: ${ref.title}`));
      assert.ok(description.includes(ref.url));
    }
    assert.ok(description.includes(`Dataset discovery: ${plot.curationSource.title} · ${plot.curationSource.url}`));
    assert.equal([...doc.querySelectorAll('[data-export-dataset-credit] text')].map(text => text.textContent).join(' '), plot.datasetCredit);
    assert.ok(![...doc.querySelectorAll('text')].some(text => text.textContent.includes('Dataset discovery:')), 'Catalog metadata does not become compact image credit');
  } finally { output?.window.close(); await cleanup(); }
});

test('both exact branch deltas restore original full runtime goldens and normalization is non-mutating', () => {
  for (const [kind, evidence] of [['draft', DRAFT_CHART_EVIDENCE], ['metric', METRIC_CHART_EVIDENCE]]) {
    const original = structuredClone(evidence);
    assert.equal(fullGolden(evidence), golden[kind]);
    assert.deepEqual(evidence, original);
  }
});

test('every field of all six added checkpoints is checked before normalization', () => {
  for (const id of addedIds) for (const field of Object.keys(observed(DRAFT_CHART_EVIDENCE, id))) {
    const mutant = structuredClone(DRAFT_CHART_EVIDENCE);
    const point = observed(mutant, id);
    point[field] = typeof point[field] === 'number' ? point[field] + 1 : `${point[field]} MUTATED`;
    assert.throws(() => fullGolden(mutant), undefined, `${id}.${field}`);
  }
  for (const id of addedIds) for (const action of ['remove', 'duplicate']) {
    const mutant = structuredClone(DRAFT_CHART_EVIDENCE);
    const plot = plots(mutant).find(plot => plot.points.some(point => point.id === id));
    if (action === 'remove') plot.points = plot.points.filter(point => point.id !== id);
    else plot.points.push(structuredClone(observed(mutant, id)));
    assert.throws(() => fullGolden(mutant), undefined, `${id}: ${action}`);
  }
});

test('mutated FAFB citations, roles, notes, image credit and discovery metadata are rejected rather than masked', () => {
  const cases = [
    ...['sourceTitle', 'sourceUrl', 'sourceRole', 'note'].map(field => evidence => { observed(evidence, 'flywire-neurons')[field] += ' MUTATED'; }),
    ...['role', 'title', 'url'].map(field => evidence => { observed(evidence, 'flywire-neurons').supportingReferences[0][field] += ' MUTATED'; }),
    evidence => { delete observed(evidence, 'flywire-neurons').supportingReferences; },
    evidence => { selected(evidence, 'tissue-cm3').datasetCredit += ' MUTATED'; },
    evidence => { delete selected(evidence, 'tissue-cm3').datasetCredit; },
    ...['title', 'url'].map(field => evidence => { selected(evidence, 'largest-connectome-neurons').curationSource[field] += ' MUTATED'; }),
    evidence => { selected(evidence, 'largest-connectome-neurons').observationBasis += ' MUTATED'; },
    evidence => { selected(evidence, 'tissue-cm3').scope += ' MUTATED'; },
    evidence => { selected(evidence, 'tissue-cm3').exportPointKey = false; },
  ];
  for (const change of cases) {
    const mutant = structuredClone(DRAFT_CHART_EVIDENCE);
    change(mutant);
    assert.throws(() => assert.equal(fullGolden(mutant), golden.draft));
  }
});

test('unlisted historical numeric, date, quote, note and source mutations still reach the frozen full goldens', () => {
  for (const id of ['flywire-neurons', 'hemibrain-neurons']) for (const field of ['x', 'y', 'qualifier', 'dateLabel', 'quote', 'label', 'group', 'annotation', 'sourceTitle', 'sourceUrl', 'note']) {
    const mutant = structuredClone(DRAFT_CHART_EVIDENCE);
    const point = observed(mutant, id);
    point[field] = typeof point[field] === 'number' ? point[field] + 1 : `${point[field] ?? ''} MUTATED`;
    assert.throws(() => assert.equal(fullGolden(mutant), golden.draft), undefined, `${id}.${field}`);
  }
  const mutant = structuredClone(DRAFT_CHART_EVIDENCE);
  selected(mutant, 'largest-connectome-neurons').points.push({ ...observed(mutant, addedIds[0]), id: 'unexpected-seventh-checkpoint' });
  assert.notEqual(fullGolden(mutant), golden.draft, 'An unapproved seventh addition is not filtered out');
});

test('raw canonical equality rejects attribution and non-attribution mutations without altering the immutable archive fixture', () => {
  const raw = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'));
  assert.deepEqual(beforeFafbAttribution(raw, true), preAttributionEvidence);
  for (const [id, field] of [['flywire-neurons', 'sourceTitle'], ['flywire-neurons', 'note'], ['flywire-neurons', 'y'], ['hemibrain-neurons', 'sourceUrl']]) {
    const mutant = structuredClone(raw);
    const point = observed(mutant, id);
    point[field] = typeof point[field] === 'number' ? point[field] + 1 : `${point[field]} MUTATED`;
    assert.throws(() => assert.deepEqual(beforeFafbAttribution(mutant, true), preAttributionEvidence), undefined, `${id}.${field}`);
  }
});
