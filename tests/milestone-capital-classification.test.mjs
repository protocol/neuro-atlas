import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

function renderTimeline(rows = fixtures) {
  const previous = milestones.splice(0, milestones.length, ...rows);
  try {
    return new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  } finally {
    milestones.splice(0, milestones.length, ...previous);
  }
}

function capitalSummary(document) {
  return [...document.querySelectorAll('aside .space-y-3 > div')]
    .find(row => row.querySelector('span.text-\\[12px\\]')?.textContent === 'Capital');
}

test('native and undisclosed financing count as rounds, not grants, without USD amounts', () => {
  const dom = renderTimeline();
  try {
    const summary = capitalSummary(dom.window.document);
    assert.ok(summary, 'Rendered capital summary is present');
    assert.equal(summary.lastElementChild.textContent, '3 rounds raised · 1 grant');
    assert.equal(summary.querySelector('.tnum').textContent, '$10m');
  } finally {
    dom.window.close();
  }
});

test('a disclosed USD grant stays a grant and is excluded from the selected-period financing amount', () => {
  const dom = renderTimeline(fixtures.map(event => event.activity === 'grant' ? { ...event, amountUsdM: 25 } : event));
  try {
    const summary = capitalSummary(dom.window.document);
    assert.equal(summary.lastElementChild.textContent, '3 rounds raised · 1 grant');
    assert.equal(summary.querySelector('.tnum').textContent, '$10m');
  } finally {
    dom.window.close();
  }
});

test('annual capital raised excludes grants from the collapsed year and summary rail', () => {
  const dom = renderTimeline([
    ...fixtures,
    capitalEvent('Prior financing', '$10m', 10, '2025-01-10'),
    capitalEvent('Prior grant', 'grant', 25, '2025-04-10'),
  ]);
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector('button[aria-label^="Focus 2025:"]').getAttribute('aria-label'), 'Focus 2025: $10m raised');
    const annual = [...document.querySelectorAll('aside button')]
      .find(button => button.querySelector('span.tnum > span')?.textContent === '2025');
    assert.equal(annual.querySelector('span.tnum').lastElementChild.textContent, '$10m');
  } finally {
    dom.window.close();
  }
});

test('the cumulative capital line excludes disclosed grants and unconverted financing amounts', () => {
  const dom = renderTimeline([
    ...fixtures.map(event => event.activity === 'grant' ? { ...event, amountUsdM: 25 } : event),
    capitalEvent('Later financing', '$10m', 20, '2026-05-10'),
  ]);
  try {
    const line = dom.window.document.querySelector('.milestone-year-scroll polyline');
    const points = line.getAttribute('points').split(' ');
    assert.equal(points.length, 3, 'Baseline plus two USD-valued financing rounds only');
    const [baselineY, firstY, lastY] = points.map(point => Number(point.split(',')[1]));
    assert.ok(Math.abs((baselineY - firstY) / (baselineY - lastY) - 1 / 3) < 0.001,
      'The first $10m round contributes one-third of the $30m financing total');
  } finally {
    dom.window.close();
  }
});
