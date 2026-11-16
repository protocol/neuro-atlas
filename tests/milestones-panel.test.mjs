import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

globalThis.React = React;
const milestones = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url), 'utf8'));
const usd2026 = milestones.filter(row => row.stage === 'capital' && !['grant', 'award'].includes(row.activity.trim().toLowerCase())
  && row.date?.startsWith('2026-') && row.amountUsdM).reduce((sum, row) => sum + row.amountUsdM, 0);
const formatUsd = amount => amount >= 1000 ? `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}b` : `$${Math.round(amount)}m`;

function assertInitialSummary(document) {
  const panel = document.querySelector('aside');
  assert.ok(panel, 'Existing capital summary is present without opening the panel');
  const annual = [...panel.querySelectorAll('button')].find(button => button.querySelector('span.tnum > span')?.textContent === '2026');
  assert.ok(annual, 'Existing 2026 annual capital row is present');
  assert.equal(annual.querySelector('span.tnum').lastElementChild.textContent, formatUsd(usd2026));
  assert.match(panel.textContent, /Full period/);
  assert.match(panel.textContent, /Jan 1 – Dec 31, 2026/);
  const capital = [...panel.querySelectorAll('.space-y-3 > div')].find(row => row.querySelector('span.text-\\[12px\\]')?.textContent === 'Capital');
  assert.equal(capital.querySelector('.tnum').textContent, formatUsd(usd2026), 'Full-period capital uses the existing sourced 2026 total');
  assert.match(panel.textContent, /Indexed financing/);
  assert.match(panel.textContent, /including labeled commitments — not cash receipts, valuations, or transaction values/);
  assert.ok(panel.querySelector('button[aria-label="Fold side panel to show the full year"]'));
  assert.equal(document.querySelector('button[aria-label="Open side panel"]'), null);
  return panel;
}

test('Milestones initially renders the existing 2026 capital totals before client hydration', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try { assertInitialSummary(dom.window.document); } finally { dom.window.close(); }
});

test('Milestones starts open and retains manual Fold → Open with unchanged capital totals', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://atlas.example/milestones', pretendToBeVisual: true });
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  try {
    await act(async () => root.render(React.createElement(MilestoneTimeline)));
    const initial = assertInitialSummary(document).textContent;
    await act(async () => document.querySelector('button[aria-label="Fold side panel to show the full year"]').click());
    assert.equal(document.querySelector('aside'), null, 'Manual Fold still removes the summary');
    const open = document.querySelector('button[aria-label="Open side panel"]');
    assert.ok(open, 'Folded panel retains its explicit opener');
    await act(async () => open.click());
    assert.equal(assertInitialSummary(document).textContent, initial, 'Roundtrip preserves the existing summary');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
