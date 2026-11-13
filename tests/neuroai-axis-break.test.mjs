import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { mount } from './modal-helpers.mjs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { neuroaiEnergyAxis } from '../src/lib/neuroai-energy-axis.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';

globalThis.React = React;
const evidence = JSON.parse(readFileSync(new URL('../src/data/draft-chart-evidence.json', import.meta.url), 'utf8'));
const plot = evidence['NeuroAI performance–cost frontier over time'].plots[0];
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} ≠ ${expected}`);

function verifyBrokenGeometry(document) {
  const svg = document.querySelector('.draft-plot-svg');
  const segments = [...svg.querySelectorAll('[data-x-axis-segment]')];
  assert.equal(segments.length, 2, 'Use two visibly separate linear axis segments');
  const [lower, upper] = segments.map(line => ({ start: Number(line.getAttribute('x1')), end: Number(line.getAttribute('x2')) }));
  assert.ok(lower.end < upper.start, 'Leave a real discontinuity');
  assert.ok(lower.end - lower.start > 2 * (upper.end - upper.start), 'Give the five-point cluster most of the plot width');
  const marks = [...svg.querySelectorAll('[data-source-observation]')];
  assert.equal(marks.length, plot.points.length, 'Do not remove any observation');
  for (const point of plot.points) {
    const mark = marks.find(mark => mark.getAttribute('data-source-observation') === point.id);
    const expectedX = point.x <= 6
      ? lower.start + point.x / 6 * (lower.end - lower.start)
      : upper.start + (point.x - 40) / 2 * (upper.end - upper.start);
    near(Number(mark.getAttribute('cx')), expectedX, `${point.id} keeps its exact x within a linear segment`);
  }
  const bottom = Number(segments[0].getAttribute('y1'));
  const ticks = [...svg.querySelectorAll('.draft-plot-tick')].filter(tick => Number(tick.getAttribute('y')) === bottom + 22);
  assert.ok(ticks.length >= 2);
  assert.ok(ticks.every(tick => /^\d+$/.test(tick.textContent)), 'Energy ticks use rounded integers, never two decimals');
  const breakMark = svg.querySelector('[data-x-axis-break]');
  assert.equal(breakMark?.querySelectorAll('line').length, 2, 'Show an explicit // discontinuity');
  const note = svg.querySelector('[data-x-axis-break-note]');
  assert.match(note?.textContent ?? '', /6–40 mJ\/image omitted \(no observations\)/);
  assert.match(note.textContent, /[Ss]ame linear scale/);
  near((lower.end-lower.start)/6,(upper.end-upper.start)/2,'One pixel-per-unit scale on both sides of the break');
  assert.ok(svg.getAttribute('aria-describedby')?.split(' ').includes(note.id), 'Expose the same visible explanation accessibly');
  return { svg, segments, lower, upper, ticks, note };
}

test('the actual ImageNet observations use an honest piecewise linear energy axis', () => {
  const before = JSON.stringify(plot);
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    verifyBrokenGeometry(dom.window.document);
    assert.equal(JSON.stringify(plot), before, 'Rendering never changes the source observations');
  } finally { dom.window.close(); }
});

test('120–800px preview and full plots retain readable ticks, complete glyphs and no lines across the gap', async () => {
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  try {
    for (const preview of [true, false]) {
      const cleanup = await mount(React.createElement(DraftChartPlot, { plot, preview }));
      try {
        for (const width of [120, 180, 230, 320, 560, 800]) {
          await act(async () => resize([{ contentRect: { width } }]));
          const { svg, segments, lower, upper, ticks, note } = verifyBrokenGeometry(document);
          const height = Number(svg.getAttribute('viewBox').split(' ')[3]);
          assert.equal(Number(svg.getAttribute('viewBox').split(' ')[2]), width);
          const top = 28 + svg.querySelector('.draft-plot-axis-title').querySelectorAll('tspan').length * 16;
          const bottom = Number(segments[0].getAttribute('y1'));
          const previewExtra = Number(svg.getAttribute('data-metric-preview-extra') ?? 0);
          assert.equal(bottom - top, (preview ? 130 : 232) + previewExtra, 'Only the preview plotting height is deliberately shorter');
          const orderedTicks = ticks.map(tick => ({ center: Number(tick.getAttribute('x')), halfWidth: tick.textContent.length * 3.5 })).sort((a, b) => a.center - b.center);
          for (const [index, tick] of orderedTicks.entries()) {
            assert.ok(tick.center - tick.halfWidth >= 0 && tick.center + tick.halfWidth <= width, `Tick stays inside ${width}px frame`);
            if (index) assert.ok(tick.center - tick.halfWidth - orderedTicks[index - 1].center - orderedTicks[index - 1].halfWidth >= 8, `Ticks do not overlap at ${width}px`);
          }
          for (const mark of svg.querySelectorAll('[data-source-observation]')) {
            const cx = Number(mark.getAttribute('cx')), cy = Number(mark.getAttribute('cy')), r = Number(mark.getAttribute('r'));
            assert.ok(cx - r >= 0 && cx + r <= width && cy - r >= 0 && cy + r <= height, `Complete glyph at ${width}px`);
            const point = plot.points.find(point => point.id === mark.getAttribute('data-source-observation'));
            // Compare normalized coordinates in the original 232-unit frame,
            // retaining the existing 1e-8 bound rather than loosening it to a fraction.
            near((bottom - cy) / (bottom - top) * 232, point.y / 80.8 * 232, `${point.id}: unchanged normalized 0–80.8% linear y-axis at ${width}px`);
          }
          for (const line of svg.querySelectorAll('line:not([data-x-axis-break] line)')) {
            const ends = [Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))].sort((a, b) => a - b);
            assert.ok(ends[1] <= lower.end || ends[0] >= upper.start, `${line.getAttribute('class')}: no line crosses the omitted interval at ${width}px`);
          }
          const noteLines = [...note.querySelectorAll('tspan')];
          assert.ok(noteLines.every(line => line.textContent.trim().length * 7 <= width), `Break explanation fits ${width}px without shrinking type`);
          assert.ok(Number(note.getAttribute('y')) + (noteLines.length - 1) * 16 + 4 < height, 'Keep the entire note in the SVG/PNG frame');
          for (const line of svg.querySelectorAll('[data-x-axis-break] line')) {
            for (const key of ['x1', 'x2']) assert.ok(Number(line.getAttribute(key)) > lower.end && Number(line.getAttribute(key)) < upper.start, 'Both break slashes stay in the gap');
          }
        }
      } finally { await cleanup(); }
    }
  } finally { delete globalThis.ResizeObserver; }
});

test('all six exact source coordinates survive in the table and focused tooltip; estimated energy semantics stay intact', async () => {
  assert.deepEqual(plot.points.map(({ id, x, y }) => [id, x, y]), [
    ['sdt-0', 3.9, 72.28], ['sdt-1', 3.56, 74.11], ['sdt-2', 1.13, 71.68],
    ['sdt-3', 4.5, 74.57], ['sdt-4', 5.53, 74.66], ['sdt-5', 41.77, 80.8],
  ]);
  const before = JSON.stringify(plot);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    assert.match(document.querySelector('thead').textContent, /Estimated inference energy \(mJ\/image\)/);
    const rows = [...document.querySelectorAll('tbody tr')];
    for (const [index, point] of plot.points.entries()) {
      const cells = rows[index].querySelectorAll('td');
      assert.equal(Number(cells[0].firstChild.textContent.replaceAll(',', '')), point.x);
      assert.equal(Number(cells[1].textContent.replaceAll(',', '')), point.y);
      assert.ok(rows[index].textContent.includes(point.quote));
      assert.equal(rows[index].querySelector('a').href, point.sourceUrl);
      assert.match(rows[index].textContent, /inference energy is estimated from operation counts/);
      await act(async () => document.querySelector(`[data-source-observation="${point.id}"]`).focus());
      const tooltip = document.querySelector('[role="tooltip"]');
      const numericX = [...tooltip.querySelectorAll('p')].find(p => p.textContent.includes(plot.xLabel)).textContent.split(`${plot.xLabel}: `)[1];
      assert.equal(Number(numericX.replaceAll(',', '')), point.x);
      assert.equal(Number(tooltip.querySelector('p strong').textContent.replaceAll(',', '')), point.y);
      assert.equal(tooltip.querySelector('a').href, point.sourceUrl);
      assert.match(tooltip.textContent, /Accuracy is experimentally evaluated; inference energy is estimated/);
    }
    assert.equal(JSON.stringify(plot), before);
  } finally { await cleanup(); }
});

test('any new observation in the omitted interval or outside the supported segments restores the ordinary full-range axis', () => {
  for (const value of [6.01, 20, 39.99, -1, 42.01]) {
    const changed = { ...plot, points: [...plot.points, { ...plot.points[0], id: 'future-energy-observation', x: value }] };
    assert.equal(neuroaiEnergyAxis(changed, 46, 536), null, `Never hide x=${value}`);
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: changed })));
    try {
      const document = dom.window.document;
      assert.equal(document.querySelector('[data-x-axis-break]'), null);
      assert.equal(document.querySelectorAll('[data-source-observation]').length, changed.points.length);
      assert.ok(Number.isFinite(Number(document.querySelector('[data-source-observation="future-energy-observation"]').getAttribute('cx'))));
      assert.ok(document.querySelector('table').textContent.includes(String(value)));
    } finally { dom.window.close(); }
  }
  const axis = neuroaiEnergyAxis(plot, 46, 536);
  assert.ok(Number.isNaN(axis.x(20)), 'The piecewise presentation never extrapolates inside the gap');
  assert.equal(neuroaiEnergyAxis({ ...plot, points: plot.points.slice(0, 5) }, 46, 536), null, 'No break without both clusters');
});

test('unrelated numeric/time/log plots retain their original full-range geometry and ticks', () => {
  for (const fixture of [
    { ...plot, id: 'unrelated-numeric' },
    { ...plot, xKind: 'year' },
    { ...plot, scale: 'log' },
  ]) {
    assert.equal(neuroaiEnergyAxis(fixture, 46, 536), null);
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: fixture })));
    try {
      const svg = dom.window.document.querySelector('.draft-plot-svg');
      assert.equal(svg.querySelector('[data-x-axis-break]'), null);
      const axis = svg.querySelector('.draft-plot-axis');
      const left = Number(axis.getAttribute('x1')), right = Number(axis.getAttribute('x2'));
      const min = fixture.xKind === 'number' ? 1.13 : 1;
      const max = fixture.xKind === 'number' ? 41.77 : 42;
      for (const point of fixture.points) near(Number(svg.querySelector(`[data-source-observation="${point.id}"]`).getAttribute('cx')), left + (point.x - min) / (max - min) * (right - left), `${fixture.id} original geometry`);
      const bottom = Number(axis.getAttribute('y1'));
      const ticks = [...svg.querySelectorAll('.draft-plot-tick')].filter(tick => Number(tick.getAttribute('y')) === bottom + 22).map(tick => tick.textContent);
      assert.deepEqual(ticks, fixture.xKind === 'number' ? ['1.13', '21.45', '41.77'] : ['1', '22', '42']);
    } finally { dom.window.close(); }
  }
});

test('the existing export serializer retains the SVG break explanation, slashes and exact mark coordinates', async () => {
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    for (const width of [120, 230, 800]) {
      await act(async () => resize([{ contentRect: { width } }]));
      const source = document.querySelector('.draft-plot-svg');
      const image = buildChartImage({ svg: source, title: plot.title, anchor: 'metric-panel-neuroai-imagenet', notes: [plot.scope] }, 'https://atlas.example/field-velocity');
      const dom = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
      try {
        const exported = dom.window.document.querySelector('svg svg');
        const geometry = svg => [...svg.querySelectorAll('[data-source-observation]')].map(mark => ['data-source-observation', 'cx', 'cy', 'r'].map(key => mark.getAttribute(key)));
        assert.deepEqual(geometry(exported), geometry(source));
        assert.ok([...exported.querySelectorAll('text')].some(text => /6–40 mJ\/image omitted \(no observations\)/.test(text.textContent)), 'SVG explanation survives without depending on an export caption');
        const slashes = [...exported.querySelectorAll('line')].filter(line => Number(line.getAttribute('y1')) - Number(line.getAttribute('y2')) === 8);
        assert.equal(slashes.length, 2, 'Both break slashes survive the geometry allowlist');
        assert.ok(Number.isFinite(image.height) && image.height <= 6000);
      } finally { dom.window.close(); }
    }
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});
