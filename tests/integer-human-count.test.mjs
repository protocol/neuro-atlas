import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
const raw = JSON.parse(readFileSync(new URL('../src/data/draft-chart-evidence.json', import.meta.url), 'utf8'));
const humans = raw['Humans with implanted high-bandwidth BCIs over time'].plots;
function render(plot) {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  const ticks = [...dom.window.document.querySelectorAll('.draft-plot-svg > g > .draft-plot-tick')].map(e => Number(e.textContent.replaceAll(',', '')));
  return { dom, ticks };
}
for (const plot of humans) test(`${plot.id}: human-count y-axis labels are distinct whole integers enclosing all observations`, () => {
  const { dom, ticks } = render(plot);
  try {
    assert.ok(ticks.length >= 2);
    assert.ok(ticks.every(Number.isInteger), `Fractional people on axis: ${ticks}`);
    assert.equal(new Set(ticks).size, ticks.length);
    assert.equal(ticks[0], 0);
    assert.ok(ticks.at(-1) >= Math.max(...plot.points.map(p => p.y)));
    for (const p of plot.points) {
      const mark = dom.window.document.querySelector(`[data-source-observation="${p.id}"]`);
      assert.ok(mark, p.id);
      assert.ok(mark.getAttribute('aria-label').includes(String(p.y)), 'Observation unchanged');
    }
  } finally { dom.window.close(); }
});

for (const count of [0, 1, 2, 21, 50]) test(`count fixture ${count}: finite nonduplicated integer ticks and unchanged source value`, () => {
  const plot = { ...humans[0], integerTicks: true, points: [{ ...humans[0].points[0], y: count }] };
  const { dom, ticks } = render(plot);
  try {
    assert.ok(ticks.every(n => Number.isFinite(n) && Number.isInteger(n)));
    assert.equal(ticks[0], 0);
    assert.equal(new Set(ticks).size, ticks.length);
    assert.ok(ticks.at(-1) >= count);
    assert.ok(!dom.window.document.querySelector('svg').outerHTML.includes('NaN'));
  } finally { dom.window.close(); }
});
test('unflagged continuous measurements retain fractional ticks', () => {
  const plot = { ...humans[0], integerTicks: undefined, points: [{ ...humans[0].points[0], y: 1 }] };
  const { dom, ticks } = render(plot);
  try { assert.deepEqual(ticks, [0, 0.25, 0.5, 0.75, 1]); }
  finally { dom.window.close(); }
});
