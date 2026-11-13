import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const milestones = require('../src/data/milestones.json');
globalThis.React = React;

const capitalEvent = (company, activity, amountUsdM, date, note = '') => ({
  company, slug: company.toLowerCase(), activity, stage: 'capital', amountUsdM,
  date, datePrecision: 'day', note, sourceUrl: null, logo: null, scope: 'bci',
});
const fixtures = [
  capitalEvent('USD financing', '$10m', 10, '2026-01-10', 'Financing, not a grant.'),
  capitalEvent('Native financing', 'Series B', null, '2026-02-10', 'RMB 700m financing; no USD conversion.'),
  capitalEvent('Undisclosed financing', 'funding', null, '2026-03-10', 'Financing amount undisclosed.'),
  capitalEvent('Actual grant', 'grant', null, '2026-04-10'),
];

// Seed the module's activity filters with deterministic fixtures, not live data.
// Only the in-process JSON module is changed; no data files are written.
const original = milestones.splice(0, milestones.length, ...fixtures);
let MilestoneTimeline;
try {
  ({ MilestoneTimeline } = await import('../src/components/milestone-timeline.tsx'));
} finally {
  milestones.splice(0, milestones.length, ...original);
}

async function renderTimeline(t, rows = fixtures) {
  const previous = milestones.splice(0, milestones.length, ...rows);
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://atlas.example/milestones', pretendToBeVisual: true });
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const root = createRoot(document.getElementById('root'));
  t.after(async () => {
    await act(async () => root.unmount());
    milestones.splice(0, milestones.length, ...previous);
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await act(async () => root.render(React.createElement(MilestoneTimeline)));
  // Capital summaries are now opt-in; exercise the actual opener before inspecting them.
  await act(async () => document.querySelector('button[aria-label="Open side panel"]').click());
  return dom;
}

function capitalSummary(document) {
  return [...document.querySelectorAll('aside .space-y-3 > div')]
    .find(row => row.querySelector('span.text-\\[12px\\]')?.textContent === 'Capital');
}

test('native and undisclosed financing count as rounds, not grants, without USD amounts', async t => {
  const dom = await renderTimeline(t);
  const summary = capitalSummary(dom.window.document);
  assert.ok(summary, 'Rendered capital summary is present');
  assert.equal(summary.lastElementChild.textContent, '3 rounds raised · 1 grant');
  assert.equal(summary.querySelector('.tnum').textContent, '$10m');
});

test('a disclosed USD grant stays a grant and is excluded from the selected-period financing amount', async t => {
  const dom = await renderTimeline(t, fixtures.map(event => event.activity === 'grant' ? { ...event, amountUsdM: 25 } : event));
  const summary = capitalSummary(dom.window.document);
  assert.equal(summary.lastElementChild.textContent, '3 rounds raised · 1 grant');
  assert.equal(summary.querySelector('.tnum').textContent, '$10m');
});

test('annual capital raised excludes grants from the collapsed year and summary rail', async t => {
  const dom = await renderTimeline(t, [
  ...fixtures,
  capitalEvent('Prior financing', '$10m', 10, '2025-01-10'),
  capitalEvent('Prior grant', 'grant', 25, '2025-04-10'),
  ]);
  const document = dom.window.document;
  assert.equal(document.querySelector('button[aria-label^="Focus 2025:"]').getAttribute('aria-label'), 'Focus 2025: $10m raised');
  const annual = [...document.querySelectorAll('aside button')]
    .find(button => button.querySelector('span.tnum > span')?.textContent === '2025');
  assert.equal(annual.querySelector('span.tnum').lastElementChild.textContent, '$10m');
});

test('the cumulative capital line excludes disclosed grants and unconverted financing amounts', async t => {
  const dom = await renderTimeline(t, [
  ...fixtures.map(event => event.activity === 'grant' ? { ...event, amountUsdM: 25 } : event),
  capitalEvent('Later financing', '$10m', 20, '2026-05-10'),
  ]);
  const line = dom.window.document.querySelector('.milestone-year-scroll polyline');
  const points = line.getAttribute('points').split(' ');
  assert.equal(points.length, 3, 'Baseline plus two USD-valued financing rounds only');
  const [baselineY, firstY, lastY] = points.map(point => Number(point.split(',')[1]));
  assert.ok(Math.abs((baselineY - firstY) / (baselineY - lastY) - 1 / 3) < 0.001,
    'The first $10m round contributes one-third of the $30m financing total');
});
