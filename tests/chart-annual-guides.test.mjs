import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { bundledTrends } from '../src/lib/field-velocity/google-trends-default.ts';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { syntheticPublicationEndpointSnapshot, syntheticMatchedGrowth } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const points = [2018, 2020, 2023].map((x, i) => ({ id: `p${i}`, x, y: i + 1, label: `Fixture ${i}`, dateLabel: `${x}`, sourceTitle: 'Synthetic source', sourceUrl: 'https://example.org', quote: 'Fixture' }));
const trends = bundledTrends.snapshot.groups.find(group => group.id === 'neurotech');
const plot = { id: 'fixture', title: 'Synthetic chart', xKind: 'year', xLabel: 'Publication year', yLabel: 'Fixture units', scale: 'linear', scope: 'Synthetic only.', points };
function guides(svg, years) {
  const lines = [...svg.querySelectorAll('[data-year-guide]')];
  assert.deepEqual(lines.map(line => Number(line.dataset.yearGuide)), years);
  for (const line of lines) {
    assert.equal(line.getAttribute('x1'), line.getAttribute('x2'));
    assert.ok(Number(line.getAttribute('y2')) > Number(line.getAttribute('y1')));
    assert.equal(line.getAttribute('stroke-width'), '1');
    assert.equal(line.getAttribute('vector-effect'), 'non-scaling-stroke');
    assert.equal(line.getAttribute('pointer-events'), 'none', 'Guides never intercept source inspection');
  }
  return lines;
}
for (const preview of [true, false]) test(`temporal draft guides use the exact year projection, not evenly spaced observations (preview=${preview})`, () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview })));
  try {
    const svg = dom.window.document.querySelector('svg'), lines = guides(svg, [2018,2019,2020,2021,2022,2023]);
    const marks = [...svg.querySelectorAll('[data-source-observation]')];
    for (const [i, year] of [2018,2020,2023].entries()) assert.equal(lines.find(line => Number(line.dataset.yearGuide) === year).getAttribute('x1'), marks[i].getAttribute('cx'));
    assert.ok(svg.compareDocumentPosition(lines[0]) & dom.window.Node.DOCUMENT_POSITION_CONTAINED_BY);
  } finally { dom.window.close(); }
});

test('non-temporal scatterplots never acquire year guides or time-like series paths', () => {
  for (const evidence of Object.values(METRIC_CHART_EVIDENCE)) for (const plot of evidence.plots.filter(p => p.xKind === 'number')) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
    assert.equal(dom.window.document.querySelector('[data-year-guide]'), null, plot.id);
    assert.equal(dom.window.document.querySelector('[data-observation-series]'), null, plot.id);
    dom.window.close();
  }
});

test('event guides align with year coordinates without connecting unrelated stages', () => {
  const timeline = { scope: 'Synthetic only.', events: points.map(p => ({ ...p, year: p.x, stage: 'Research', note: 'Fixture' })) };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftEventTimeline, { timeline, preview: true })));
  try {
    const svg = dom.window.document.querySelector('svg'), lines = guides(svg, [2018,2019,2020,2021,2022,2023]);
    assert.equal(lines[0].getAttribute('x1'), svg.querySelector('[data-source-event]').getAttribute('cx'));
    assert.equal(svg.querySelector('polyline'), null);
  } finally { dom.window.close(); }
});

for (const family of ['curve', 'annual', 'trends']) test(`${family}: preview and expanded charts retain annual guides on the original date axis`, async () => {
  const curve = { title: 'Fixture', unit: 'Units', scale: 'linear', line: false, tracks: [{ id: 'fixture', label: 'Fixture' }], points: points.map(p => ({ date: `${p.x}-01-01`, value: p.y, label: p.label, track: 'fixture', trackIndex: 0 })) };
  const node = family === 'curve' ? React.createElement(CurveCard, { id: 'tissue-mapped', title: curve.title, eyebrow: 'Fixture', coverage: 'Scope', plot: curve }) : family === 'annual' ? React.createElement(PublicationCharts, { snapshot: { ...syntheticPublicationEndpointSnapshot(), matchedGrowth: syntheticMatchedGrowth() }, allowTestFixture: true }) : React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] });
  const cleanup = await mount(node, family === 'curve' ? '#tissue-mapped' : family === 'annual' ? '#publication-output' : '#google-trends-neurotech');
  try {
    const svgs = family === 'curve' ? document.querySelectorAll('.pc-preview svg, dialog .pc-plot svg') : family === 'annual' ? document.querySelectorAll('[data-publication-card="publication-output"] .publication-preview svg, dialog .publication-full-plot svg') : document.querySelectorAll('.gt-preview svg, dialog .gt-plot svg');
    assert.equal(svgs.length, 2);
    for (const svg of svgs) {
      const years = family === 'curve' ? [2018,2019,2020,2021,2022,2023] : family === 'annual' ? Array.from({ length: 16 }, (_, i) => 2010 + i) : [2024,2025,2026];
      assert.ok(years.length >= 3, 'Annual divisions must be present, not just endpoint labels');
      const lines = guides(svg, years);
      if (family === 'curve') for (const mark of svg.querySelectorAll('circle[data-export-r]')) {
        const date = mark.getAttribute('data-curve-point')?.split(':').at(-1);
        if (date) assert.equal(lines.find(line => line.dataset.yearGuide === date.slice(0,4)).getAttribute('x1'), mark.getAttribute('cx'));
      }
      if (family === 'annual') for (const mark of svg.querySelectorAll('circle[data-year]')) assert.equal(lines.find(line => line.dataset.yearGuide === mark.dataset.year).getAttribute('x1'), mark.getAttribute('cx'));
      if (family === 'trends') {
        const labels = [...svg.querySelectorAll('[data-trends-axis="x"]')], start = labels[0].textContent;
        const firstYear = Number(start.slice(0,4)), first = lines[0];
        assert.ok(Number(first.dataset.yearGuide) >= firstYear);
        const right = Number(svg.getAttribute('viewBox').split(' ')[2]) - 20;
        for (const line of lines) {
          const expected = 48 + (Date.UTC(Number(line.dataset.yearGuide), 0, 1) - Date.parse(trends.start)) / (Date.parse(trends.end) - Date.parse(trends.start)) * (right - 48);
          assert.ok(Math.abs(Number(line.getAttribute('x1')) - expected) < 1e-8, 'January 1 shares the exact UTC time projection');
        }
        const last = lines.at(-1);
        assert.ok(Number(first.getAttribute('x1')) >= 48 && Number(last.getAttribute('x1')) <= Number(svg.getAttribute('viewBox').split(' ')[2]) - 20);
        // Leap-year-safe time spacing, not 365-day approximations.
        for (let i = 1; i < lines.length; i++) assert.ok(Number(lines[i].getAttribute('x1')) > Number(lines[i-1].getAttribute('x1')));
      }
    }
  } finally { await cleanup(); }
});
