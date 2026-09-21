import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
// Synthetic renderer inputs only; never published as production observations.
export const plot = {
  id: 'fixture-neurons', title: 'Synthetic neuron observations',
  xLabel: 'Publication year', yLabel: 'Neurons', scale: 'log',
  scope: 'Synthetic fixture — independent specimens, not a global total.',
  seriesNote: 'Publication date is not acquisition date.',
  points: [
    { id: 'a', x: 2000, y: 100, label: 'Fixture A', sourceUrl: 'https://example.org/a', sourceTitle: 'Fixture source A', quote: 'At least 100 neurons.', dateLabel: '2000 publication', qualifier: '≥', note: 'Partial specimen.' },
    { id: 'b', x: 2010, y: 1000, label: 'Fixture B', sourceUrl: 'https://example.org/b', sourceTitle: 'Fixture source B', quote: 'Approximately 1000 neurons.', dateLabel: '2010 publication', qualifier: '≈' },
    { id: 'c', x: 2020, y: 10000, label: 'Fixture C', sourceUrl: 'https://example.org/c', sourceTitle: 'Fixture source C', quote: 'More than 10000 neurons.', dateLabel: '2020 release', qualifier: '>' },
  ],
};

test('keyboard focus and hover reveal exact qualified values, date, scope and source without relying on color', async () => {
  const DraftChartPlot = await renderer();
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    const point = document.querySelector('[data-source-observation="a"]');
    assert.equal(point.getAttribute('tabindex'), '0', 'Every observation is keyboard reachable');
    await act(async () => point.focus());
    let tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(tooltip);
    for (const text of ['Fixture A', '2000 publication', '≥100', 'Fixture source A', 'Partial specimen.']) assert.ok(tooltip.textContent.includes(text), text);
    assert.equal(tooltip.querySelector('a').href, plot.points[0].sourceUrl);
    assert.equal(point.getAttribute('aria-describedby'), tooltip.id);
    await act(async () => point.blur());
    await act(async () => document.querySelector('[data-source-observation="b"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(tooltip.textContent.includes('≈1,000'));
    await act(async () => document.querySelector('[data-source-observation="c"]').focus());
    assert.ok(document.querySelector('[role="tooltip"]').textContent.includes('>10,000'));
  } finally { await cleanup(); }
});

test('a persistent disclosure exposes every exact value, original quote, scope and date note with source links', async () => {
  const DraftChartPlot = await renderer();
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    const details = dom.window.document.querySelector('details');
    assert.ok(details, 'Data table exists without first interacting with the chart');
    assert.match(details.querySelector('summary').textContent, /Data and sources \(3\)/);
    const table = details.querySelector('table');
    assert.ok(table.querySelector('caption').textContent.includes(plot.title));
    const rows = [...table.querySelectorAll('tbody tr')];
    assert.equal(rows.length, plot.points.length);
    for (const [index, point] of plot.points.entries()) {
      assert.ok(rows[index].textContent.includes(point.dateLabel));
      assert.ok(rows[index].textContent.includes(point.quote));
      assert.ok(rows[index].textContent.includes(point.qualifier));
      assert.equal(rows[index].querySelector('a').href, point.sourceUrl);
    }
    assert.ok(details.textContent.includes(plot.scope));
    assert.ok(details.textContent.includes(plot.seriesNote));
    assert.ok(details.textContent.includes(plot.points[0].note));
  } finally { dom.window.close(); }
});

test('resizes the SVG coordinate space for narrow cards rather than shrinking its labels', async () => {
  const DraftChartPlot = await renderer();
  let resize;
  let disconnected = false;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    assert.equal(typeof resize, 'function', 'Observe the actual card width');
    await act(async () => resize([{ contentRect: { width: 280 } }]));
    const svg = document.querySelector('svg');
    assert.equal(Number(svg.getAttribute('viewBox').split(' ')[2]), 280);
    assert.ok(Number(svg.getAttribute('viewBox').split(' ')[3]) >= 300);
    for (const point of svg.querySelectorAll('[data-source-observation]')) {
      assert.ok(Number(point.getAttribute('cx')) > 0 && Number(point.getAttribute('cx')) < 280);
    }
  } finally {
    await cleanup();
    delete globalThis.ResizeObserver;
  }
  assert.equal(disconnected, true);
});

test('fractional dates use integer calendar ticks and date labels; long axes wrap and extreme ticks stay exact and compact', async () => {
  const DraftChartPlot = await renderer();
  const fractional = { ...plot, yLabel: 'Source-reported reconstructed tissue volume (cm³)', points: [
    { ...plot.points[0], x: 2023.5782, y: 0.0000001, dateLabel: '2023-07-31 publication' },
    { ...plot.points[1], x: 2025.321, y: 1000000000000 },
  ] };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: fractional })));
  try {
    const svg = dom.window.document.querySelector('svg');
    const ticks = [...svg.querySelectorAll('.draft-plot-tick')].map(node => node.textContent);
    assert.ok(ticks.includes('2023') && ticks.includes('2026'), 'Calendar bounds are integer years');
    assert.ok(ticks.every(tick => tick.length <= 12), 'Compact exact scientific notation for extreme numeric ticks');
    assert.ok(ticks.length <= 12, 'Log labels are not crowded across many decades');
    assert.ok(svg.querySelector('.draft-plot-axis-title tspan'), 'Axis titles can wrap without clipping');
    assert.doesNotMatch(svg.textContent, /2023\.5782|2025\.321/);
  } finally { dom.window.close(); }
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: fractional }));
  try {
    await act(async () => document.querySelector('[data-source-observation]').focus());
    assert.doesNotMatch(document.querySelector('[role="tooltip"]').textContent, /2023\.5782/);
    assert.match(document.querySelector('[role="tooltip"]').textContent, /2023-07-31 publication/);
  } finally { await cleanup(); }
});

test('separate scope groups have a visible legend, distinct markers and accessible point identity', async () => {
  const DraftChartPlot = await renderer();
  const grouped = { ...plot, points: plot.points.map((point, index) => ({ ...point, group: index ? 'Whole specimen' : 'Partial specimen' })) };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: grouped }));
  try {
    const legend = document.querySelector('[data-draft-group-legend]');
    assert.ok(legend, 'Visible scope group legend');
    assert.match(legend.textContent, /Whole specimen/);
    assert.match(legend.textContent, /Partial specimen/);
    const points = document.querySelectorAll('[data-source-observation]');
    assert.notEqual(points[0].getAttribute('fill'), points[1].getAttribute('fill'));
    assert.match(points[0].getAttribute('aria-label'), /Partial specimen/);
    await act(async () => points[1].focus());
    assert.match(document.querySelector('[role="tooltip"]').textContent, /Whole specimen/);
    assert.match(document.querySelector('table').textContent, /Whole specimen/);
  } finally { await cleanup(); }
});

test('applications use a date-positioned categorical event timeline with full sources, never a numeric impact score', async () => {
  const module = await import('../src/components/draft-chart-plot.tsx');
  assert.equal(typeof module.DraftEventTimeline, 'function', 'Event timeline renderer exists');
  const timeline = { scope: 'Synthetic bounded research events, not clinical outcomes.', events: [
    { id: 'event-a', year: 2023, dateLabel: '2023 demonstration', label: 'Fixture classification', stage: 'Research demonstration', sourceUrl: 'https://example.org/event-a', sourceTitle: 'Fixture source A', quote: 'A research demonstration.', note: 'Not a deployed therapy.' },
    { id: 'event-b', year: 2024, dateLabel: '2024 validation', label: 'Fixture validation', stage: 'Biological validation', sourceUrl: 'https://example.org/event-b', sourceTitle: 'Fixture source B', quote: 'A held-out validation.', note: 'Selected example only.' },
  ] };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(module.DraftEventTimeline, { timeline })));
  try {
    const document = dom.window.document;
    const svg = document.querySelector('svg[data-draft-event-timeline]');
    assert.ok(svg);
    const points = [...svg.querySelectorAll('[data-source-event]')];
    assert.equal(points.length, 2);
    assert.ok(Number(points[0].getAttribute('cx')) < Number(points[1].getAttribute('cx')));
    for (const event of timeline.events) {
      assert.ok(svg.textContent.includes(event.stage));
      const row = document.querySelector(`[data-draft-event="${event.id}"]`);
      for (const value of [event.label, event.dateLabel, event.quote, event.note]) assert.ok(row.textContent.includes(value));
      assert.equal(row.querySelector('a').href, event.sourceUrl);
      assert.equal(row.closest('details'), null, 'The full source event list is always visible');
    }
    assert.match(document.body.textContent, /not.*(?:score|rank)/i);
    assert.equal(svg.querySelectorAll('polyline').length, 0);
  } finally { dom.window.close(); }
});

test('numeric axis ticks discard floating-point noise without changing source values', async () => {
  const DraftChartPlot = await renderer();
  const numeric = { ...plot, xKind: 'number', scale: 'linear', points: [
    { ...plot.points[0], x: 1.13, y: 72.28 },
    { ...plot.points[1], x: 41.77, y: 80.8 },
  ] };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: numeric })));
  try {
    const ticks = [...dom.window.document.querySelectorAll('.draft-plot-tick')].map(e => e.textContent);
    assert.ok(ticks.includes('21.45'), JSON.stringify(ticks));
    assert.ok(ticks.every(label => label.length <= 12));
    assert.match(dom.window.document.querySelector('table').textContent, /41\.77/);
  } finally { dom.window.close(); }
});

async function renderer() {
  const module = await import('../src/components/draft-chart-plot.tsx').catch(() => null);
  assert.equal(typeof module?.DraftChartPlot, 'function', 'Source-backed DraftChartPlot renderer exists');
  return module.DraftChartPlot;
}

test('renders real log scatter coordinates with exact numeric ticks and labeled axes, not a connecting trend', async () => {
  const DraftChartPlot = await renderer();
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    const svg = dom.window.document.querySelector('svg');
    assert.ok(svg, 'A real SVG plot, not only a proposed definition');
    assert.equal(svg.querySelectorAll('[data-source-observation]').length, 3);
    const points = [...svg.querySelectorAll('[data-source-observation]')];
    const ys = points.map(point => Number(point.getAttribute('cy')));
    assert.ok(ys[0] > ys[1] && ys[1] > ys[2]);
    assert.ok(Math.abs((ys[0] - ys[1]) - (ys[1] - ys[2])) < 0.001, 'Each log decade has equal distance');
    for (const label of ['Publication year', 'Neurons', '100', '1,000', '10,000', '2000', '2020']) {
      assert.ok([...svg.querySelectorAll('text')].some(text => text.textContent === label), `Visible axis/tick: ${label}`);
    }
    assert.equal(svg.querySelectorAll('polyline, path[data-series-line]').length, 0);
    assert.match(dom.window.document.body.textContent, /Log scale/);
    assert.match(dom.window.document.body.textContent, /independent specimens/);
  } finally { dom.window.close(); }
});
