import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { selectPerformance, selectPace } from '../src/lib/field-velocity/performance.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const performanceIds = ['simultaneously-recorded-neurons', 'tissue-mapped', 'neural-recording-hours'];

for (const id of [...performanceIds, 'idea_vintage', 'latency_compression']) {
  test(`${id}: detail box starts empty and retains existing focus/hover inspection`, async () => {
    const node = performanceIds.includes(id)
      ? React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance })
      : React.createElement(PaceReadings, { data: selectPace(feed) });
    const cleanup = await mount(node, `#${id}`);
    try {
      const dialog = document.querySelector('dialog[open]');
      const readout = dialog.querySelector('.pc-point-readout');
      const [a, b] = dialog.querySelectorAll('[data-curve-point]');
      const sources = [...dialog.querySelectorAll('a[href^="http"]')].map(link => link.href);
      assert.ok(readout, 'Keep the reserved box mounted');
      const style = document.createElement('style');
      style.textContent = readFileSync('src/components/performance-curves.css', 'utf8');
      document.head.append(style);
      assert.equal(getComputedStyle(readout).minHeight, '56px');
      assert.equal(readout.textContent, '', 'No point or placeholder before interaction');
      assert.equal(a.getAttribute('aria-describedby'), null);
      assert.ok(sources.length, 'Source links are available without inspecting a point');

      await act(async () => a.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
      assert.equal(readout.textContent, a.getAttribute('aria-label'));
      assert.equal(a.getAttribute('aria-describedby'), readout.id);
      await act(async () => b.focus());
      assert.equal(readout.textContent, b.getAttribute('aria-label'), 'Keyboard focus retains priority over hover');
      await act(async () => b.blur());
      assert.equal(readout.textContent, a.getAttribute('aria-label'), 'Pointer inspection resumes after blur');
      await act(async () => a.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
      assert.equal(readout.textContent, '', 'Existing transient inspection returns to an empty box');
      assert.equal(a.getAttribute('aria-describedby'), null);
      assert.equal(b.getAttribute('aria-describedby'), null);
      assert.equal(dialog.querySelector('.pc-point-readout'), readout, 'Do not remove the box on dismissal');
      assert.deepEqual([...dialog.querySelectorAll('a[href^="http"]')].map(link => link.href), sources);
    } finally { await cleanup(); }
  });
}

for (const id of ['neurotech', 'neuralink']) {
  test(`${id}: Trends retains its static latest-week summary, not an auto-selected point panel`, async () => {
    const cleanup = await mount(React.createElement(GoogleTrends), `#google-trends-${id}`);
    try {
      const dialog = document.querySelector('dialog[open]');
      assert.equal(dialog.querySelector('[role="tooltip"], .pc-point-readout, .draft-plot-inspector'), null);
      const group = JSON.parse(readFileSync('public/data/google-trends/google-trends.json', 'utf8')).groups.find(group => group.id === id);
      const latest = group.rows.filter(row => !row.partial).at(-1);
      const summary = dialog.querySelector('[data-trends-latest]');
      assert.equal(summary.dataset.trendsLatest, latest.date);
      for (const [index, term] of group.terms.entries()) assert.ok(summary.textContent.includes(`${term}: ${latest.displayValues[index]}`));
      assert.ok(dialog.querySelector('[data-trend-point] title'), 'Existing native point hover information remains');
      assert.equal(dialog.querySelector('a[href^="https://trends.google.com/"]').href, group.sourceUrl);
    } finally { await cleanup(); }
  });
}

test('milestone tooltip is absent until hover; source navigation and exit stay unchanged', async () => {
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    assert.equal(document.querySelector('.fixed.w-72'), null);
    const point = document.querySelector('.milestone-year-scroll a[aria-label][href]');
    const href = point.href;
    await act(async () => point.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    const tooltip = document.querySelector('.fixed.w-72');
    assert.ok(tooltip.textContent.includes(point.getAttribute('aria-label').split(' — ')[0]));
    assert.match(tooltip.textContent, /click to open source/);
    let navigates = false;
    point.addEventListener('click', event => { navigates = !event.defaultPrevented; event.preventDefault(); }, { once: true });
    await act(async () => point.click());
    assert.equal(navigates, true);
    assert.equal(point.href, href);
    await act(async () => point.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
    assert.equal(document.querySelector('.fixed.w-72'), null);
  } finally { await cleanup(); }
});
