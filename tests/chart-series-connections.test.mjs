import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
for (const preview of [true, false]) test(`only source-supported release/cumulative identities connect (preview=${preview})`, () => {
  const expected = {
    'recording-hours': { series: 'tusz-releases', ids: ['tusz-scalp-eeg-2017-04-17','tusz-scalp-eeg-2017-08-04','tusz-scalp-eeg-2018-04-15','tusz-scalp-eeg-2018-08-16','tusz-scalp-eeg-2018-11-14','tusz-scalp-eeg-2019-07-22','tusz-scalp-eeg-2020-04-23','tusz-scalp-eeg-2020-05-09'] },
    'neuralink-cumulative': { series: 'neuralink-recipients', ids: ['neuralink-cumulative-2024-01-01','neuralink-cumulative-2024-07-01','neuralink-cumulative-2025-02-05','neuralink-cumulative-2025-06-02','neuralink-cumulative-2026-01-28'] },
  };
  for (const plot of Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots)) {
    const before = JSON.stringify(plot);
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview })));
    try {
      const document = dom.window.document, paths = [...document.querySelectorAll('[data-observation-series]')];
      const spec = expected[plot.id];
      if (!spec) { assert.equal(paths.length, 0, `${plot.id}: shared category/species/technique is not a longitudinal identity`); continue; }
      assert.equal(paths.length, 1, plot.id);
      assert.equal(paths[0].dataset.observationSeries, spec.series);
      const centers = spec.ids.map(id => { const mark = document.querySelector(`[data-source-observation="${id}"]`); assert.ok(mark, id); return `${mark.getAttribute('cx')},${mark.getAttribute('cy')}`; });
      assert.equal(paths[0].getAttribute('points'), centers.join(' '), 'Connections use the actual source coordinates in chronology');
      assert.equal(paths[0].getAttribute('fill'), 'none');
      assert.equal(paths[0].getAttribute('pointer-events'), 'none');
      const marks = document.querySelectorAll('[data-source-observation]');
      assert.ok(paths[0].compareDocumentPosition(marks[0]) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'Source glyphs paint above their lines');
      if (!preview) assert.match(document.querySelector('.draft-plot-legend').textContent, /Lines connect only/);
      assert.equal(JSON.stringify(plot), before, 'No source mutation while drawing');
    } finally { dom.window.close(); }
  }
});

test('curve paths partition explicit series by track and never connect cross-track or unreliable samples', async () => {
  const plot = { title: 'Fixture', unit: 'Units', scale: 'linear', line: false, connectTracks: ['a','b'], tracks: [{id:'a',label:'A'},{id:'b',label:'B'}], points: [
    {date:'2020-01-01',value:2,track:'b',trackIndex:1,label:'B1'},
    {date:'2019-01-01',value:1,track:'a',trackIndex:0,label:'A1'},
    {date:'2022-01-01',value:4,track:'a',trackIndex:0,label:'A3 unreliable',reliable:false},
    {date:'2021-01-01',value:3,track:'a',trackIndex:0,label:'A2'},
    {date:'2023-01-01',value:5,track:'b',trackIndex:1,label:'B2'},
  ] };
  const cleanup = await mount(React.createElement(CurveCard, {id:'tissue-mapped',title:plot.title,eyebrow:'Fixture',coverage:'Scope',plot}), '#tissue-mapped');
  try {
    const svg = document.querySelector('dialog svg'), paths = [...svg.querySelectorAll('[data-curve-series]')];
    assert.deepEqual(paths.map(path => path.dataset.curveSeries), ['a','b']);
    for (const path of paths) {
      const marks = [...svg.querySelectorAll('[data-curve-point]')].filter(mark => mark.dataset.curvePoint.startsWith(`${path.dataset.curveSeries}:`) && !mark.hasAttribute('data-under-indexed')).sort((a,b) => a.dataset.curvePoint.localeCompare(b.dataset.curvePoint));
      assert.equal(path.getAttribute('points'), marks.map(mark => `${mark.getAttribute('cx')},${mark.getAttribute('cy')}`).join(' '));
    }
  } finally { await cleanup(); }
});

test('citation annual medians connect as their own reliable measurement series; translation pathways remain separate', async () => {
  const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
  const cleanup = await mount(React.createElement(PaceReadings, { data: selectPace(feed), flat:true }), '#idea_vintage');
  try {
    const svg = document.querySelector('dialog svg'), path = svg.querySelector('[data-curve-series="idea_vintage"]');
    assert.ok(path, 'Repeated annual medians are one measurement series, not separate studies');
    assert.match(svg.getAttribute('aria-label'), /Lines connect successive reliable observations within each measurement series/);
    const marks = [...svg.querySelectorAll('[data-curve-point]')].filter(mark => !mark.hasAttribute('data-under-indexed'));
    assert.equal(path.getAttribute('points'), marks.map(mark => `${mark.getAttribute('cx')},${mark.getAttribute('cy')}`).join(' '));
    assert.equal(document.querySelector('[data-performance-card="latency_compression"] .pc-preview polyline'), null, 'Different device pathways are not a time series');
  } finally { await cleanup(); }
});
