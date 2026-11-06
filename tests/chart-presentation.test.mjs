import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
// Synthetic renderer fixtures only; not scientific observations.
const plot = {
  id: 'presentation-fixture', title: 'Synthetic observations',
  xLabel: 'Publication year', yLabel: 'Fixture units', scale: 'linear', scope: 'Synthetic fixture only.',
  points: [2000, 2010, 2020].map((year, index) => ({
    id: `point-${index}`, x: year, y: (index + 1) * 10, label: `Fixture ${index}`,
    dateLabel: `${year} publication`, sourceTitle: `Source ${index}`,
    sourceUrl: `https://example.org/${index}`, quote: 'Synthetic value.',
  })),
};
const curve = {
  title: plot.title, unit: plot.yLabel, scale: plot.scale, line: false,
  tracks: [{ id: 'fixture', label: 'Synthetic fixture' }],
  points: plot.points.map(point => ({ date: `${point.x}-01-01`, value: point.y, label: point.label, track: 'fixture', trackIndex: 0 })),
};
const timeline = {
  scope: 'Synthetic fixture only.',
  events: plot.points.map(point => ({ ...point, year: point.x, stage: 'Synthetic stage', note: 'Fixture event.' })),
};
const charts = () => React.createElement(React.Fragment, null,
  React.createElement(CurveCard, { id: 'tissue-mapped', title: curve.title, eyebrow: 'Fixture', coverage: 'Synthetic coverage.', plot: curve }, null),
  React.createElement(DraftChartPlot, { plot, preview: true }));

function resizeHarness(initialWidth = 680) {
  const previous = globalThis.ResizeObserver;
  const observers = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  return {
    observers,
    configure(window) {
      window.SVGElement.prototype.getBoundingClientRect = () => ({ width: initialWidth });
      const style = window.document.createElement('style');
      style.textContent = readFileSync('src/components/performance-curves.css', 'utf8')
        + readFileSync('src/components/draft-chart-plot.css', 'utf8')
        + readFileSync('src/components/draft-chart-panel.css', 'utf8')
        + readFileSync('src/components/google-trends.css', 'utf8');
      window.document.head.append(style);
    },
    resize: width => act(async () => {
      for (const observer of observers.filter(observer => !observer.disconnected)) {
        observer.callback([{ target: observer.target, contentRect: { width } }]);
      }
    }),
    restore() {
      if (previous === undefined) delete globalThis.ResizeObserver;
      else globalThis.ResizeObserver = previous;
    },
  };
}
function screenRadius(mark, width) {
  return Number(mark.getAttribute('r')) * width / Number(mark.closest('svg').getAttribute('viewBox').split(' ')[2]);
}
const centers = svg => [...svg.querySelectorAll('circle')].map(mark => ['cx', 'cy'].map(name => mark.getAttribute(name)));

test('reference and draft preview circles remain 4 screen pixels across narrow and wide cards without moving observations', async () => {
  const before = JSON.stringify({ plot, curve });
  const harness = resizeHarness();
  let cleanup;
  try {
    cleanup = await mount(charts(), '', harness.configure);
    const reference = document.querySelector('.pc-preview svg');
    const pinned = centers(reference);
    for (const width of [680, 230, 520, 180, 519.5]) {
      await harness.resize(width);
      for (const mark of document.querySelectorAll('.pc-preview circle, [data-draft-preview] [data-source-observation]')) {
        // The draft plot rounds its measured coordinate width, as before.
        const renderedWidth = mark.closest('.draft-plot') ? Math.round(width) : width;
        assert.ok(Math.abs(screenRadius(mark, renderedWidth) - 4) < 1e-9,
          `${mark.closest('.pc-preview') ? 'Reference' : 'Draft'} radius should render at 4px, not ${screenRadius(mark, renderedWidth)}px (card ${width}px)`);
        assert.equal(mark.getAttribute('tabindex'), null, 'Preview marks never gain inspection/focus styling');
      }
      assert.deepEqual(centers(reference), pinned, 'Only marker presentation changes, never source centers');
      assert.equal(reference.getAttribute('viewBox'), '0 0 360 220');
      assert.equal(document.querySelector('.draft-plot-inspector'), null);
    }
    const usable = [...document.querySelectorAll('.pc-preview circle')].map(mark => mark.getAttribute('r'));
    for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await harness.resize(width);
      assert.deepEqual([...document.querySelectorAll('.pc-preview circle')].map(mark => mark.getAttribute('r')), usable);
    }
    assert.equal(harness.observers.length, 2, 'Reuse the existing preview SVG and draft figure observers only');
    assert.equal(JSON.stringify({ plot, curve }), before, 'Rendering never edits source objects');
  } finally { if (cleanup) await cleanup(); harness.restore(); }
});


test('expanded marks share a 5px screen-space base and 1.5px non-scaling outlines; preview resizing never changes the expanded curve', async () => {
  const harness = resizeHarness();
  let cleanup;
  try {
    cleanup = await mount(React.createElement(React.Fragment, null, charts(),
      React.createElement(DraftChartPlot, { plot }),
      React.createElement(DraftEventTimeline, { timeline, preview: true }),
      React.createElement(DraftEventTimeline, { timeline })), '#tissue-mapped', harness.configure);
    await harness.resize(680);
    const expanded = document.querySelector('dialog .pc-plot svg');
    const fullBefore = expanded.outerHTML;
    for (const mark of document.querySelectorAll('[data-curve-point], [data-source-observation], [data-source-event]')) {
      assert.equal(mark.getAttribute('vector-effect'), 'non-scaling-stroke', 'SVG scaling must not thicken mark outlines');
      // jsdom does not apply SVG presentation attributes in computed styles.
      const strokeWidth = mark.style.strokeWidth || mark.getAttribute('stroke-width');
      assert.equal(Number.parseFloat(strokeWidth), 1.5, 'One quiet marker-outline weight across families');
      if (mark.closest('[data-draft-preview]')) assert.equal(mark.getAttribute('r'), '4');
      else assert.ok(Math.abs(screenRadius(mark, mark.closest('.pc-plot') ? 680 : Math.round(680)) - 5) < 1e-9);
    }
    assert.equal(document.querySelector('.draft-plot:not([data-draft-preview]) .draft-plot-inspector').textContent, '');
    for (const width of [230, 520]) {
      // The compact-only observer must not alter full-chart or export geometry.
      await act(async () => {
        for (const observer of harness.observers.filter(observer => observer.target.matches('.pc-preview svg'))) {
          observer.callback([{ target: observer.target, contentRect: { width } }]);
        }
      });
      assert.equal(expanded.outerHTML, fullBefore);
    }
    assert.equal(harness.observers.filter(observer => observer.target.closest('dialog')).length, 1, 'One shared presentation observer per expanded SVG');
    const mark = expanded.querySelector('[data-curve-point]');
    await act(async () => mark.focus());
    assert.ok(Math.abs(screenRadius(mark, 680) - 7) < 1e-9, 'Inspection emphasis stays confined to expanded charts');
    assert.equal(mark.getAttribute('data-export-r'), '5', 'Exports never freeze focus enlargement');
    assert.equal(Number.parseFloat(mark.getAttribute('stroke-width')), 1.5);
  } finally { if (cleanup) await cleanup(); harness.restore(); }
});


test('expanded curve radius follows the actual SVG screen transform including max-height letterboxing, without changing export geometry', async () => {
  const { buildChartImage } = await import('../src/lib/chart-export.ts');
  const harness = resizeHarness(1000);
  let scale = 410 / 300;
  let cleanup;
  try {
    cleanup = await mount(charts(), '#tissue-mapped', window => {
      harness.configure(window);
      window.SVGElement.prototype.getScreenCTM = function () {
        return { a: this.closest('.pc-plot') ? scale : 1000 / 360, b: 0 };
      };
    });
    const svg = document.querySelector('dialog .pc-plot svg');
    const pinned = centers(svg);
    const spec = { svg, title: curve.title, anchor: 'tissue-mapped', notes: [] };
    const exported = buildChartImage(spec, window.location.href).svg;
    for (const nextScale of [410 / 300, 560 / 720, 1.25]) {
      scale = nextScale;
      await harness.resize(1000); // same bounding width; the effective fitted scale differs.
      const mark = svg.querySelector('[data-curve-point]');
      assert.ok(Math.abs(Number(mark.getAttribute('r')) * scale - 5) < 1e-9,
        'Use screenCTM, not the 1000px outer SVG width, when a height cap letterboxes the plot');
      assert.deepEqual(centers(svg), pinned, 'Screen-sized styling never remaps measurements');
      assert.equal(buildChartImage(spec, window.location.href).svg, exported, 'Export radius stays canonical rather than depending on viewport');
      await act(async () => mark.focus());
      assert.ok(Math.abs(Number(mark.getAttribute('r')) * scale - 7) < 1e-9);
      assert.equal(buildChartImage(spec, window.location.href).svg, exported, 'Focus never leaks into export');
      await act(async () => mark.blur());
    }
  } finally { if (cleanup) await cleanup(); harness.restore(); }
});


test('overlap rings use the common base without implying a quantitative magnitude', async () => {
  const overlapping = { ...plot, points: plot.points.map(point => ({ ...point, x: 2010, y: 20 })) };
  const before = JSON.stringify(overlapping);
  for (const preview of [true, false]) {
    const cleanup = await mount(React.createElement(DraftChartPlot, { plot: overlapping, preview }));
    try {
      const marks = [...document.querySelectorAll('[data-source-observation]')];
      const base = preview ? 4 : 5;
      assert.deepEqual(marks.map(mark => Number(mark.getAttribute('r'))), [base * 3, base * 2, base]);
      assert.equal(new Set(marks.map(mark => `${mark.getAttribute('cx')},${mark.getAttribute('cy')}`)).size, 1);
      assert.deepEqual(marks.map(mark => mark.getAttribute('fill')), ['none', 'none', 'var(--accent)']);
      assert.deepEqual(marks.map(mark => mark.getAttribute('pointer-events')), ['stroke', 'stroke', null]);
      const note = document.querySelector('[data-overlap-note]');
      assert.ok(note, 'Explain rings even in the preview, before any point inspection');
      assert.equal(note.closest('details, svg, [hidden]'), null);
      assert.match(note.textContent, /Rings keep overlapping observations visible at their source positions/);
      if (!preview) {
        for (const [index, mark] of marks.entries()) {
          await act(async () => mark.focus());
          assert.equal(document.querySelector('[role="tooltip"] a').href, overlapping.points[index].sourceUrl);
        }
      }
      assert.equal(JSON.stringify(overlapping), before);
    } finally { await cleanup(); }
  }
});


test('rail previews share title typography, caveats-below hierarchy and quiet non-scaling gridlines without height constraints', async () => {
  const harness = resizeHarness();
  let cleanup;
  try {
    cleanup = await mount(React.createElement('div', { className: 'metric-chart-rail' },
      React.createElement(CurveCard, { id: 'tissue-mapped', title: curve.title, eyebrow: 'Fixture', coverage: 'Synthetic coverage.', plot: curve }, null),
      React.createElement('div', { className: 'draft-popout-preview' }, React.createElement(DraftChartPlot, { plot, preview: true })),
      React.createElement('article', { className: 'gt-card' }, React.createElement('button', { className: 'pc-trigger' },
        React.createElement('h3', null, 'Synthetic attention heading')))), '', harness.configure);
    const headings = [...document.querySelectorAll('.pc-card-title, .draft-plot > figcaption, .gt-card h3')];
    assert.equal(headings.length, 3);
    for (const heading of headings) {
      const style = getComputedStyle(heading);
      assert.equal(style.fontSize, '16px');
      assert.equal(style.fontWeight, '600');
      assert.equal(style.lineHeight, '1.4');
      assert.equal(style.marginTop, '0px');
    }
    const reference = document.querySelector('.pc-preview');
    const coverage = document.querySelector('.pc-coverage');
    assert.equal(coverage.textContent, 'Synthetic coverage.', 'Preserve the complete coverage qualification');
    assert.ok(reference.compareDocumentPosition(coverage) & 4, 'Coverage follows the preview, like draft qualifications');
    const grids = [...document.querySelectorAll('.pc-gridline, .draft-plot-gridline')];
    assert.ok(grids.some(grid => grid.classList.contains('pc-gridline')));
    for (const grid of grids) {
      assert.equal(grid.getAttribute('stroke'), 'var(--border)');
      assert.equal(grid.getAttribute('stroke-width'), '1');
      assert.equal(grid.getAttribute('stroke-dasharray'), '3 5');
      assert.equal(grid.getAttribute('vector-effect'), 'non-scaling-stroke');
    }
    for (const svg of document.querySelectorAll('.pc-preview svg, .draft-plot-svg')) {
      assert.equal(getComputedStyle(svg).height, 'auto', 'Do not squeeze source plots into fixed preview heights');
    }
  } finally { if (cleanup) await cleanup(); harness.restore(); }
});
