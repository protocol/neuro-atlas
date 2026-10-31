import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { METRIC_GROUPS, METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots);
function documentFor(plot, preview = false) {
  return new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview }))).window.document;
}

for (const [id, removed] of [
  ['public-data-size', 'Named public data products, not a cumulative archive.'],
  ['neuroai-imagenet', 'A 2023 cross-sectional comparison, not progress over time.'],
  ['recording-hours', 'Reported recording hours, not a unique global total or independently recomputed QC-valid subject-hours.'],
]) test(`${id} omits the owner-rejected disclaimer from preview and details`, () => {
  const plot = plots.find(p => p.id === id);
  assert.ok(plot, id);
  for (const preview of [true, false]) {
    const doc = documentFor(plot, preview);
    assert.ok(!doc.body.textContent.includes(removed));
    assert.ok(!JSON.stringify(plot).includes(removed), 'Exports and point inspection use the same clean prose');
  }
});

test('the first Metrics section is named Neurotech field engagement', () => {
  assert.equal(METRIC_GROUPS[0].name, 'Neurotech field engagement');
  assert.equal(METRIC_GROUPS[0].id, 6, 'Retain category navigation identity');
});

const raw = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'));
const acquisitionSource = raw['Connectomics imaging throughput over time'].plots.find(p => p.id === 'acquisition-economics');

test('acquisition preview and details use dollars per million voxels with the exact unit conversion', () => {
  const plot = plots.find(p => p.id === 'acquisition-economics');
  assert.equal(plot.yLabel, 'Approx. $/million voxels (log)');
  assert.match(plot.title, /per million voxels/);
  assert.equal(plot.scale, 'log');
  for (const source of acquisitionSource.points) {
    const shown = plot.points.find(p => p.id === source.id);
    assert.equal(shown.y, source.y * 1_000_000);
    for (const key of ['id', 'x', 'qualifier', 'sourceUrl', 'sourceTitle', 'quote', 'group', 'color']) {
      assert.equal(shown[key], source[key], `${source.id}: ${key} preserved`);
    }
  }
  for (const preview of [true, false]) {
    const doc = documentFor(plot, preview);
    assert.match(doc.querySelector('svg').textContent, /Approx\. \$\/million voxels \(log\)/);
    assert.doesNotMatch(doc.body.textContent, /\$\/voxel\b/);
    if (!preview) {
      const row = [...doc.querySelectorAll('tbody tr')].find(r => r.textContent.startsWith('ExLLSM'));
      assert.equal(row.cells[2].textContent, '≈0.001');
      const bdtem = [...doc.querySelectorAll('tbody tr')].find(r => r.textContent.startsWith('bdTEM'));
      assert.equal(bdtem.cells[2].textContent, '≈0.000154', 'Approximate costs have readable display precision');
    }
  }
});

test('published Table A1 efficiencies use thousands separators in inspection and source rows', () => {
  const plot = plots.find(p => p.id === 'acquisition-economics');
  const note = plot.points.find(p => p.id === 'exllsm2019').note;
  assert.match(note, /Table A1 row 4: ExLLSM; Approx\. Voxels\/\$ = 1,000,000,000\./);
  for (const point of plot.points) {
    assert.doesNotMatch(point.note, /(?<![\w.])\d{5,}\b/, point.id);
  }
  const doc = documentFor(plot);
  const row = [...doc.querySelectorAll('tbody tr')].find(r => r.textContent.startsWith('ExLLSM'));
  assert.match(row.cells[3].textContent, /Approx\. Voxels\/\$ = 1,000,000,000\./);
});

test('the edited chart descriptions state their scope directly', () => {
  const edited = ['public-data-size', 'neuroai-imagenet', 'recording-hours', 'acquisition-economics'].map(id => plots.find(p => p.id === id));
  for (const plot of edited) {
    assert.doesNotMatch(plot.scope, /,\s*not\b|;\s*not\b|this is not/i, plot.id);
  }
  for (const point of edited.find(p => p.id === 'neuroai-imagenet').points) {
    assert.doesNotMatch(point.note, /,\s*not\b|;\s*not\b|\bNOT measured/i);
    assert.match(point.note, /operation-count|operation counts/);
  }
});
