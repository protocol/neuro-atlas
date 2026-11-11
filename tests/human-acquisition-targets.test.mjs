import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = '../src/lib/human-acquisition-targets.ts';
test('whole-human acquisition-budget guides use all three voxel dimensions and retain acquisition-only scope', async () => {
  assert.ok(existsSync(new URL(modulePath, import.meta.url)), 'Sourced scenario calculation is implemented');
  const { HUMAN_ACQUISITION_SCENARIO: scenario, humanAcquisitionTargets } = await import(modulePath);
  assert.equal(scenario.tissueVolumeCm3, 1200);
  assert.deepEqual(scenario.voxelNm, [4, 4, 40], 'Anisotropic sampling: the z dimension is 40 nm');
  const targets = humanAcquisitionTargets();
  assert.deepEqual(targets.map(t => t.budgetDollars), [1e9, 1e8, 1e7, 1e6, 1e5]);
  assert.deepEqual(targets.map(t => t.label), ['$1B', '$100M', '$10M', '$1M', '$100K']);
  for (const target of targets) {
    assert.equal(target.voxelCount, 1.875e21);
    assert.equal(target.dollarsPer10MVoxels, target.budgetDollars * 10_000_000 / (1200 * 1e21 / (4 * 4 * 40)));
    assert.equal(target.kind, 'hypothetical-acquisition-budget');
  }
  assert.match(scenario.volumeSource.url, /cell-reports-methods/);
  assert.match(scenario.voxelSource.url, /s41467-020-18659-3/);
  assert.match(scenario.scope, /one pass/i);
  assert.match(scenario.scope, /reconstruction.*proofreading/i);
});

import React from 'react';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';
globalThis.React = React;
const plot = METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];

test('optional target guides extend the log axis while off restores exact observed geometry and source rows', async () => {
  const before = JSON.stringify(plot);
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot, shareAnchor: 'metric-panel-acquisition-economics' }));
  try {
    const toggle = document.querySelector('input[type="checkbox"][data-human-acquisition-toggle]');
    assert.ok(toggle, 'Explicit optional human-budget scenario control');
    assert.equal(toggle.checked, false, 'Source-estimate-only default');
    assert.equal(document.querySelectorAll('[data-human-acquisition-target]').length, 0);
    const baselineSvg = document.querySelector('figure > svg').outerHTML;
    const baselineRows = document.querySelector('tbody').outerHTML;
    await click(toggle);
    assert.equal(toggle.checked, true);
    const guides = [...document.querySelectorAll('[data-human-acquisition-target]')];
    assert.deepEqual(guides.map(g => g.querySelector('text').textContent), ['$1B', '$100M', '$10M', '$1M', '$100K']);
    for (const g of guides) {
      const line = g.querySelector('line');
      assert.equal(line.getAttribute('y1'), line.getAttribute('y2'));
      assert.equal(line.getAttribute('stroke-dasharray'), '8 5');
      assert.ok(Number(line.getAttribute('x2')) > Number(line.getAttribute('x1')));
    }
    assert.match(document.querySelector('[data-human-acquisition-assumptions]').textContent, /1,200 cm³.*4 × 4 × 40 nm.*anisotropic/);
    assert.match(document.querySelector('figure').textContent, /1\.875.*10²¹/);
    assert.match(document.querySelector('[data-human-acquisition-method]').textContent, /10²¹.*4 × 4 × 40/);
    assert.ok(document.querySelector('[data-human-acquisition-method] a[href*="s41467-020-18659-3"]'));
    assert.ok(document.querySelector('[data-human-acquisition-method] a[href*="cell-reports-methods"]'));
    const marks = [...document.querySelectorAll('[data-source-observation]')];
    assert.deepEqual(marks.map(n => n.dataset.sourceObservation), plot.points.map(p => p.id));
    const guideY = Number(guides.at(-1).querySelector('line').getAttribute('y1'));
    assert.ok(guideY > Math.max(...marks.map(n => Number(n.getAttribute('cy')))), 'Axis includes smaller target costs below every existing source point');
    assert.equal(document.querySelector('tbody').outerHTML, baselineRows);
    assert.equal(JSON.stringify(plot), before);
    await click(toggle);
    assert.equal(document.querySelector('figure > svg').outerHTML, baselineSvg, 'No off-state geometry or metadata changes');
    assert.equal(document.querySelector('tbody').outerHTML, baselineRows);
  } finally { await cleanup(); }
});


test('Download PNG snapshots selected target lines with visible hypothetical geometry and source-qualified evidence', async () => {
  const snapshots = [], create = URL.createObjectURL;
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot, shareAnchor: 'metric-panel-acquisition-economics' }));
  try {
    URL.createObjectURL = blob => { snapshots.push(blob); return 'blob:human-target-test'; };
    await click(document.querySelector('[data-human-acquisition-toggle]'));
    await click(document.querySelector('[data-download-chart]'));
    assert.equal(snapshots.length, 1);
    const image = await snapshots[0].text();
    const exported = new window.DOMParser().parseFromString(image, 'image/svg+xml');
    assert.equal(exported.querySelector('parsererror'), null);
    const svg = exported.querySelector('svg svg');
    assert.equal(svg.querySelectorAll('line[stroke-dasharray="8 5"]').length, 5, 'Five dashed horizontal guides survive the export sanitizer');
    const visible = [...svg.querySelectorAll('text')].map(n => n.textContent).join(' ');
    assert.match(visible, /hypothetical/);
    assert.match(visible, /1,200 cm³.*4 × 4 × 40 nm.*anisotropic/);
    const evidence = exported.querySelector('svg > desc').textContent;
    assert.match(evidence, /Hypothetical whole-human acquisition budgets/);
    assert.match(evidence, /s41467-020-18659-3/);
    assert.match(evidence, /cell-reports-methods/);
    assert.match(evidence, /reconstruction.*proofreading/);
    assert.doesNotMatch(image, /NaN|Infinity|var\(/);
    assert.equal(svg.querySelectorAll('[data-source-observation]').length, plot.points.length);
    await click(document.querySelector('[data-human-acquisition-toggle]'));
    await click(document.querySelector('[data-download-chart]'));
    const off = await snapshots[1].text();
    assert.doesNotMatch(off, /data-human-acquisition-target=|Hypothetical whole-human acquisition budgets/);
  } finally { URL.createObjectURL = create; await cleanup(); }
});
