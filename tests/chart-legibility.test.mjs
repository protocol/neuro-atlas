import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { CHART_PRESENTATION } from '../src/lib/chart-presentation.ts';
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
