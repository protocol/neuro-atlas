import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {readFileSync} from 'node:fs';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {beforeBrainGateAddition} from './helpers/recording-hours-coverage-baseline.mjs';
const recordingParents=JSON.parse(readFileSync(new URL('./fixtures/pr144-recording-parent-points.json',import.meta.url),'utf8'));
assert.equal(recordingParents.mainSha,'df97d0d70736465657ac50bc9569bbc1b60e6095');
assert.equal(recordingParents.prSha,'85ceb1a0d55e0d2a139b3d1105a577b2497b0f1c');
const recordingTitle='Neural recording hours collected over time';
const recordingIds=recordingParents.main.map(point=>point.id);
assert.deepEqual(METRIC_CHART_EVIDENCE[recordingTitle].plots[0].points,recordingParents.main,'All 13 exact approved-main scientific records');
assert.deepEqual(beforeBrainGateAddition(METRIC_CHART_EVIDENCE)[recordingTitle].plots[0].points,recordingParents.pr,'All 12 exact original PR recording observations survive');
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { BCI_BITRATE_EVIDENCE } from '../src/data/bci-bitrate.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const bci = fieldVelocityGraph('metric-panel-bci-bitrate');
const plot = BCI_BITRATE_EVIDENCE.plots[0];
const svg = () => document.querySelector('svg.draft-plot-svg');
const normalize = element => element.outerHTML.replace(/_r_[^" ]+/g, 'CHART_ID');
const standalone = (entry, search = '') => mount(React.createElement(FieldVelocityGraphDetail, { entry }), '', win => {
  win.history.replaceState({ __NA: true, tree: ['preserved'] }, '', `/field-velocity/${entry.slug}${search}`);
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});

test('URL-bound BCI sensory state preserves merged compact geometry, source and native export across a fresh document', async () => {
  const baseline = {};
  let close = await mount(React.createElement(DraftChartPlot, { plot, shareAnchor: bci.target }));
  try {
    baseline.off = normalize(svg());
    baseline.assumptions = document.querySelector('[data-sensory-assumptions]').textContent;
    await click(document.querySelector('[data-sensory-toggle]'));
    baseline.on = normalize(svg());
  } finally { await close(); }
  let search;
  close = await standalone(bci, '?tag=a&tag=b');
  try {
    assert.equal(normalize(svg()), baseline.off);
    const offSpec = (await whenChartRegistered(bci.target)).getChart();
    await click(document.querySelector('[data-sensory-toggle]'));
    assert.throws(() => buildChartImage(offSpec, window.location.href), /state changed|not ready/, 'old default registration cannot claim the URL-bound sensory view');
    assert.equal(new URL(window.location.href).searchParams.get('chartModel'), `${bci.slug}:sensory`, 'the real compact switch writes typed state');
    assert.equal(normalize(svg()), baseline.on, 'the current-main On SVG is unchanged');
    assert.equal(document.querySelector('[data-sensory-assumptions]').textContent, baseline.assumptions);
    assert.deepEqual(new URL(window.location.href).searchParams.getAll('tag'), ['a', 'b']);
    assert.equal(document.querySelector('[data-download-chart]').disabled, false, 'main sensory-only image support is retained');
    const spec = (await whenChartRegistered(bci.target)).getChart();
    const image = buildChartImage(spec, window.location.href);
    const output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    try {
      const doc = output.window.document;
      assert.match(doc.querySelector('desc').textContent, /875,000.*8,750,000/s);
      assert.match(doc.querySelector('desc').textContent, /https:\/\/pmc.ncbi.nlm.nih.gov\/articles\/PMC1564115\//);
      const line = svg().querySelector('[data-sensory-reference]');
      assert.ok([...doc.querySelectorAll('line')].some(node => node.getAttribute('y1') === line.getAttribute('y1') && node.getAttribute('stroke-dasharray') === '2 5'));
      assert.equal(new URL(image.url).searchParams.get('chartModel'), `${bci.slug}:sensory`);
      assert.ok(doc.documentElement.textContent.includes(image.url));
    } finally { output.window.close(); }
    search = window.location.search;
    await click(document.querySelector('[data-sensory-toggle]'));
    assert.equal(normalize(svg()), baseline.off);
    assert.equal(new URL(window.location.href).searchParams.has('chartModel'), false);
  } finally { await close(); }
  close = await standalone(bci, search);
  try {
    assert.equal(document.querySelector('[data-sensory-toggle]').getAttribute('aria-checked'), 'true');
    assert.equal(normalize(svg()), baseline.on);
  } finally { await close(); }
});

const legacyToggleCases = [
  ['metric-panel-public-data-size', 'brainScale', 'public-data-size', '[data-brain-scale-toggle]', '[data-brain-scale-reference]', 'brain-scale'],
  ['metric-panel-acquisition-economics', 'brainScale', 'acquisition-economics', '[data-brain-scale-toggle]', '[data-brain-scale-reference]', 'brain-scale'],
];
for (const [anchor, key, value, control, reference, token] of legacyToggleCases) test(`${anchor}: old-main enabled fragments migrate to the actual enabled standalone model`, async () => {
  const { legacyGraphDestination } = await import('../src/lib/field-velocity/graph-navigation.ts');
  const entry = fieldVelocityGraph(anchor);
  for (const alias of [anchor, entry.slug, entry.aliases[0]]) {
    const old = `https://atlas.example/field-velocity?tag=a&tag=b&${key}=${value}#${alias}`;
    const destination = legacyGraphDestination(old, '');
    const parsed = new URL(destination, old);
    assert.deepEqual(parsed.searchParams.getAll('tag'), ['a', 'b']);
    const close = await standalone(entry, parsed.search);
    try {
      assert.equal(document.querySelector(control).getAttribute('aria-checked'), 'true', old);
      assert.ok(document.querySelector(reference), 'actual sourced references are plotted');
      await click(document.querySelector(control));
      assert.equal(document.querySelector(control).getAttribute('aria-checked'), 'false');
      assert.equal(new URL(window.location.href).searchParams.has(key), false, 'Off consumes the old token');
      await click(document.querySelector(control));
      assert.equal(new URL(window.location.href).searchParams.get('chartModel'), `${entry.slug}:${token}`);
    } finally { await close(); }
  }
});

test('legacy component-only hours extrapolation stays an explicit compatibility view without replacing merged recording coverage defaults', async () => {
  const { legacyGraphDestination } = await import('../src/lib/field-velocity/graph-navigation.ts');
  const entry = fieldVelocityGraph('neural-recording-hours');
  const original = 'https://atlas.example/field-velocity?tag=a&tag=b&extrapolation=neural-recording-hours#neural-recording-hours';
  const migrated = new URL(legacyGraphDestination(original, ''), original);
  let close = await standalone(entry, migrated.search);
  try {
    const toggle = document.querySelector('.graph-detail .pc-extrapolation-control [role="switch"]');
    assert.equal(toggle?.getAttribute('aria-checked'), 'true', 'the existing main TUSZ scenario is restored, not a dead query');
    assert.ok(document.querySelector('[data-extrapolation-line]'));
    assert.equal(document.querySelectorAll('[data-legacy-hours-view] svg[role="img"]').length, 1, 'one chart, not a dashboard or duplicated default chart');
    assert.deepEqual(migrated.searchParams.getAll('tag'), ['a', 'b']);
    await click(toggle);
    assert.ok(document.querySelector('[data-recording-coverage-list]'), 'Off returns to merged #140, never the superseded default');
    assert.equal(new URL(window.location.href).searchParams.has('chartModel'), false);
  } finally { await close(); }
  close = await standalone(entry);
  try {
    assert.deepEqual([...document.querySelectorAll('[data-recording-coverage-row]')].map(row=>row.dataset.recordingCoverageRow),recordingIds);
    assert.equal(document.querySelector('[data-legacy-hours-view]'), null);
  } finally { await close(); }
});

test('standalone draft definitions retain merged static reading-column content without resurrecting the duplicate BCI summary', async () => {
  const close = await standalone(bci);
  try {
    const definition = document.querySelector('[data-draft-methodology]');
    assert.equal(definition.tagName, 'SECTION', 'merged #137 definitions stay immediately readable');
    assert.equal(document.querySelector('.draft-chart-summary'), null, 'merged #142 removed the redundant BCI summary');
  } finally { await close(); }
});

test('standalone source scope is consolidated once rather than duplicated between inline sources and data', async () => {
  const close = await standalone(bci);
  try {
    assert.equal(document.querySelectorAll('[data-draft-sources-scope], .draft-plot-data .draft-plot-scope').length, 1);
  } finally { await close(); }
});

test('legacy hours compatibility exposes only the restorable historical scenario, not unpersisted track or alternative-model controls', async () => {
  const entry = fieldVelocityGraph('neural-recording-hours');
  const close = await standalone(entry, `?chartModel=${entry.slug}:fit`);
  try {
    assert.equal(document.querySelectorAll('[data-legacy-hours-view] select').length, 0);
    assert.ok(document.querySelector('[data-extrapolation-line]'));
  } finally { await close(); }
});

test('the actual standalone recording-hours SVG export retains merged paired bars, calculated averages and its canonical footer', async () => {
  const entry = fieldVelocityGraph('neural-recording-hours');
  const close = await standalone(entry);
  let output;
  try {
    const spec = (await whenChartRegistered(entry.target)).getChart();
    assert.equal(spec.svg, svg());
    assert.deepEqual(spec.pointKey.map(point=>point.pointId),recordingIds);
    const image = buildChartImage(spec, window.location.href);
    output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    assert.deepEqual([...doc.querySelectorAll('[data-source-observation]')].map(mark=>mark.dataset.sourceObservation),recordingIds);
    assert.equal(doc.querySelectorAll('[data-export-bar-fill]').length, 25);
    assert.equal(doc.querySelectorAll('[data-export-bar-lower-bound]').length, 2);
    assert.match(doc.documentElement.textContent, /Calculated average.*340\.0 h\/participant/s);
    assert.match(doc.querySelector('desc').textContent, /P01 ≈813\.8 h, P02 ≈146\.2 h, P03 ≈60\.3 h/);
    assert.ok(doc.documentElement.textContent.includes(image.url));
    assert.equal(new URL(image.url).pathname, `/field-velocity/${entry.slug}`);
  } finally { output?.window.close(); await close(); }
});
