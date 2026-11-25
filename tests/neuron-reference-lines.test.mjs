import test from 'node:test';
import assert from 'node:assert/strict';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';

const plotId = 'largest-connectome-neurons';
const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots);
const plot = plots.find(p => p.id === plotId);
const expected = [
  ['mouse', 70_890_000, 'Mouse ≈70.9M', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1567708/'],
  ['macaque', 6_376_160_000, 'Macaque ≈6.38B', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1805542/'],
  ['human', 86_100_000_000, 'Human ≈86.1B', 'https://doi.org/10.1002/cne.21974'],
];

test('only the selected neuron chart receives three exact anatomical references, separately from its ten archived observations', () => {
  assert.equal(plot.horizontalReferences?.length, 3, 'Three anatomical reference lines are attached to the selected neuron chart');
  assert.deepEqual(plot.horizontalReferences.map(r => [r.id, r.value, r.label, r.sourceUrl]), expected);
  const archive = Object.values(DRAFT_CHART_EVIDENCE).flatMap(e => e.plots).find(p => p.id === plotId);
  assert.equal(plot.points.length, 10);
  assert.deepEqual(plot.points, archive.points);
  assert.equal(archive.horizontalReferences, undefined);
  assert.deepEqual(plots.filter(p => p.horizontalReferences).map(p => p.id), [plotId]);
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { CHART_PRESENTATION } from '../src/lib/chart-presentation.ts';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
const anchor = 'metric-panel-largest-connectome-neurons';

function checkReferences(svg) {
  const lines = [...svg.querySelectorAll('[data-anatomical-reference]')];
  assert.equal(lines.length, 3, 'All three anatomical horizontals are drawn');
  const bottom = Number(svg.querySelector('.draft-plot-axis').getAttribute('y1'));
  const top = Math.min(...[...svg.querySelectorAll('.draft-plot-gridline')].map(line => Number(line.getAttribute('y1'))));
  const minPower = 2, maxPower = 12;
  const mapY = value => bottom - (Math.log10(value) - minPower) / (maxPower - minPower) * (bottom - top);
  const boxes = [];
  for (const [index, line] of lines.entries()) {
    const [id, value, label] = expected[index];
    assert.equal(line.dataset.anatomicalReference, id);
    assert.equal(Number(line.dataset.value), value);
    assert.equal(line.getAttribute('y1'), line.getAttribute('y2'));
    assert.ok(Number(line.getAttribute('x2')) > Number(line.getAttribute('x1')));
    assert.ok(Math.abs(Number(line.getAttribute('y1')) - mapY(value)) < 1e-9, `${id}: exact common log mapping`);
    assert.equal(line.getAttribute('stroke-dasharray'), '2 5');
    assert.equal(Number(line.getAttribute('stroke-opacity')), .45);
    const text = svg.querySelector(`[data-anatomical-reference-label="${id}"]`);
    assert.equal(text.textContent, label);
    assert.equal(Number(text.getAttribute('font-size')), CHART_PRESENTATION.labelFontSize);
    assert.equal(Number(text.getAttribute('data-export-font-size')), CHART_PRESENTATION.labelFontSize);
    const x = Number(text.getAttribute('x')), y = Number(text.getAttribute('y'));
    const box = { left: x - label.length * CHART_PRESENTATION.labelFontSize * .62, right: x, top: y - CHART_PRESENTATION.labelFontSize, bottom: y };
    assert.ok(box.left >= 0 && box.right <= Number(svg.getAttribute('viewBox').split(' ')[2]), `${id}: estimated text bounds fit`);
    assert.ok(box.top >= top && box.bottom <= bottom, `${id}: label inside plot bounds`);
    for (const tick of svg.querySelectorAll('.draft-plot-tick[text-anchor="end"]')) {
      const tickY = Number(tick.getAttribute('y'));
      const tickRight = Number(tick.getAttribute('x'));
      assert.ok(box.left >= tickRight + 2 || box.bottom + 2 <= tickY - CHART_PRESENTATION.labelFontSize || box.top >= tickY + 2, `${id}: clear of y-axis tick labels`);
    }
    boxes.push(box);
  }
  for (const point of plot.points) {
    const mark = svg.querySelector(`[data-source-observation="${point.id}"]`);
    assert.ok(Math.abs(Number(mark.getAttribute('cy')) - mapY(point.y)) < 1e-9, `${point.id}: same reference/observation log axis`);
  }
  for (const box of boxes) for (const key of svg.querySelectorAll('[data-annotation-key] rect')) {
    const x = Number(key.getAttribute('x')), y = Number(key.getAttribute('y'));
    assert.ok(x + 20 < box.left || x > box.right || y + 20 < box.top || y > box.bottom, `Observation badges avoid anatomical labels: ${JSON.stringify({ width: svg.getAttribute('viewBox'), box, key: { x, y } })}`);
  }
  for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].bottom + 4 <= boxes[i - 1].top, 'Direct labels remain separated');
  assert.equal(svg.querySelectorAll('[data-source-observation]').length, 10);
}

test('preview and full modal draw static anatomical lines using the observation log axis at desktop and narrow widths', async () => {
  const previous = globalThis.ResizeObserver;
  try {
    for (const width of [560, 320, 240, 147]) {
      globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe(target) { this.cb([{ target, contentRect: { width } }]); } disconnect() {} };
      const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), '#selected-published-connectomes-neuron-counts');
      try {
        const svgs = document.querySelectorAll('svg.draft-plot-svg');
        assert.equal(svgs.length, 2, 'Real preview and deep-linked modal mount');
        for (const svg of svgs) checkReferences(svg);
        assert.equal(document.querySelector('[data-brain-scale-toggle]'), null);
        assert.equal(document.querySelectorAll('dialog [data-neuron-reference-toggle][role="switch"][aria-checked="true"]').length, 3);
        assert.equal(document.querySelectorAll('[data-draft-preview] [role="switch"]').length, 0);
        assert.equal(window.location.hash, '#selected-published-connectomes-neuron-counts');
      } finally { await cleanup(); }
    }
  } finally { globalThis.ResizeObserver = previous; }
});

import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { readFileSync } from 'node:fs';

test('native Sources and selected-data disclosure retain anatomical population, uncertainty and exact values without inflating observations', async () => {
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), '#selected-published-connectomes-neuron-counts');
  try {
    const dialog = document.querySelector('dialog[open]');
    const sources = dialog.querySelector('[data-anatomical-sources]');
    assert.ok(sources, 'Anatomical context belongs in the native Sources column');
    assert.ok(sources.closest('.mx-sources'), 'Native modal source slot');
    assert.equal(dialog.querySelectorAll('tbody tr').length, 10);
    assert.match(dialog.querySelector('.draft-plot-data summary').textContent, /Data and sources \(10\)/);
    assert.deepEqual([...sources.querySelectorAll('a')].map(a => a.href), expected.map(r => r[3]));
    for (const [index, ref] of plot.horizontalReferences.entries()) {
      const item = sources.querySelectorAll('li')[index];
      assert.ok(item.textContent.includes(ref.value.toLocaleString('en-US')));
      assert.ok(item.textContent.includes(ref.sourceTitle));
    }
    assert.match(sources.textContent, /70\.89 ± 10\.41 million.*mean ± SD.*both hemispheres.*olfactory bulb/s);
    assert.match(sources.textContent, /Macaca mulatta.*6,376\.16 million.*olfactory bulbs excluded.*One hemisphere.*doubled/s);
    assert.match(sources.textContent, /Adult male.*86\.1 ± 8\.1 billion NeuN-positive.*isotropic fractionation.*publisher abstract/s);
    const selected = dialog.querySelector('[data-selected-plot-json]');
    const data = JSON.parse(decodeURIComponent(selected.href.split(',').slice(1).join(',')));
    assert.deepEqual(data.horizontalReferences, plot.horizontalReferences);
    assert.deepEqual(data.points, plot.points);
  } finally { await cleanup(); }
});

test('existing full-chart PNG serialization includes all reference lines, readable labels and primary-source scope', async () => {
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), '#selected-published-connectomes-neuron-counts');
  try {
    const spec = (await whenChartRegistered(anchor, 0)).getChart();
    const image = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' });
    try {
      const doc = image.window.document;
      assert.ok([...doc.querySelectorAll('text')].some(n => n.textContent === 'Anatomical scale'), 'Visible export context key');
      for (const [id, value, label, url] of expected) {
        const live = spec.svg.querySelector(`[data-anatomical-reference="${id}"]`);
        assert.ok([...doc.querySelectorAll('line')].some(line => line.getAttribute('y1') === live.getAttribute('y1') && line.getAttribute('y2') === live.getAttribute('y2') && line.getAttribute('stroke-dasharray') === '2 5'));
        assert.ok([...doc.querySelectorAll('text')].some(node => node.textContent === label));
        assert.ok(doc.querySelector('desc').textContent.includes(url));
        assert.ok(doc.querySelector('desc').textContent.includes(value.toLocaleString('en-US')));
      }
      assert.equal(doc.querySelectorAll('[data-source-observation]').length, 10);
      assert.ok(doc.querySelector('desc').textContent.includes('Macaca mulatta'));
      assert.ok(doc.querySelector('desc').textContent.includes('NeuN-positive'));
    } finally { image.window.close(); }
  } finally { await cleanup(); }
});

import { scanSources } from './helpers/methodology-source-inventory.mjs';

test('both newly introduced primary-source URLs are inventoried and classified as studies in the methodology catalog', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/methodology-sources.json', import.meta.url), 'utf8'));
  const { paths, included } = scanSources();
  assert.ok(paths.includes('src/data/whole-brain-neuron-references.ts'));
  for (const [, , , url] of expected.slice(0, 2)) {
    assert.ok(catalog.studies.some(([href]) => href === url), url);
    assert.ok(included.get(url).some(item => item.path === 'src/data/whole-brain-neuron-references.ts'), url);
  }
});

import { createHash } from 'node:crypto';
import { beforeNeuronReferences } from './helpers/neuron-reference-baseline.mjs';
import { restoreReviewedFile } from '../scripts/qa/build-reviewed-delta.mjs';
const financeCatalogDelta = JSON.parse(readFileSync(new URL('./fixtures/neuron-financing-catalog-delta.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(readFileSync(new URL('./fixtures/neuron-reference-baseline.json', import.meta.url), 'utf8'));
const hash = s => createHash('sha256').update(s).digest('hex');
const normalize = s => s.replace(/_r_[^" ]+/g, 'CHART_ID').replace(/_R_[^" ]+/g, 'CHART_ID');

test('every source/presentation value except the exact new context field matches the independent current-main baseline', () => {
  assert.equal(baseline.base, 'df97d0d70736465657ac50bc9569bbc1b60e6095');
  assert.equal(Object.keys(baseline.plots).length, 15);
  assert.equal(hash(JSON.stringify(beforeNeuronReferences(METRIC_CHART_EVIDENCE))), baseline.evidence);
  for (const item of plots) assert.equal(hash(JSON.stringify(item.points)), baseline.plots[item.id].points, `${item.id}: exact observations`);
});

test('all unrelated preview/modal markup and registered image exports preserve exact current-main baseline output', async () => {
  for (const item of plots.filter(p => p.id !== plotId)) {
    const frozen = baseline.plots[item.id];
    assert.equal(hash(JSON.stringify(item)), frozen.data, item.id);
    for (const preview of [true, false]) {
      assert.equal(hash(normalize(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: item, preview })))), frozen.markup[preview ? 'preview' : 'modal'], `${item.id}: markup`);
    }
    const cleanup = await mount(React.createElement(DraftChartPlot, { plot: item, shareAnchor: anchor }));
    try {
      const { svg, ...spec } = (await whenChartRegistered(anchor, 0)).getChart();
      assert.equal(hash(JSON.stringify(spec)), frozen.exportSpec, `${item.id}: exact native export payload`);
      assert.equal(hash(normalize(buildChartImage({ svg, ...spec }, window.location.href).svg)), frozen.exportSvg, `${item.id}: exact native export SVG`);
    } finally { await cleanup(); }
  }
});

test('neuron observation source table remains byte-identical to current main', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot, shareAnchor: anchor }));
  try { assert.equal(hash(document.querySelector('tbody').outerHTML), baseline.plots[plotId].observationRows); }
  finally { await cleanup(); }
});

test('neuron-only compact caption and 152px preview fit marks and date axes inside the existing 300px card cap', async () => {
  const previous = globalThis.ResizeObserver;
  try {
    for (const width of [271, 223, 153]) {
      globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe(target) { this.cb([{ target, contentRect: { width } }]); } disconnect() {} };
      const cleanup = await mount(React.createElement(DraftChartPlot, { plot, preview: true }));
      try {
        const svg = document.querySelector('svg.draft-plot-svg');
        assert.equal(document.querySelector('figcaption').textContent, 'Neuron counts', 'Scoped one-line caption leaves room for the scientific marks at 153px internal width');
        assert.equal(Number(svg.getAttribute('viewBox').split(' ')[3]), 152, 'Compact axes use the spare lower margin, without a taller card');
        assert.ok([...svg.querySelectorAll('.draft-plot-axis-title')].every(text => Number(text.getAttribute('y')) <= 144), 'Date-axis caption is inside the compact body budget');
        checkReferences(svg);
        const highestMark = Math.min(...[...svg.querySelectorAll('[data-source-observation]')].map(mark => Number(mark.getAttribute('cy')) - Number(mark.getAttribute('r'))));
        for (const label of svg.querySelectorAll('[data-anatomical-reference-label]')) assert.ok(Number(label.getAttribute('y')) + 1 < highestMark, `Stacked anatomical labels stay above the measured observations: ${JSON.stringify({ width, highestMark, labelY: label.getAttribute('y') })}`);
      } finally { await cleanup(); }
    }
  } finally { globalThis.ResizeObserver = previous; }
});

test('historical byte reconstruction reverses only the three exact neuron feature file deltas and rejects unreviewed changes', async () => {
  const helpers = await import('./helpers/neuron-reference-baseline.mjs');
  assert.equal(typeof helpers.restoreBeforeNeuronLinesFile, 'function', 'Exact bounded file reconstruction is available to historical suites');
  const delta = JSON.parse(readFileSync(new URL('./fixtures/neuron-reference-file-delta.json', import.meta.url), 'utf8'));
  assert.equal(delta.baselineSha, baseline.base);
  assert.deepEqual(delta.files.map(file => file.path), ['src/components/draft-chart-plot.tsx', 'src/data/metric-chart-visibility.ts', 'src/data/methodology-sources.json']);
  for (const file of delta.files) {
    const current = readFileSync(new URL('../' + file.path, import.meta.url), 'utf8');
    const withoutToggles = helpers.restoreBeforeNeuronTogglesFile(current, file.path);
    // Concurrent financing adds its own exact catalog delta; do not erase it or refresh this original fixture.
    const reviewedCurrent = restoreReviewedFile(withoutToggles, financeCatalogDelta, file.path);
    const restored = helpers.restoreBeforeNeuronLinesFile(current, file.path);
    assert.equal(hash(reviewedCurrent), file.afterSha256, file.path + ': exact feature code/catalog bytes');
    const restoredBase = restoreReviewedFile(restored, financeCatalogDelta, file.path);
    assert.equal(hash(restoredBase), file.beforeSha256, file.path + ': original base bytes');
    if (file.encoding === 'lines') {
      const mutated = '// unreviewed extra line\n' + current;
      let restored;
      try { restored = helpers.restoreBeforeNeuronLinesFile(mutated, file.path); } catch { continue; }
      assert.notEqual(hash(restored), file.beforeSha256, 'Unlisted edits are never hidden');
    } else {
      const mutated = JSON.parse(current);
      mutated.studies.at(-1)[1] += ' UNREVIEWED';
      const restored = helpers.restoreBeforeNeuronLinesFile(JSON.stringify(mutated), file.path);
      assert.notEqual(hash(restored), file.beforeSha256, 'Unlisted source-catalog edits survive reconstruction');
      const alteredReference = JSON.parse(current);
      alteredReference.studies[0][1] += ' UNREVIEWED';
      assert.throws(() => helpers.restoreBeforeNeuronLinesFile(JSON.stringify(alteredReference), file.path), undefined, 'New source labels must match the exact approved additions');
    }
  }
  assert.equal(helpers.restoreBeforeNeuronLinesFile('unrelated', 'src/data/draft-chart-evidence.json'), 'unrelated');
  const changed = structuredClone(METRIC_CHART_EVIDENCE);
  Object.values(changed).flatMap(e => e.plots).find(p => p.id === plotId).horizontalReferences[0].value++;
  assert.throws(() => beforeNeuronReferences(changed), /exact reviewed anatomical context/);
});
