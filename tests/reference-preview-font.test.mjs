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
  'simultaneously-recorded-neurons': '5b23f211cf1203c59efdf82d80d323f1da3a5cdde89cd95c6804ccdbb5f92671',
  'tissue-mapped': '4381ff79385d5b1375b516b77b21840bd1601497e8cac0eeab3143bd45678d89',
  'neural-recording-hours': '4089d4a140e99d8703af2f956e032218e9d3965a7e7051aaf8d6ac38d884d266',
  idea_vintage: '158b7a9b48047b6ff64c84ea9982b55ba0f655f0fa346117ac16145f90d74f47',
  latency_compression: 'dbbf9b6c83aa40fdb5d3080e019f74b6d3e2d72ea888ca01627e6cbe1766daaa',
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
    assert.ok(Math.abs(renderedFont(label, width) - 11) < 0.001,
      `${label.closest('[data-performance-card]').dataset.performanceCard}: ${label.textContent} should render at 11px, not ${renderedFont(label, width)}px`);
  }
}
function assertGeometry() {
  const cards = [...document.querySelectorAll('[data-performance-card]')];
  assert.deepEqual(cards.map(card => card.dataset.performanceCard), Object.keys(baseline));
  for (const card of cards) {
    const svg = card.querySelector('.pc-preview svg');
    assert.equal(svg.getAttribute('viewBox'), '0 0 360 220', 'The fixed plot coordinate frame must not change');
    assert.equal(createHash('sha256').update(svg.innerHTML).digest('hex'), baseline[card.dataset.performanceCard],
      'Every path, point, interval and label retains its original coordinates/content');
  }
  assert.equal(JSON.stringify(feed), sourceBefore, 'Source objects remain unchanged');
}

test('reference and Pace previews measure their SVG width to render 11px labels without changing plot geometry', async () => {
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
      for (const observer of observers) {
        observer.callback([{ target: observer.target, contentRect: { width } }]);
      }
    }),
    restore: () => {
      if (previous === undefined) delete globalThis.ResizeObserver;
      else globalThis.ResizeObserver = previous;
    },
  };
}

test('resizing each reference and Pace preview normalizes only its typography, never its geometry or the open full chart', async () => {
  const harness = resizeHarness();
  let cleanup;
  try {
    cleanup = await mount(charts(), '#idea_vintage', configureWidth(355));
    assert.equal(harness.observers.length, 5, 'Observe each preview SVG, not the full modal');
    assert.ok(harness.observers.every(observer => observer.target.matches('.pc-preview svg')));
    const modal = document.querySelector('dialog .pc-plot svg');
    const fullBefore = modal.outerHTML;
    assert.equal(modal.style.fontSize, '', 'Full-chart/export typography must not be overridden');
    assert.equal(getComputedStyle(modal.querySelector('text')).fontSize, '12px');
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
    assert.ok([...document.querySelectorAll('.pc-preview svg')].every(svg => svg.style.fontSize === '11px'),
      'Initially hidden previews retain a finite 11px coordinate fallback until measurable');
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
