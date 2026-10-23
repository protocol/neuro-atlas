import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { mount } from './modal-helpers.mjs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
// Synthetic numeric edge cases, not production cost observations.
const plotFor = values => ({
  id: 'precision-fixture', title: 'Synthetic precision fixture',
  xKind: 'number', xLabel: 'Fixture input', yLabel: 'Fixture reciprocal output',
  scale: 'log', scope: 'Synthetic renderer test only.',
  points: values.map((value, index) => ({
    id: `value-${index}`, x: -value, y: value, label: `Fixture ${index}`, qualifier: '≈',
    dateLabel: 'Synthetic date', sourceUrl: `https://example.org/precision-${index}`,
    sourceTitle: `Fixture source ${index}`, quote: 'Synthetic precision test.',
  })),
});
const parseDisplayed = value => Number(value.replaceAll(',', ''));

test('tiny reciprocal values round-trip exactly through source table and accessible observation labels', () => {
  const plot = plotFor([5e-11, 1 / 3e10, 1.2345678901234568e-12, 5e-21]);
  const before = JSON.stringify(plot);
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    const document = dom.window.document;
    const rows = [...document.querySelectorAll('tbody tr')];
    for (const [index, point] of plot.points.entries()) {
      const cells = rows[index].querySelectorAll('td');
      const x = cells[0].firstChild.textContent;
      const qualifiedY = cells[1].textContent;
      assert.equal(parseDisplayed(x), point.x, `Do not round source x=${point.x}`);
      assert.equal(qualifiedY[0], '≈');
      assert.equal(parseDisplayed(qualifiedY.slice(1)), point.y, `Do not round source y=${point.y}`);
      assert.ok(document.querySelector(`[data-source-observation="${point.id}"]`).getAttribute('aria-label').includes(qualifiedY));
    }
    const yTicks = [...document.querySelectorAll('.draft-plot-gridline')].map(line => line.nextElementSibling.textContent);
    assert.ok(yTicks.every(label => label.length <= 12 && parseDisplayed(label) > 0), 'Tiny positive log ticks never collapse to zero');
    assert.equal(JSON.stringify(plot), before);
  } finally { dom.window.close(); }
});

test('the inspector retains the same exact tiny source values as the table', async () => {
  const plot = plotFor([1 / 3e10]);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    await act(async () => document.querySelector('[data-source-observation]').focus());
    const tooltip = document.querySelector('[role="tooltip"]');
    const qualifiedY = tooltip.querySelector('p strong').textContent;
    assert.equal(parseDisplayed(qualifiedY.slice(1)), plot.points[0].y);
    assert.equal(qualifiedY, document.querySelector('tbody tr td:nth-of-type(2)').textContent);
    assert.equal(tooltip.querySelector('a').href, plot.points[0].sourceUrl);
  } finally { await cleanup(); }
});

test('ordinary source values keep existing readable comma and decimal formatting', () => {
  const plot = plotFor([1000, 72.28, 41.77, 0.0000001, 5e-11]);
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    const values = [...dom.window.document.querySelectorAll('tbody tr td:nth-of-type(2)')].map(cell => cell.textContent);
    assert.deepEqual(values, ['≈1,000', '≈72.28', '≈41.77', '≈0.0000001', '≈0.00000000005']);
  } finally { dom.window.close(); }
});
