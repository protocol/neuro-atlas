import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { mount, click, settle } from './modal-helpers.mjs';
import { navigatePerformance } from '../src/lib/field-velocity/navigation.ts';
globalThis.React = React;
const retired = ['gauss-section-rejection', 'microns-section-loss', 'precision-temporary-recording', 'paired-auto', 'comparative-specimens'];
const retiredPoints = Object.values(DRAFT_CHART_EVIDENCE).flatMap(e => e.plots).filter(p => retired.includes(p.id)).flatMap(p => p.points.map(q => q.id));

test('retired panels are unmounted, with every other source observation retained exactly once', async () => {
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }));
  try {
    await click(document.querySelector('[data-expand-metrics]'));
    for (const id of retiredPoints) assert.equal(!!document.querySelector(`[data-source-observation="${id}"]`), false, id);
    const expected = Object.values(DRAFT_CHART_EVIDENCE).flatMap(e => e.plots).filter(p => !retired.includes(p.id)).flatMap(p => p.points.map(q => q.id)).sort();
    assert.deepEqual([...document.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation).sort(), expected);
    assert.equal(expected.length, 77);
    assert.equal(document.querySelectorAll('[data-draft-chart-card]').length, 15);
    assert.equal(document.querySelectorAll('svg.draft-plot-svg').length, 15); // 14 numeric + timeline
    assert.equal(document.querySelector('[data-metric-toggle="Tissue quality and annotation"]'), null);
    assert.doesNotMatch(document.body.textContent, /No plotted observations yet|Section rejection and loss|comparative cohorts/i);
    assert.equal(document.querySelectorAll('[data-source-observation^="roboem-"]').length, 12);
    assert.ok(document.getElementById('draft-panel-paired-manual'), 'Legacy panel anchor remains addressable');
    await click(document.querySelector('[data-draft-popout-trigger="metric-panel-paired-manual"]'));
    const detail = document.querySelector('dialog[open] .draft-popout-detail');
    assert.ok(detail, 'the retained paired-data chart opens real detail');
    assert.match(detail.textContent, /37,364 at 83% precision/);
    const paired = DRAFT_CHART_EVIDENCE['Paired structure–function dataset scale over time'].plots.find(plot => plot.id === 'paired-manual');
    assert.deepEqual([...detail.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation), paired.points.map(point => point.id));
    for (const point of paired.points) assert.ok(detail.textContent.includes(point.note), `${point.id}: source qualifier retained`);
  } finally { await cleanup(); }
});

const visible = selector => [...document.querySelectorAll(selector)].filter(n => !n.closest('[hidden]'));
async function search(value) {
  const input = document.querySelector('#metrics-search');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
test('search and category inventories describe only the retained panels without counts in expansion copy', async () => {
  const Page = FieldVelocityPage.default ?? FieldVelocityPage;
  const cleanup = await mount(React.createElement(Page));
  try {
    for (const term of ['GAUSS-EM', 'MICrONS selected-region section loss', 'Precision · temporary', 'Comparative connectomics cohort size']) {
      await search(term);
      assert.equal(visible('[data-metric-toggle]').length, 0, term);
      assert.match(document.querySelector('[role=status]').textContent, /No metrics match/);
    }
    await click(document.querySelector('[data-clear-metrics]'));
    assert.deepEqual([...document.querySelectorAll('[data-metric-more]')].map(button => button.textContent), Array(5).fill('show more charts'));
    await click(document.querySelector('[data-expand-metrics]'));
    const counts = [...document.querySelectorAll('[data-metrics-category]')].map(category => [category.dataset.metricsCategory,
      category.querySelectorAll('[data-draft-popout], [data-trends-card], [data-performance-card]').length]);
    assert.deepEqual(counts, [
      ['Neurotech field engagement', 4], ['Human interfaces and recordings', 3],
      ['Mapping Scale', 6], ['Cost and automation', 4], ['Simulation and NeuroAI', 3],
    ], 'Pin actual chart inventory independently of the now-count-free buttons');
    assert.equal(document.querySelectorAll('[data-metric-reading="revealed_commitments"]').length, 1, 'Keep the historical scalar distinct from chart counts');
    assert.doesNotMatch(document.querySelector('.metrics-index > [role=status]')?.textContent ?? '', /5 groups|featured chart/);
    assert.equal(document.querySelector('[data-metric-toggle] small'), null, 'No redundant header count/badge');
  } finally { await cleanup(); }
});

for (const anchor of ['sectioning-loss', 'tissue-preservation', 'molecular-annotation', 'comparative-cohorts', ...retired.map(id => `panel-${id}`)]) {
  for (const prefix of ['draft', 'metric']) {
    test(`${prefix}-${anchor} resolves without resurrecting retired content`, async () => {
      const scrolled = [];
      const id = `${prefix}-${anchor}`;
      const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }), `#${id}`, win => {
        win.HTMLElement.prototype.scrollIntoView = function() { scrolled.push(this.id); };
      });
      try {
        await settle(); await settle();
        const target = document.getElementById(id);
        assert.ok(target);
        assert.ok(target.hasAttribute('data-retired-metric-anchor'));
        assert.equal(target.closest('[hidden]'), null);
        assert.equal(target.closest('[data-draft-chart-card]'), null);
        assert.ok(scrolled.includes(id));
        await search('unmatched');
        await act(async () => navigatePerformance(id));
        await settle(); await settle();
        assert.equal(document.querySelector('#metrics-search').value, '');
        assert.equal(target.closest('[hidden]'), null);
        for (const point of retiredPoints) assert.equal(!!document.querySelector(`[data-source-observation="${point}"]`), false);
        await act(async () => navigatePerformance('metric-panel-tissue-cm3'));
        await act(async () => window.history.back());
        await settle(); await settle();
        assert.equal(window.location.hash, `#${id}`);
      } finally { await cleanup(); }
    });
  }
}
