import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MilestoneSourceContext } from '../src/components/milestone-source-context.tsx';
import { mount } from './modal-helpers.mjs';
import { generatorFixture, milestoneFixture } from './helpers/capital-treatment-generator.mjs';

const require = createRequire(import.meta.url);
const canonical = require('../src/data/milestones.json');
globalThis.React = React;
const treatments = ['overlap-unresolved', 'superseded', 'scope-unresolved'];
const reasons = ['financing overlap unresolved', 'superseded disclosure', 'financing scope unresolved'];
const source = (company, date, amount, activity, capital_treatment = '') => milestoneFixture({
  company, date, amount_usd_m: amount, activity, capital_treatment,
  source_url: `https://source.example/${company.toLowerCase().replaceAll(' ', '-')}`,
  note: `Source explanation for ${company}.`,
});
const inputs = [
  source('Current financing', '2026-01-10', '10', '$10m'),
  ...treatments.map((status, i) => source(`Held ${status}`, `2026-0${i + 2}-10`, '20', '$20m preliminary', status)),
  source('Disclosed commitment', '2026-05-10', '20', '$20m committed'),
  source('Later financing', '2026-06-10', '30', '$30m'),
  source('Standalone award', '2026-07-10', '40', 'award'),
  source('Native financing', '2026-08-10', '', 'Series B'),
  source('Prior financing', '2025-01-10', '10', '$10m'),
  ...treatments.map((status, i) => source(`Prior ${status}`, `2025-0${i + 2}-10`, '20', '$20m preliminary', status)),
];

async function renderTimeline(t, sources = inputs) {
  const result = generatorFixture(t)(sources);
  assert.equal(result.status, 0, result.stderr);
  const original = canonical.splice(0, canonical.length, ...result.milestones);
  const { MilestoneTimeline } = await import('../src/components/milestone-timeline.tsx');
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  t.after(async () => {
    await cleanup();
    canonical.splice(0, canonical.length, ...original);
  });
  return result.milestones;
}

function capitalSummary() {
  return [...document.querySelectorAll('aside .space-y-3 > div')]
    .find(row => row.querySelector('span.text-\\[12px\\]')?.textContent === 'Capital');
}

test('held milestone amounts stay out of annual and selected-period financing while their records remain', async t => {
  await renderTimeline(t);
  const summary = capitalSummary();
  assert.equal(summary.querySelector('.tnum').textContent, '$60m', 'Only sourced additive financing and the labeled commitment contribute');
  assert.equal(summary.lastElementChild.textContent, '7 financing records · 1 award');
  assert.equal(document.querySelector('button[aria-label^="Focus 2025:"]').getAttribute('aria-label'), 'Focus 2025: $10m financing');
  const annual = [...document.querySelectorAll('aside button')]
    .find(button => button.querySelector('span.tnum > span')?.textContent === '2025');
  assert.equal(annual.querySelector('span.tnum').lastElementChild.textContent, '$10m');
  for (const treatment of treatments) {
    assert.equal(document.querySelectorAll(`a[aria-label="Held ${treatment} — $20m preliminary"]`).length, 1);
  }
});


test('the cumulative financing line advances only for additive disclosures and supported commitments', async t => {
  await renderTimeline(t);
  const line = document.querySelector('.milestone-year-scroll polyline');
  const points = line.getAttribute('points').split(' ');
  assert.equal(points.length, 4, 'Baseline plus three additive financing disclosures; held markers stay off the capital line');
  const [baseline, first, committed, last] = points.map(point => Number(point.split(',')[1]));
  assert.ok(Math.abs((baseline - first) / (baseline - last) - 1 / 6) < 0.001);
  assert.ok(Math.abs((baseline - committed) / (baseline - last) - 1 / 2) < 0.001);
});


test('held milestone tooltips and source context retain disclosed activity and name the actual exclusion reason', async t => {
  const rows = await renderTimeline(t);
  for (const [i, treatment] of treatments.entries()) {
    const row = rows.find(row => row.company === `Held ${treatment}`);
    const marker = document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`);
    assert.equal(marker.getAttribute('href'), row.sourceUrl);
    await act(async () => marker.focus());
    const tooltip = document.querySelector('[data-milestone-detail]');
    assert.ok(tooltip.textContent.includes(row.activity), 'Preserve the original disclosed activity');
    assert.ok(tooltip.textContent.includes('Disclosed amount · $20m'));
    assert.ok(tooltip.textContent.includes(`Excluded from financing totals — ${reasons[i]}`), treatment);
    assert.ok(tooltip.textContent.includes(row.note));
    assert.ok(tooltip.textContent.includes('Announced'));
    assert.equal(marker.getAttribute('aria-describedby'), tooltip.id);
    const html = renderToStaticMarkup(React.createElement(MilestoneSourceContext, { source: row.sourceUrl }));
    assert.ok(html.includes(row.activity));
    assert.ok(html.includes('Disclosed amount · $20M'));
    assert.ok(html.includes(`Excluded from financing totals — ${reasons[i]}`));
    assert.ok(html.includes(row.note));
    assert.ok(html.includes(row.sourceUrl));
  }
});


test('unconverted held milestones keep their original activity with no invented USD amount', async t => {
  const rows = await renderTimeline(t, inputs.map(row => row.company === 'Native financing' ? { ...row, capital_treatment: 'scope-unresolved' } : row));
  const row = rows.find(row => row.company === 'Native financing');
  const marker = document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`);
  await act(async () => marker.focus());
  const tooltip = document.querySelector('[data-milestone-detail]');
  assert.ok(tooltip.textContent.includes('Series B'));
  assert.ok(tooltip.textContent.includes('Excluded from financing totals — financing scope unresolved'));
  assert.equal(tooltip.textContent.includes('Disclosed amount'), false);
  assert.equal(capitalSummary().querySelector('.tnum').textContent, '$60m');
  const html = renderToStaticMarkup(React.createElement(MilestoneSourceContext, { source: row.sourceUrl }));
  assert.ok(html.includes('Series B'));
  assert.ok(html.includes('Excluded from financing totals — financing scope unresolved'));
  assert.equal(html.includes('Disclosed amount'), false);
});
