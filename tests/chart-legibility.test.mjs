import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { CHART_PRESENTATION } from '../src/lib/chart-presentation.ts';
import { parsePublicationSnapshot, selectPublicationCharts } from '../src/lib/publication-data.ts';
import { syntheticPublicationEndpointSnapshot, syntheticMatchedGrowth } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const fixture = () => ({ ...syntheticPublicationEndpointSnapshot(), matchedGrowth: syntheticMatchedGrowth() });
const points = [2018, 2020, 2023].map((x, i) => ({ id: `p${i}`, x, y: i + 1, label: `Fixture ${i}`, dateLabel: `${x}`, sourceTitle: 'Synthetic source', sourceUrl: 'https://example.org', quote: 'Fixture' }));
const plot = { id: 'fixture', title: 'Synthetic temporal chart', xKind: 'year', xLabel: 'Publication year', yLabel: 'Fixture units', scale: 'linear', scope: 'Synthetic only.', points };
const curve = { title: plot.title, unit: plot.yLabel, scale: 'linear', line: false, tracks: [{ id: 'fixture', label: 'Fixture' }], points: points.map(p => ({ date: `${p.x}-01-01`, value: p.y, label: p.label, track: 'fixture', trackIndex: 0 })) };

for (const family of ['curve', 'annual', 'growth']) test(`${family}: larger fixed-size observations use 5px preview / 6px expanded radii at actual CTM scale`, async () => {
  const previous = globalThis.ResizeObserver, observers = [];
  let scale = 1, cleanup;
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  try {
    const node = family === 'curve' ? React.createElement(CurveCard, { id: 'tissue-mapped', title: curve.title, eyebrow: 'Fixture', coverage: 'Scope', plot: curve }) : React.createElement(PublicationCharts, { snapshot: fixture(), allowTestFixture: true });
    cleanup = await mount(node, family === 'curve' ? '#tissue-mapped' : `#publication-${family === 'annual' ? 'output' : 'growth'}`, window => {
      window.SVGElement.prototype.getScreenCTM = () => ({ a: scale, b: 0 });
      window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 740, height: 370 });
    });
    const selector = family === 'curve' ? 'circle[data-export-r]' : family === 'annual' ? 'circle[data-publication-mark]' : '[data-growth-series="neurotech"]';
    for (const next of [.6, 1, 1.4]) {
      scale = next;
      await act(async () => { for (const o of observers.filter(o => !o.disconnected)) o.callback([{ contentRect: { width: 740 * scale, height: 370 * scale } }]); });
      const full = [...document.querySelectorAll(`dialog ${selector}`)];
      assert.ok(full.length);
      for (const mark of full) assert.ok(Math.abs(Number(mark.getAttribute('r')) * scale - 6) < .001, `${family} full radius: ${mark.getAttribute('r')} × ${scale}`);
      const preview = [...document.querySelectorAll(`article ${selector}`)].filter(mark => !mark.closest('dialog'));
      assert.ok(preview.length);
      for (const mark of preview) assert.ok(Math.abs(Number(mark.getAttribute('r')) * scale - 5) < .001, `${family} preview radius`);
    }
    assert.equal(CHART_PRESENTATION.denseLineRadius, 2.5, 'Weekly Trends samples keep their denser, non-scatter contract');
    assert.equal(CHART_PRESENTATION.labelFontSize, 12, 'Do not shrink labels to make room');
  } finally { if (cleanup) await cleanup(); if (previous === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previous; }
});

test('growth endpoint labels keep a 6 CSS px gap beyond the enlarged dots at narrow CTM scales without moving data', async () => {
  const snapshot = JSON.parse(readFileSync('src/data/publications/publication-charts.snapshot.json', 'utf8'));
  const before = JSON.stringify(snapshot), data = selectPublicationCharts(parsePublicationSnapshot(snapshot));
  const values = [...data.growth.map(row => row.growth), data.neurotechGrowth, data.scienceGrowth.low, data.scienceGrowth.high];
  const low = Math.floor(Math.min(0, ...values) / 25) * 25, high = Math.ceil(Math.max(50, ...values) / 25) * 25;
  const previous = globalThis.ResizeObserver, observers = [];
  let previewScale = 172 / 400, fullScale = .6, cleanup;
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  try {
    cleanup = await mount(React.createElement(PublicationCharts, { snapshot }), '#publication-growth', window => {
      window.SVGElement.prototype.getScreenCTM = function () { return { a: this.closest('dialog') ? fullScale : previewScale, b: 0 }; };
      window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 820, height: 370 });
    });
    for (const [preview, full] of [[172 / 400, .6], [188 / 400, 1], [.6, 1.4], [1, 1], [1.4, 1.4]]) {
      previewScale = preview; fullScale = full;
      await act(async () => { for (const o of observers.filter(o => !o.disconnected)) o.callback([{ contentRect: { width: 820, height: 370 } }]); });
      const compact = document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg');
      const expanded = document.querySelector('dialog [data-growth-export]');
      for (const [svg, scale, isPreview] of [[compact, previewScale, true], [expanded, fullScale, false]]) {
        const fontSize = parseFloat(svg.style.fontSize), left = isPreview ? Math.max(18, fontSize * .8) : 280;
        const right = isPreview ? 388 - fontSize * 5 : 740;
        const x = value => left + (value - low) / (high - low) * (right - left);
        assert.deepEqual([...svg.querySelectorAll('[data-growth-row]')].map(mark => [mark.dataset.growthRow, Number(mark.dataset.value)]), data.growth.map(row => [row.id, row.growth]));
        for (const row of data.growth) {
          const mark = svg.querySelector(`[data-growth-row="${row.id}"]`), dot = mark.querySelector('circle');
          const label = mark.querySelector('[data-growth-label]'), stem = mark.querySelector('[data-growth-stem]');
          const gap = (Number(label.getAttribute('x')) - Number(dot.getAttribute('cx')) - Number(dot.getAttribute('r'))) * scale;
          assert.ok(Math.abs(gap - 6) < .001, `${row.id}: ${isPreview ? 'preview' : 'expanded'} gap ${gap}px at scale ${scale}`);
          assert.equal(Number(dot.getAttribute('cx')), x(row.growth), 'Labels must not displace quantitative dot positions');
          assert.equal(Number(stem.getAttribute('x1')), x(0));
          assert.equal(Number(stem.getAttribute('x2')), x(row.growth));
          assert.equal(label.getAttribute('y'), dot.getAttribute('cy'));
          // The existing 5em gutter must still fit the current percentage labels
          // (including +159.5%) after their gap is normalized, not shrink their type.
          assert.ok(Number(label.getAttribute('x')) + fontSize * 5 <= (isPreview ? 400 : 820), `${row.id}: preserve the full percentage-label width budget`);
        }
      }
    }
    assert.equal(JSON.stringify(snapshot), before, 'Screen-space label movement leaves the actual source untouched');
  } finally { if (cleanup) await cleanup(); if (previous === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previous; }
});

for (const preview of [true, false]) test(`responsive draft observations and events share larger visual radii (preview=${preview})`, () => {
  const radius = preview ? 5 : 6;
  for (const node of [React.createElement(DraftChartPlot, { plot, preview }), React.createElement(DraftEventTimeline, { preview, timeline: { scope: 'Synthetic only.', events: points.map(p => ({ ...p, year: p.x, stage: 'Research', note: 'Fixture' })) } })]) {
    const dom = new JSDOM(renderToStaticMarkup(node));
    const marks = [...dom.window.document.querySelectorAll('[data-source-observation], [data-source-event]')];
    assert.ok(marks.length);
    for (const mark of marks) assert.equal(Number(mark.getAttribute('r')), radius);
    dom.window.close();
  }
});
