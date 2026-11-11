import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
globalThis.React = React;
const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots);

for (const id of ['acquisition-economics', 'proofreading-effort']) test(`${id} exposes scoped reconstruction estimates and observed proofreading evidence without inventing a cost series`, () => {
  const plot = plots.find(p => p.id === id), before = JSON.stringify(plot);
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    const doc = dom.window.document, note = doc.querySelector('[data-connectomics-cost-evidence]');
    assert.ok(note, 'Public research status lives beside an existing populated plot');
    assert.match(note.textContent, /Reconstruction and proofreading cost evidence/);
    assert.match(note.textContent, /matched-scope.*dollar|dollar.*matched-scope/i);
    const rows = [...note.querySelectorAll('[data-reconstruction-compute-cost]')];
    assert.deepEqual(rows.map(r => [r.cells[0].textContent, Number(r.dataset.reconstructionComputeCost)]), [
      ['FFN', 3903.572290653618], ['Motta et al. 2019', 1199.4311111111112], ['LSD', 265.81487564871304], ['RoboEM correction', 49.362962962963003],
    ]);
    assert.match(note.textContent, /EUR\/m|€\/m/);
    assert.match(note.textContent, /correction.only/i);
    assert.match(note.textContent, /1 USD ≈ 1 EUR/);
    assert.match(note.textContent, /3,740.*overlap|overlap.*3,740/);
    assert.match(note.textContent, /2,451.*36,447/);
    assert.match(note.textContent, /1,433.*84,035/);
    assert.match(note.textContent, /varying.*extension/i);
    for (const fragment of ['57443', '07558', '08790', '500521v2', '02226', 'MOESM5_ESM.xlsx', 'MOESM1_ESM.pdf']) {
      assert.ok([...note.querySelectorAll('a')].some(a => a.href.includes(fragment)), fragment);
    }
    assert.equal(doc.querySelectorAll('svg').length, 1, 'No empty or fabricated new metric card');
    assert.deepEqual([...doc.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation), plot.points.map(p => p.id));
    assert.equal(JSON.stringify(plot), before, 'Archived plotted evidence stays exact');
  } finally { dom.window.close(); }
  const preview = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview: true })));
  assert.equal(preview.window.document.querySelector('[data-connectomics-cost-evidence]'), null);
  preview.window.close();
});
