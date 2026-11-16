import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
globalThis.React = React;
import * as imported from '../src/data/bci-bitrate.ts';
const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_FIT, BCI_BITRATE_ROWS } = imported.default ?? imported;
const trend = BCI_BITRATE_EVIDENCE.plots[0].referenceTrendline;
test('readers can directly open the exact data, assumptions and reconstruction from the chart', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: BCI_BITRATE_EVIDENCE.plots[0] })));
  try {
    const link = dom.window.document.querySelector('[data-fit-methodology]');
    assert.match(link?.href ?? '', /^https:\/\/github.com\/protocol\/neuro-atlas\/blob\/[0-9a-f]{40}\/docs\/bci-bitrate.md$/);
    assert.equal(link?.textContent, 'Data and fit code ↗');
  } finally { dom.window.close(); }
});
test('the visible and exported fitted-line key discloses log-space R² for the plotted observations', () => {
  assert.ok(trend.label.includes(`R²(log10) = ${BCI_BITRATE_FIT.rSquaredLog10.toFixed(3)}`), "Visible line key must disclose R²");
  assert.ok(trend.label.includes('9 text-equivalent points'));
  assert.ok(trend.note.includes(`R² in log10 space = ${BCI_BITRATE_FIT.rSquaredLog10.toFixed(6)}`));
  assert.match(trend.note, /equal.weight/i);
  assert.match(trend.note, /ordinary least squares/i);
});
test('the dependency-free reconstruction replays the exact CSV inputs and current fit', () => {
  const result = JSON.parse(execFileSync('python3', ['docs/bci-study-data/reproduce_fit.py'], { cwd: new URL('..', import.meta.url), encoding:'utf8' }));
  const plot = BCI_BITRATE_EVIDENCE.plots[0];
  const expected = plot.points.map(p => ({ id: p.id, year: p.x, bps: p.y, fitIncluded: BCI_BITRATE_ROWS.find(row => row.id === p.id).fitIncluded }));
  // Independent Python and JavaScript log2 may differ by one floating-point ULP.
  // Keep identity/year/selection exact and compare full-precision rates numerically.
  assert.deepEqual(result.observations.map(({ id, year, fitIncluded }) => [id, year, fitIncluded]).sort(), expected.map(({ id, year, fitIncluded }) => [id, year, fitIncluded]).sort());
  assert.deepEqual(result.fitObservations.map(({ id, year, fitIncluded }) => [id, year, fitIncluded]).sort(), expected.filter(p => p.fitIncluded).map(({ id, year, fitIncluded }) => [id, year, fitIncluded]).sort());
  for (const point of [...result.observations, ...result.fitObservations]) {
    assert.ok(Math.abs(point.bps - expected.find(p => p.id === point.id).bps) < 1e-12, point.id);
  }
  assert.equal(result.observations.length, 14);
  assert.equal(result.fitObservations.length, 9);
  for (const key of ['n','xOrigin','interceptLog10','slopeLog10PerX','rSquaredLog10']) assert.ok(Math.abs(result.fit[key] - BCI_BITRATE_FIT[key]) < 1e-12, key);
});
