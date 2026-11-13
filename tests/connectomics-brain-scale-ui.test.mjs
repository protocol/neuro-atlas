import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';
import { brainScaleClock } from './brain-scale-helpers.mjs';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { brainBenchmarkContext } from '../src/lib/connectomics-brain-benchmarks.ts';

globalThis.React = React;
const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(item => item.plots);
const supported = ['public-data-size', 'acquisition-economics'];
// Independently captured from untouched 5015d2c before implementation. No source/geometry normalization.
const baseline = {
  'public-data-size': { preview: '5f685a0387cb23d85d4a83b6e807bc7afc416b70b84d927fdf50894858211482', svg: '4a2d0d3bd865a7c03983bed2045b8c5a40ac4e2e7f5a292671c5b2f66fada6a2' },
  'acquisition-economics': { preview: 'c712b8d74dc7915335b70baa6857e72a2282640d4fe8e44ddb06c3424b046cdb', svg: '87e640dc92681901ce50c98bf7d879ef844666a2de5c36152063fabb3870f153' },
};
const normalize = html => html.replace(/_R_[^"]*/g, 'ID').replace(/ data-brain-scale-(?:progress|state|log-min|log-max)="[^"]*"/g, '');
const hash = node => createHash('sha256').update(normalize(node.outerHTML)).digest('hex');

test('only the two supported full plots offer a default-off accessible switch; previews and off SVGs match the independent baseline', () => {
  for (const plot of plots) for (const preview of [true, false]) {
    const doc = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview }))).window.document;
    const toggle = doc.querySelector('[data-brain-scale-toggle]');
    const eligible = !preview && supported.includes(plot.id);
    assert.equal(!!toggle, eligible, `${plot.id}, preview=${preview}`);
    if (eligible) {
      assert.equal(toggle.getAttribute('role'), 'switch');
      assert.equal(toggle.getAttribute('aria-checked'), 'false');
      assert.equal(doc.querySelector('figure').dataset.brainScaleState, 'off');
      assert.ok(toggle.textContent.length < 25);
    }
    assert.equal(doc.querySelector('[data-brain-scale-reference]'), null);
    if (supported.includes(plot.id)) assert.equal(hash(doc.querySelector(preview ? 'figure' : 'svg')), baseline[plot.id][preview ? 'preview' : 'svg']);
    doc.defaultView.close();
  }
});

for (const plotId of supported) test(`${plotId}: a 700ms log-domain expansion moves the original marks and ticks, revealing direct targets late`, async () => {
  const clock = brainScaleClock();
  const plot = plots.find(p => p.id === plotId);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }), '', clock.configure);
  try {
    const figure = document.querySelector('figure'), svg = figure.querySelector('svg');
    const toggle = figure.querySelector('[data-brain-scale-toggle]');
    const original = svg.outerHTML, frame = svg.getAttribute('viewBox');
    const overlapRows = figure.querySelectorAll('.draft-plot-overlap-note').length;
    const points = [...svg.querySelectorAll('[data-source-observation]')];
    const coordinates = () => points.map(p => p.localName === 'rect'
      ? Number(p.getAttribute('y')) + Number(p.getAttribute('height')) / 2
      : p.localName === 'polygon' ? p.getAttribute('points').split(' ').map(pair => Number(pair.split(',')[1])).reduce((sum, y) => sum + y, 0) / 3
      : Number(p.getAttribute('cy')));
    const before = coordinates();
    const [startMin, startMax, endMin, endMax] = plotId === 'public-data-size' ? [-3, 1, -3, 7] : [-4, -1, -10, -1];
    await click(toggle);
    assert.equal(figure.dataset.brainScaleState, 'animating');
    assert.equal(toggle.getAttribute('aria-checked'), 'true');
    assert.deepEqual(coordinates(), before, 'click frame keeps its displayed positions');
    await clock.advance(175);
    assert.equal(svg.dataset.brainScaleProgress, '0.0625', 'cubic ease-in');
    assert.ok([...svg.querySelectorAll('[data-brain-scale-reference]')].every(line => Number(line.parentElement.getAttribute('opacity')) === 0));
    await clock.advance(175);
    assert.equal(Number(svg.dataset.brainScaleLogMin), (startMin + endMin) / 2);
    assert.equal(Number(svg.dataset.brainScaleLogMax), (startMax + endMax) / 2);
    const top = 44, bottom = 276;
    for (const [index, point] of plot.points.entries()) {
      const expected = bottom - (Math.log10(point.y) - (startMin + endMin) / 2) / (((startMax + endMax) - (startMin + endMin)) / 2) * (bottom - top);
      assert.ok(Math.abs(coordinates()[index] - expected) < 1e-9, 'mark follows the interpolated log domain');
    }
    assert.equal(svg.getAttribute('viewBox'), frame, 'no vertical/width jump');
    await clock.advance(350);
    assert.equal(figure.dataset.brainScaleState, 'on');
    assert.equal(figure.querySelectorAll('.draft-plot-overlap-note').length, overlapRows, 'overlap explanations must not grow the figure while rescaling');
    assert.deepEqual([...svg.querySelectorAll('[data-source-observation]')], points, 'preserve inspection/focus nodes');
    const references = [...svg.querySelectorAll('[data-brain-scale-reference]')];
    assert.equal(references.length, plotId === 'public-data-size' ? 3 : 5);
    for (const line of references) {
      assert.equal(line.getAttribute('stroke-dasharray'), '2 5');
      assert.equal(line.parentElement.getAttribute('opacity'), '1');
      const label = line.parentElement.querySelector('text');
      assert.ok(label.textContent.length < 25);
      assert.ok(Number(line.getAttribute('y1')) >= top + 12 && Number(line.getAttribute('y1')) <= bottom - 12);
    }
    assert.ok(svg.querySelector('[data-brain-scale-scope]'));
    await click(toggle); await clock.advance(700);
    assert.equal(figure.dataset.brainScaleState, 'off');
    assert.equal(svg.outerHTML, original, 'exact SVG restoration, including new metadata');
  } finally { await cleanup(); }
});

for (const plotId of supported) test(`${plotId}: interrupted reversals resume the displayed domain and restore exact off markup`, async () => {
  const clock = brainScaleClock();
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: plots.find(p => p.id === plotId) }), '', clock.configure);
  try {
    const svg = document.querySelector('figure > svg'), toggle = document.querySelector('[data-brain-scale-toggle]');
    const original = svg.outerHTML;
    await click(toggle); await clock.advance(525);
    const forward = svg.outerHTML;
    await click(toggle);
    assert.equal(svg.outerHTML, forward, 'reverse click does not snap marks, labels or bounds');
    await clock.advance(175);
    const backward = svg.outerHTML;
    assert.ok(Number(svg.dataset.brainScaleProgress) < .9375);
    await click(toggle);
    assert.equal(svg.outerHTML, backward);
    await clock.advance(700);
    assert.equal(svg.dataset.brainScaleProgress, '1');
    await click(toggle); await clock.advance(700);
    assert.equal(svg.outerHTML, original);
    assert.equal(clock.pending, 0);
  } finally { await cleanup(); }
});

test('reduced motion settles immediately, live preference changes finish the destination, and StrictMode/unmount clean up RAF/listeners', async () => {
  const clock = brainScaleClock(true);
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(DraftChartPlot, { plot: plots.find(p => p.id === supported[0]) })), '', clock.configure);
  try {
    const svg = document.querySelector('figure > svg'), toggle = document.querySelector('[data-brain-scale-toggle]');
    const original = svg.outerHTML;
    await click(toggle);
    assert.equal(svg.dataset.brainScaleProgress, '1', 'reduced motion uses endpoint geometry only');
    assert.equal(clock.pending, 0);
    await click(toggle); assert.equal(svg.outerHTML, original);
    await clock.reduce(false); await click(toggle); await clock.advance(175);
    assert.ok(Number(svg.dataset.brainScaleProgress) > 0 && Number(svg.dataset.brainScaleProgress) < 1);
    await clock.reduce(true);
    assert.equal(svg.dataset.brainScaleProgress, '1');
    await clock.reduce(false); await click(toggle); await clock.advance(175);
    await clock.reduce(true); assert.equal(svg.outerHTML, original);
    await clock.reduce(false); await click(toggle); await clock.advance(175);
    assert.equal(clock.pending, 1);
    assert.equal(clock.subscriptions, 1);
  } finally { await cleanup(); }
  assert.equal(clock.pending, 0);
  assert.equal(clock.subscriptions, 0);
  await clock.advance(1000);
});

for (const plotId of supported) test(`${plotId}: source disclosure stays below the plot and export is disabled until the selected view settles`, async () => {
  const clock = brainScaleClock();
  const anchor = `metric-panel-${plotId}`;
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: plots.find(p => p.id === plotId), shareAnchor: anchor }), '', clock.configure);
  try {
    const svg = document.querySelector('figure > svg'), toggle = document.querySelector('[data-brain-scale-toggle]');
    const disclosure = document.querySelector('[data-brain-scale-assumptions]');
    assert.ok(disclosure, 'model assumptions and sources are available below the graph');
    assert.equal(disclosure.open, false);
    assert.ok(svg.compareDocumentPosition(disclosure) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    const context = brainBenchmarkContext(plotId);
    assert.ok(disclosure.textContent.includes(context.disclosure));
    assert.deepEqual([...disclosure.querySelectorAll('a')].map(a => a.href), context.sources.map(source => source.url));
    const off = (await whenChartRegistered(anchor, 0)).getChart();
    const original = buildChartImage(off, window.location.href);
    await click(toggle);
    assert.ok([...document.querySelectorAll('[data-copy-chart], [data-download-chart]')].every(button => button.disabled));
    assert.equal(await whenChartRegistered(anchor, 0), undefined, 'API cannot snapshot transient geometry');
    await clock.advance(700);
    assert.ok([...document.querySelectorAll('[data-copy-chart], [data-download-chart]')].every(button => !button.disabled));
    const selected = (await whenChartRegistered(anchor, 0)).getChart();
    const image = buildChartImage(selected, window.location.href);
    const exported = new JSDOM(image.svg, {contentType:'image/svg+xml'}).window.document;
    for (const ref of context.references) assert.ok([...exported.querySelectorAll('text')].some(label => label.textContent === ref.label), ref.label);
    assert.ok([...exported.querySelectorAll('text')].some(label => label.textContent === context.scopeLabel));
    assert.ok(selected.notes.includes(context.disclosure));
    assert.equal(image.url, original.url, 'stable share identity is unchanged');
    await click(toggle); await clock.advance(350);
    assert.equal(await whenChartRegistered(anchor, 0), undefined);
    await clock.advance(350);
    const restored = buildChartImage((await whenChartRegistered(anchor, 0)).getChart(), window.location.href);
    assert.equal(restored.svg, original.svg, 'default-off image restored byte for byte');
  } finally { await cleanup(); }
});

for (const width of [238, 308]) for (const plotId of supported) test(`${plotId}: conservative 12px label envelopes fit at ${width}px internal width without resizing the chart`, async () => {
  const clock = brainScaleClock(true, width);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: plots.find(p => p.id === plotId) }), '', clock.configure);
  try {
    const svg = document.querySelector('figure > svg');
    const original = svg.outerHTML, frame = svg.getAttribute('viewBox');
    await click(document.querySelector('[data-brain-scale-toggle]'));
    assert.equal(svg.getAttribute('viewBox'), frame);
    const labels = [...svg.querySelectorAll('[data-brain-scale-reference]')].map(line => {
      const text = line.parentElement.querySelector('text');
      const x = Number(text.getAttribute('x')), y = Number(text.getAttribute('y'));
      const font = Number(text.getAttribute('data-export-font-size'));
      assert.equal(font, 12);
      assert.ok(x - text.textContent.length * font * .62 >= Number(line.getAttribute('x1')) + 2, `keep ${text.textContent} clear of the y-axis`);
      assert.ok(x <= width);
      return { x, y };
    });
    for (let index = 1; index < labels.length; index++) assert.ok(Math.abs(labels[index].y - labels[index - 1].y) >= 18, 'direct labels have distinct text lanes');
    const scope = svg.querySelector('[data-brain-scale-scope]');
    assert.ok(scope.textContent.length * 12 * .62 <= width, 'short scope fits inside the stable frame');
    await click(document.querySelector('[data-brain-scale-toggle]'));
    assert.equal(svg.outerHTML, original);
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});

test('benchmark controls use a fixed touch target and a paint-only checked state below the chart', async () => {
  const clock = brainScaleClock(true);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: plots.find(p => p.id === supported[0]) }), '', clock.configure);
  try {
    const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    const style = document.createElement('style');
    style.textContent = css.slice(css.indexOf('/* Whole-brain benchmark controls'));
    document.head.append(style);
    const toggle = document.querySelector('[data-brain-scale-toggle]');
    const offHeight = getComputedStyle(toggle).minHeight;
    assert.equal(offHeight, '44px');
    const thumb = toggle.querySelector('span');
    const offWidth = getComputedStyle(thumb).width;
    await click(toggle);
    assert.equal(getComputedStyle(toggle).minHeight, offHeight);
    assert.equal(getComputedStyle(thumb).width, offWidth);
  } finally { await cleanup(); }
});
