import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { mount, click } from './modal-helpers.mjs';

const require = createRequire(import.meta.url);
const milestones = require('../src/data/milestones.json');
globalThis.React = React;

const annualAtm = () => {
  const record = milestones.find(row => row.company === 'NeuroPace' && row.datePrecision === 'year' && row.activity === '$3.4m annual ATM');
  assert.ok(record, 'Exercise the real source-backed annual ATM disclosure');
  assert.equal(record.amountUsdM, 3.4);
  assert.equal(record.date, '2024-01-01');
  assert.equal(record.dateBasis, 'event');
  assert.equal(record.sourceUrl, 'https://www.sec.gov/Archives/edgar/data/1528287/000152828726000011/npce-20251231.htm');
  assert.match(record.note, /during 2024/);
  assert.match(record.note, /individual sale dates are undisclosed/);
  return record;
};
const markerFor = record => [...document.querySelectorAll('a[aria-label]')]
  .find(anchor => anchor.getAttribute('aria-label') === `${record.company} — ${record.activity}`);

test('the actual newly source-qualified Zhiran disclosure preserves its lower bound in the visible tooltip headline', async t => {
  const record = milestones.find(row => row.slug === 'zhiran-medical' && row.date === '2025-08-12');
  assert.ok(record, 'Exercise the actual newly added Zhiran Series A record');
  assert.equal(record.activity, 'Over RMB 300m (over ≈$41.8m)');
  assert.equal(record.sourceUrl, 'https://bciflex.com/News/dpage');
  assert.match(record.note, /numeric comparison uses the RMB 300m lower bound/);
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  t.after(cleanup);
  await click(document.querySelector('button[aria-label^="Focus 2025:"]'));
  const marker = markerFor(record);
  assert.ok(marker, 'The actual sourced marker remains visible');
  await act(async () => marker.focus());
  const headline = document.querySelector('[data-milestone-detail] .tnum').textContent;
  assert.ok(headline.startsWith(record.activity), `Preserve the lower-bound activity in the headline: ${headline}`);
  assert.equal(marker.getAttribute('href'), record.sourceUrl);
  const supported = milestones.filter(row => row.stage === 'capital' && row.date?.startsWith('2025-')
    && !row.capitalTreatment && !['grant', 'award'].includes(row.activity.trim().toLowerCase()));
  const amount = supported.reduce((sum, row) => sum + (row.amountUsdM ?? 0), 0);
  const expected = amount >= 1000 ? `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}b` : `$${Math.round(amount)}m`;
  assert.equal(stageSummary('Capital').querySelector('.tnum').textContent, expected, 'Headline qualification preserves the existing numeric annual aggregate');
});

test('actual approximate financing keeps its existing tilde headline behavior, including the newly added BCI-Sonics record', async t => {
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  t.after(cleanup);
  for (const [slug, year, prefix] of [['echo-neurotech', 2025, '~$50m financing'], ['bci-sonics', 2026, '~$14.77m financing']]) {
    const focus = document.querySelector(`button[aria-label^="Focus ${year}:"]`);
    if (focus) await click(focus);
    const record = milestones.find(row => row.slug === slug && row.activity.startsWith('~') && !row.capitalTreatment);
    assert.ok(record, `Exercise actual approximate financing: ${slug}`);
    await act(async () => markerFor(record).focus());
    const headline = document.querySelector('[data-milestone-detail] .tnum').textContent;
    assert.ok(headline.startsWith(prefix), `${slug}: existing approximation label remains ${prefix}`);
  }
});

async function render2024(t) {
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  t.after(cleanup);
  await click(document.querySelector('button[aria-label^="Focus 2024:"]'));
}

test('the real annual ATM disclosure stays visible at year precision outside the day-positioned plot', async t => {
  const record = annualAtm();
  await render2024(t);
  const anchor = markerFor(record);
  assert.ok(anchor, 'The source-backed annual activity remains available');
  assert.equal(Boolean(anchor.closest('[data-milestone-plot]')), false, 'Year precision must not create a January 1 event marker');
  const shelf = anchor.closest('[data-milestone-period-records]');
  assert.ok(shelf, 'Period-level records have a distinct visible shelf');
  assert.ok(anchor.textContent.includes(record.activity), 'Keep the annual ATM scope visible');
  assert.ok(anchor.textContent.includes('2024'));
  assert.equal(anchor.style.left, '', 'Shelf placement conveys no fabricated day coordinate');
  assert.equal(anchor.getAttribute('href'), record.sourceUrl);
  await act(async () => anchor.focus());
  const tooltip = document.querySelector('[data-milestone-detail]');
  assert.ok(tooltip.textContent.includes(record.activity), 'The tooltip preserves the annual ATM activity');
  assert.match(tooltip.textContent, /Event date 2024/);
  assert.equal(tooltip.textContent.includes('Jan 1'), false);
  assert.equal(anchor.getAttribute('aria-describedby'), tooltip.id);
});

test('the real annual ATM amount stays in annual totals and off the day-dated cumulative curve', async t => {
  annualAtm();
  await render2024(t);
  const datedFinancing = milestones.filter(row => row.stage === 'capital' && row.date?.startsWith('2024-')
    && row.datePrecision === 'day' && !row.capitalTreatment && row.amountUsdM > 0
    && !['grant', 'award'].includes(row.activity.trim().toLowerCase()));
  const line = document.querySelector('[data-milestone-plot] polyline');
  const points = line.getAttribute('points').split(' ').map(point => point.split(',').map(Number));
  assert.equal(points.length, datedFinancing.length + 1, 'Only the baseline and supported day-dated financing belong on this curve');
  assert.equal(points[0][0], 0);
  assert.ok(points[1][0] > 0, 'No annual aggregate jump at January 1');
  assert.match(document.querySelector('[data-milestone-period-records]').textContent, /cumulative line uses day-dated financing/i);
  const supported = milestones.filter(row => row.stage === 'capital' && row.date?.startsWith('2024-')
    && !row.capitalTreatment && !['grant', 'award'].includes(row.activity.trim().toLowerCase()));
  const annualTotal = supported.reduce((sum, row) => sum + (row.amountUsdM ?? 0), 0);
  assert.ok(Math.abs(annualTotal - datedFinancing.reduce((sum, row) => sum + row.amountUsdM, 0) - 3.4) < 1e-8, 'The real annual amount remains additive');
  const annualButton = [...document.querySelectorAll('aside button')]
    .find(button => button.querySelector('span.tnum > span')?.textContent === '2024');
  const formatUsd = amount => amount >= 1000 ? `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}b` : `$${Math.round(amount)}m`;
  assert.equal(annualButton.querySelector('span.tnum').lastElementChild.textContent, formatUsd(annualTotal));
  const summary = [...document.querySelectorAll('aside .space-y-3 > div')]
    .find(row => row.firstElementChild?.textContent === 'Capital');
  assert.equal(summary.querySelector('.tnum').textContent, formatUsd(annualTotal));
});

const stageSummary = label => [...document.querySelectorAll('aside .space-y-3 > div')]
  .find(row => row.firstElementChild?.textContent === label);
async function selectWindow(a, b) {
  const plot = document.querySelector('[data-milestone-plot]');
  plot.getBoundingClientRect = () => ({ left: 0, width: 1000, top: 0, bottom: 400, right: 1000, height: 400, x: 0, y: 0, toJSON() {} });
  await act(async () => {
    for (const [type, clientX] of [['pointerdown', a * 10], ['pointermove', b * 10], ['pointerup', b * 10]]) {
      plot.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX, clientY: 40 }));
    }
  });
}

test('narrow 2024 windows qualify the real annual ATM allocation and month-level clinical count', async t => {
  annualAtm();
  await render2024(t);
  for (const [a, b] of [[0, 1], [1, 2]]) {
    await selectWindow(a, b);
    const summary = stageSummary('Capital');
    assert.equal(summary.querySelector('.tnum').textContent, '$0m', 'No annual aggregate amount can be placed within a few days');
    assert.match(summary.textContent, /Located in window/);
    assert.match(summary.textContent, /0 located financing records/);
    assert.match(summary.textContent, /Window allocation unknown · \$3\.4m across 1 period-level record/);
    const clinical = stageSummary('Clinical / regulatory');
    assert.match(clinical.textContent, /1 period-level record overlaps · window timing unknown/);
  }
});

test('all actual month-level milestones retain their disclosed month and exact-day coordinates stay unchanged', async t => {
  await render2024(t);
  for (const year of [2024, 2026]) {
    if (year !== 2024) await click(document.querySelector(`button[aria-label^="Focus ${year}:"]`));
    const partials = milestones.filter(row => row.date?.startsWith(`${year}-`) && row.datePrecision === 'month');
    assert.ok(partials.length > 0, `${year}: exercise actual month-level records`);
    for (const record of partials) {
      const anchor = markerFor(record);
      assert.ok(anchor?.closest('[data-milestone-period-records]'), `${record.company}: month-level shelf`);
      assert.equal(anchor.style.left, '');
      assert.equal(Boolean(anchor.closest('[data-milestone-plot]')), false);
      await act(async () => anchor.focus());
      const detail = document.querySelector('[data-milestone-detail]');
      const month = new Date(`${record.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      assert.ok(detail.textContent.includes(month));
      assert.ok(detail.textContent.includes(record.activity));
      assert.equal(anchor.getAttribute('href'), record.sourceUrl);
    }
    const daily = milestones.filter(row => row.date?.startsWith(`${year}-`) && row.datePrecision === 'day');
    assert.equal(document.querySelectorAll('[data-milestone-plot] a').length, daily.length);
    for (const record of daily) {
      const expected = (Date.parse(`${record.date}T00:00:00Z`) - Date.UTC(year, 0, 1)) / (Date.UTC(year, 11, 31) - Date.UTC(year, 0, 1)) * 100;
      const anchor = [...document.querySelectorAll('[data-milestone-plot] a')].find(anchor =>
        anchor.getAttribute('aria-label') === `${record.company} — ${record.activity}`
        && anchor.getAttribute('href') === record.sourceUrl && Math.abs(parseFloat(anchor.style.left) - expected) < 1e-9);
      assert.ok(Boolean(anchor), `${record.company} ${record.activity} ${record.date}: retain the exact-day marker and coordinate`);
    }
  }
});

test('a full selected year includes the real annual ATM amount while BCI-only scope keeps it separate', async t => {
  annualAtm();
  await render2024(t);
  const full = stageSummary('Capital').querySelector('.tnum').textContent;
  const fullCount = stageSummary('Capital').textContent;
  await selectWindow(0, 100);
  assert.equal(stageSummary('Capital').querySelector('.tnum').textContent, full);
  assert.equal(stageSummary('Capital').textContent, fullCount);
  assert.equal(stageSummary('Capital').textContent.includes('allocation unknown'), false);
  await click([...document.querySelectorAll('button')].find(button => button.textContent.startsWith('BCI only')));
  assert.equal(Boolean(markerFor(annualAtm())), false, 'Broader-neurotechnology annual amount follows the existing scope filter');
});

test('month-level financing contributes only to a containing window while exact-day records retain their timing', async () => {
  const source = annualAtm();
  const fixtures = [
    { ...source, company: 'Month precision probe', activity: '$12m monthly ATM', amountUsdM: 12, date: '2024-02-01', datePrecision: 'month' },
    { ...source, company: 'Earlier day probe', activity: '$2m', amountUsdM: 2, date: '2024-02-05', datePrecision: 'day' },
    { ...source, company: 'Later day probe', activity: '$3m', amountUsdM: 3, date: '2024-02-20', datePrecision: 'day' },
  ];
  const original = milestones.splice(0, milestones.length, ...fixtures);
  let cleanup;
  try {
    cleanup = await mount(React.createElement(MilestoneTimeline));
    await click(document.querySelector('button[aria-label^="Focus 2024:"]'));
    assert.equal(stageSummary('Capital').querySelector('.tnum').textContent, '$17m');
    assert.match(stageSummary('Capital').textContent, /3 financing records/);
    assert.equal(document.querySelectorAll('[data-milestone-plot] a').length, 2);
    const points = document.querySelector('[data-milestone-plot] polyline').getAttribute('points').split(' ').map(point => point.split(',').map(Number));
    assert.equal(points.length, 3, 'The curve contains two exact-day records plus its origin');
    assert.ok(Math.abs((points[0][1] - points[1][1]) / (points[0][1] - points[2][1]) - 2 / 5) < 0.001);
    const pct = (month, day) => (Date.UTC(2024, month, day) - Date.UTC(2024, 0, 1)) / (Date.UTC(2024, 11, 31) - Date.UTC(2024, 0, 1)) * 100;
    await selectWindow(pct(1, 4), pct(1, 6));
    assert.equal(stageSummary('Capital').querySelector('.tnum').textContent, '$2m');
    assert.match(stageSummary('Capital').textContent, /1 located financing record/);
    assert.match(stageSummary('Capital').textContent, /Window allocation unknown · \$12m across 1 period-level record/);
    await selectWindow(pct(0, 31), pct(2, 1));
    assert.equal(stageSummary('Capital').querySelector('.tnum').textContent, '$17m', 'A containing window includes the full disclosed month');
    assert.match(stageSummary('Capital').textContent, /3 financing records/);
    assert.equal(stageSummary('Capital').textContent.includes('allocation unknown'), false);
    await selectWindow(pct(2, 2), pct(2, 4));
    assert.equal(stageSummary('Capital').querySelector('.tnum').textContent, '$0m');
    assert.equal(stageSummary('Capital').textContent.includes('allocation unknown'), false, 'A disjoint month needs no uncertainty qualification');
  } finally {
    if (cleanup) await cleanup();
    milestones.splice(0, milestones.length, ...original);
  }
});

test('a partially overlapping disclosure with no USD amount retains an honest record count alongside a period-level award', async () => {
  const source = annualAtm();
  const original = milestones.splice(0, milestones.length,
    { ...source, company: 'Unknown amount probe', activity: '$ amount undisclosed', amountUsdM: null, date: '2024-02-01', datePrecision: 'month' },
    { ...source, company: 'Month award probe', activity: 'grant', amountUsdM: 99, date: '2024-02-01', datePrecision: 'month' });
  let cleanup;
  try {
    cleanup = await mount(React.createElement(MilestoneTimeline));
    await click(document.querySelector('button[aria-label^="Focus 2024:"]'));
    await selectWindow(9, 10);
    const summary = stageSummary('Capital');
    assert.equal(summary.querySelector('.tnum').textContent, '$0m');
    assert.match(summary.textContent, /Located in window/);
    assert.match(summary.textContent, /0 located financing records/);
    assert.match(summary.textContent, /Window allocation unknown · 1 period-level record/);
    assert.match(summary.textContent, /1 period-level award overlaps · window timing unknown/);
    assert.equal(summary.textContent.includes('$99m'), false, 'Awards remain outside financing amounts');
    assert.equal(document.querySelectorAll('[data-milestone-plot] a').length, 0);
    assert.equal(document.querySelectorAll('[data-milestone-period-records] a').length, 2);
  } finally {
    if (cleanup) await cleanup();
    milestones.splice(0, milestones.length, ...original);
  }
});
