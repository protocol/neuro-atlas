import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { selectPerformance, selectPace } from '../src/lib/field-velocity/performance.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const css = readFileSync('src/components/performance-curves.css', 'utf8');
const sourceBefore = JSON.stringify(feed);
// Captured independently from b883bcb before the font normalization. These hash
// all original text/mark coordinates and content, not just the plotted points.
const baseline = {
  // Intentional replacement: three modern electrical observations; no old frontier line.
  'simultaneously-recorded-neurons': null,
  'tissue-mapped': '4381ff79385d5b1375b516b77b21840bd1601497e8cac0eeab3143bd45678d89',
  'neural-recording-hours': '4089d4a140e99d8703af2f956e032218e9d3965a7e7051aaf8d6ac38d884d266',
  // November 6 independently acquired citation data intentionally replaces the archived coordinates.
  // All other original scientific geometry remains independently pinned.
  idea_vintage: '7ef8ba1c79edbd70c15da002d4abe34b37afaf85f8ff3b7bb4902acf00a77397',
  // Reviewed replacement of the withdrawn animal-event series: five sourced report intervals.
  latency_compression: '3528e6676217983e6ffeebba28b29466ea2e344f878ad7d8c5cb5864af713826',
};
const charts = () => React.createElement(React.Fragment, null,
  React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance, flat: true }),
  React.createElement(PaceReadings, { data: selectPace(feed), flat: true }));

function configureWidth(width) {
  return window => {
    const style = window.document.createElement('style');
    style.textContent = css;
    window.document.head.append(style);
    window.SVGElement.prototype.getBoundingClientRect = function () {
      return { width, height: width * 220 / 360, x: 0, y: 0, top: 0, left: 0, right: width, bottom: width * 220 / 360 };
    };
  };
}

// jsdom does not resolve SVG font inheritance. Follow the real cascade up to
// its numeric value, then apply the width/viewBox scale that browsers apply.
// Parent's native getScreenCTM probe remains the actual rendered-font gate.
function renderedFont(label, renderedWidth) {
  let font;
  for (let node = label; node && !Number.isFinite(font); node = node.parentElement) {
    font = Number.parseFloat(getComputedStyle(node).fontSize);
  }
  const viewWidth = Number(label.closest('svg').getAttribute('viewBox').split(/\s+/)[2]);
  return font * renderedWidth / viewWidth;
}
function assertFonts(width) {
  for (const label of document.querySelectorAll('.pc-preview svg text')) {
    assert.ok(Math.abs(renderedFont(label, width) - 12) < 0.001,
      `${label.closest('[data-performance-card]').dataset.performanceCard}: ${label.textContent} should render at 12px, not ${renderedFont(label, width)}px`);
  }
}
function assertGeometry() {
  assert.equal(createHash('sha256').update(readFileSync('src/data/field-velocity/citation-latency.bundled-20261106.json')).digest('hex'), '0e43c72e2176e21d5418ff88948f3e61396e36a381dc70b8ccb2cbb2a0866611', 'The new citation geometry is tied to the independently verified November 6 source');
  const cards = [...document.querySelectorAll('[data-performance-card]')];
  assert.deepEqual(cards.map(card => card.dataset.performanceCard), Object.keys(baseline));
  for (const card of cards) {
    const svg = card.querySelector('.pc-preview svg');
    assert.equal(svg.getAttribute('viewBox'), '0 0 360 220', 'The fixed plot coordinate frame must not change');
    // Only the readable unit/scale caption may move down to reserve its ascent.
    // Its content/x plus every tick, point, interval and other label remain pinned.
    const normalized = svg.cloneNode(true);
    // Added calendar guides and the separately tested citation series path are
    // presentation additions. Keep the preexisting center/axis golden intact.
    for (const guide of normalized.querySelectorAll('[data-year-guide]')) guide.parentElement.remove();
    for (const path of normalized.querySelectorAll('[data-curve-series]')) {
      if (!path.hasAttribute('data-frontier-line')) { path.remove(); continue; }
      path.removeAttribute('data-curve-series');
      path.removeAttribute('vector-effect');
      path.removeAttribute('pointer-events');
      path.setAttribute('stroke-width', '2.5');
    }
    const caption = normalized.querySelector('text');
    assert.match(caption.textContent, / · (linear|log) scale$/);
    caption.setAttribute('y', '16');
    assert.equal(caption.getAttribute('x'), '0', 'The unit caption shares the heading content edge');
    caption.setAttribute('x', '64'); // Restore only its former internal-gutter anchor for the independent geometry golden.
    // Marker radius/outline and grid paint are intentionally normalized by the
    // presentation cleanup. Restore only those baseline styles for this hash;
    // every original center, tick, interval, label and color stays independently pinned.
    for (const mark of normalized.querySelectorAll('circle')) {
      mark.setAttribute('r', '5');
      mark.setAttribute('data-export-r', '5'); // Restore the former canonical presentation radius only.
      mark.removeAttribute('vector-effect');
    }
    for (const line of normalized.querySelectorAll('.pc-gridline')) {
      line.removeAttribute('class');
      line.removeAttribute('stroke-width');
      line.removeAttribute('vector-effect');
      line.setAttribute('stroke', 'var(--border-strong)');
    }
    if (card.dataset.performanceCard === 'simultaneously-recorded-neurons') {
      assert.equal(normalized.querySelector('polyline'), null);
      assert.equal(normalized.querySelectorAll('circle').length, 3);
      assert.match(caption.textContent, /electrical units/);
      for (const p of normalized.querySelectorAll('circle')) for (const a of ['cx', 'cy']) assert.ok(Number.isFinite(Number(p.getAttribute(a))));
      continue;
    }
    assert.equal(createHash('sha256').update(normalized.innerHTML).digest('hex'), baseline[card.dataset.performanceCard],
      'All scientific geometry/content remain unchanged apart from separately tested presentation styles');
  }
  assert.equal(JSON.stringify(feed), sourceBefore, 'Source objects remain unchanged');
}

test('preview unit and scale captions reserve their full readable ascent inside narrow SVGs', async () => {
  for (const width of [180, 230, 520]) {
    const cleanup = await mount(charts(), '', configureWidth(width));
    try {
      for (const svg of document.querySelectorAll('.pc-preview svg')) {
        const caption = svg.querySelector('text');
        assert.match(caption.textContent, / · (linear|log) scale$/);
        assert.ok(Number(caption.getAttribute('y')) >= Number.parseFloat(svg.style.fontSize) * 1.2,
          'Readable unit/scale caption must not clip above the preview SVG');
      }
    } finally { await cleanup(); }
  }
});

test('reference and Pace previews measure their SVG width to render 12px labels without changing plot geometry', async () => {
  for (const width of [230, 520]) {
    const cleanup = await mount(charts(), '', configureWidth(width));
    try {
      assertGeometry();
      assertFonts(width);
    } finally { await cleanup(); }
  }
});

function resizeHarness() {
  const previous = globalThis.ResizeObserver;
  const observers = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  return {
    observers,
    resize: async width => act(async () => {
      for (const observer of observers.filter(observer => observer.target.matches('.pc-preview svg'))) {
        observer.callback([{ target: observer.target, contentRect: { width } }]);
      }
    }),
    restore: () => {
      if (previous === undefined) delete globalThis.ResizeObserver;
      else globalThis.ResizeObserver = previous;
    },
  };
}

test('resizing each reference and Pace preview normalizes typography and marks, never scientific geometry or the open full chart', async () => {
  const harness = resizeHarness();
  let cleanup;
  try {
    cleanup = await mount(charts(), '#idea_vintage', configureWidth(355));
    assert.equal(harness.observers.length, 6, 'One presentation observer per preview plus one for expanded screen-space marks');
    assert.equal(harness.observers.filter(observer => observer.target.matches('.pc-preview svg')).length, 5);
    assert.equal(harness.observers.filter(observer => observer.target.matches('dialog .pc-plot svg')).length, 1);
    const modal = document.querySelector('dialog .pc-plot svg');
    const fullBefore = modal.outerHTML;
    assert.ok(Math.abs(Number.parseFloat(modal.style.fontSize) * 355 / 720 - 12) < 0.001, 'Full-chart type is normalized to the same 12 screen pixels');
    for (const width of [720, 224, 519.5]) {
      await harness.resize(width);
      assertFonts(width);
      assertGeometry();
      assert.equal(modal.outerHTML, fullBefore, 'No modal or PNG SVG changes on preview resize');
    }
  } finally {
    if (cleanup) await cleanup();
    harness.restore();
  }
});

test('hidden or invalid preview widths retain the last usable font size and recover when shown', async () => {
  const harness = resizeHarness();
  let cleanup;
  try {
    cleanup = await mount(charts(), '', configureWidth(355));
    await harness.resize(520);
    const styles = () => [...document.querySelectorAll('.pc-preview svg')].map(svg => svg.style.fontSize);
    const usable = styles();
    for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await harness.resize(width);
      assert.deepEqual(styles(), usable, 'A hidden/invalid measurement must not replace usable typography');
      assertFonts(520);
      assertGeometry();
    }
    await harness.resize(224);
    assertFonts(224);
    await cleanup();
    cleanup = undefined;
    harness.observers.length = 0;
    cleanup = await mount(charts(), '', configureWidth(0));
    assert.ok([...document.querySelectorAll('.pc-preview svg')].every(svg => svg.style.fontSize === '12px'),
      'Initially hidden previews retain a finite 12px coordinate fallback until measurable');
    await harness.resize(519.5);
    assertFonts(519.5);
    assertGeometry();
  } finally {
    if (cleanup) await cleanup();
    harness.restore();
  }
});

test('preview observers disconnect and ignore queued deliveries after StrictMode cleanup and unmount', async () => {
  const harness = resizeHarness();
  let cleanup;
  let lateReads = 0;
  const lateEntry = observer => ({
    target: observer.target,
    get contentRect() { lateReads += 1; return { width: 720 }; },
  });
  try {
    cleanup = await mount(React.createElement(React.StrictMode, null, charts()), '', configureWidth(355));
    assert.equal(harness.observers.length, 10, 'StrictMode remounts the five preview observers');
    const disposed = harness.observers.filter(observer => observer.disconnected);
    assert.equal(disposed.length, 5, 'Synthetic cleanup releases the old five observers');
    await act(async () => {
      for (const observer of disposed) observer.callback([lateEntry(observer)]);
    });
    assert.equal(lateReads, 0, 'Disposed observers must not read queued measurements or update live preview state');
    assertFonts(355);
    await harness.resize(520);
    assertFonts(520);
    await cleanup();
    cleanup = undefined;
    assert.ok(harness.observers.every(observer => observer.disconnected), 'Every observer is released on unmount');
    await act(async () => {
      for (const observer of harness.observers) observer.callback([lateEntry(observer)]);
    });
    assert.equal(lateReads, 0, 'Unmounted previews ignore queued resize callbacks');
  } finally {
    if (cleanup) await cleanup();
    harness.restore();
  }
});
