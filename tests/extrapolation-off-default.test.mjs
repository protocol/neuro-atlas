import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { mount, click } from './modal-helpers.mjs';

const milestones = JSON.parse(readFileSync('src/data/milestones.json', 'utf8'));

test('Milestones plots sourced cumulative capital only, scaled to observations in every year and scope', async () => {
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    for (const scope of ['all', 'bci']) {
      await click([...document.querySelectorAll('button')].find(button => button.textContent.startsWith(scope === 'all' ? 'All neurotech' : 'BCI only')));
      for (const year of [2026, 2025, 2024]) {
        const focus = document.querySelector(`button[aria-label^="Focus ${year}:"]`);
        if (focus) await click(focus);
        const plot = document.querySelector(`.milestone-year-scroll[aria-label^="${year} timeline"]`);
        assert.ok(plot, `${scope} ${year} is focused`);
        const svg = plot.querySelector('svg[width="100%"]');
        assert.ok(svg, 'Historical capital remains plotted');
        assert.equal(svg.querySelectorAll('polyline').length, 1, 'No automatic year-end extrapolation');
        const line = svg.querySelector('polyline');
        assert.equal(line.hasAttribute('stroke-dasharray'), false);
        const actual = line.getAttribute('points').split(' ').map(point => point.split(',').map(Number));
        const rows = milestones.filter(m => m.stage === 'capital' && m.amountUsdM && m.date && Number(m.date.slice(0, 4)) === year && (scope === 'all' || m.scope === 'bci')).sort((a, b) => a.date.localeCompare(b.date));
        assert.equal(actual.length, rows.length + 1, 'One point per source record plus origin');
        const total = rows.reduce((sum, m) => sum + m.amountUsdM, 0);
        const height = Number(svg.getAttribute('height'));
        const t0 = Date.UTC(year, 0, 1), t1 = Date.UTC(year, 11, 31);
        let cumulative = 0;
        rows.forEach((row, index) => {
          cumulative += row.amountUsdM;
          const x = Math.min(1, Math.max(0, (Date.parse(row.date + 'T00:00:00Z') - t0) / (t1 - t0))) * 100;
          const y = height - 5 - cumulative / (total || 1) * (height - 12);
          assert.deepEqual(actual[index + 1], [Number(x.toFixed(2)), Number(y.toFixed(2))], `${scope} ${year}: source-backed position`);
        });
        assert.equal(actual.at(-1)[1], 7, 'Scale ends at the sourced total rather than a projected year-end value');
      }
    }
  } finally { await cleanup(); }
});

const snapshot = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
const data = selectPerformance(snapshot);
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
for (const id of ['simultaneously-recorded-neurons', 'neural-recording-hours']) {
  test(`${id} starts and reopens with extrapolation Off`, async () => {
    const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#' + id, window => {
      window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    });
    try {
      const checkOff = () => {
        assert.equal(document.querySelector('dialog[open] [role="switch"]').getAttribute('aria-checked'), 'false');
        assert.equal(document.querySelector('[data-extrapolation-line], [data-target-line], [data-extrapolation-summary]'), null);
      };
      checkOff();
      await click(document.querySelector('dialog[open] [role="switch"]'));
      assert.ok(document.querySelector('[data-extrapolation-line]'), 'Optional explicit opt-in still works');
      await click(document.querySelector('.pc-modal-header button'));
      await click(document.querySelector(`[data-performance-card="${id}"] .pc-trigger`));
      checkOff();
    } finally { await cleanup(); }
  });
}
