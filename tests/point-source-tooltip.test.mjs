import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const plot = {
  id: 'tooltip-fixture', title: 'Synthetic source observations', xLabel: 'Year', yLabel: 'Units', scale: 'linear', scope: 'Synthetic test data only.',
  points: [
    { id: 'a', x: 2000, y: 10, label: 'Source A', dateLabel: '2000 publication', qualifier: '≥', sourceTitle: 'Paper A', sourceUrl: 'https://example.org/a', quote: 'At least ten.', note: 'Partial specimen.' },
    { id: 'b', x: 2020, y: 20, label: 'Source B', dateLabel: '2020 publication', qualifier: '≈', sourceTitle: 'Paper B', sourceUrl: 'https://example.org/b', quote: 'Approximately twenty.' },
  ],
};
const move = async point => act(async () => point.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 180 })));

test('Draft source inspection is absent at rest and floats outside the chart on actual movement', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    assert.ok(!document.querySelector('.draft-plot-inspector'), 'No empty gray source box');
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    const point = document.querySelector('[data-source-observation="a"]');
    await act(async () => point.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'Stationary modal entry does not inspect');
    point.getBoundingClientRect = () => ({ left: 190, right: 210, top: 170, bottom: 190, width: 20, height: 20 });
    await move(point);
    const tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(tooltip, 'A floating source tooltip is mounted');
    assert.equal(tooltip.closest('figure'), null, 'Escapes chart overflow clipping');
    assert.equal(tooltip.style.position, 'fixed');
    for (const text of ['Source A', '≥10', '2000 publication', 'Paper A', 'Partial specimen.']) assert.ok(tooltip.textContent.includes(text), text);
    assert.equal(tooltip.querySelector('a').href, plot.points[0].sourceUrl);
    assert.equal(point.getAttribute('aria-describedby'), tooltip.id);
    assert.equal(document.querySelectorAll('details tbody tr').length, plot.points.length, 'Non-hover source discovery remains');
  } finally { await cleanup(); }
});

test('keyboard focus beats a stationary/moving hover and hover resumes on blur', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    const [a, b] = document.querySelectorAll('[data-source-observation]');
    await move(a);
    await act(async () => b.focus());
    await move(a);
    assert.ok(document.querySelector('[role="tooltip"]').textContent.includes('Source B'), 'Keyboard focus owns inspection even when another point moves');
    assert.equal(a.getAttribute('aria-describedby'), null);
    assert.equal(b.getAttribute('aria-describedby'), document.querySelector('[role="tooltip"]').id);
    await act(async () => b.blur());
    assert.ok(document.querySelector('[role="tooltip"]').textContent.includes('Source A'));
  } finally { await cleanup(); }
});

test('tap pins/toggles source links, close restores focus, and first Escape dismisses only the tooltip', async () => {
  let escapes = 0;
  const cleanup = await mount(React.createElement('dialog', { open: true, onKeyDown: e => { if (e.key === 'Escape') escapes++; } }, React.createElement(DraftChartPlot, { plot })));
  try {
    const [a, b] = document.querySelectorAll('[data-source-observation]');
    await act(async () => a.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    let popup = document.querySelector('[role="tooltip"]');
    assert.ok(popup, 'Tap opens source popup');
    assert.equal(popup.parentElement.tagName, 'DIALOG', 'Native dialog top layer owns the portal');
    assert.equal(popup.dataset.pinned, 'true');
    await move(b);
    assert.ok(popup.textContent.includes('Source A'), 'Pinned source survives pointer travel');
    const link = popup.querySelector('a');
    let followed = false;
    link.addEventListener('click', e => { e.preventDefault(); followed = true; });
    await act(async () => { link.focus(); link.click(); });
    assert.ok(followed, 'Source link remains actionable');
    await act(async () => popup.querySelector('button[aria-label="Close source details"]').click());
    assert.ok(!document.querySelector('[role="tooltip"]'), 'Close dismisses without immediate focus reopening');
    assert.ok(document.activeElement === a, 'Close returns to the selected source');
    await act(async () => a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
    assert.ok(document.querySelector('[role="tooltip"]'), 'Keyboard activation reopens the popup');
    await act(async () => a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.ok(!document.querySelector('[role="tooltip"]'), 'Escape clears focused, hovered and pinned selections');
    assert.equal(escapes, 0, 'First Escape never reaches the enclosing chart modal');
    await act(async () => a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(escapes, 1, 'Second Escape can dismiss the chart modal');
    await act(async () => a.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await act(async () => a.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.ok(!document.querySelector('[role="tooltip"]'), 'Second tap toggles off');
  } finally { await cleanup(); }
});

test('hover pointer travel reaches the popup and its link, then leaving dismisses after a bounded grace period', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    const point = document.querySelector('[data-source-observation]');
    await move(point);
    const popup = document.querySelector('[role="tooltip"]');
    await act(async () => point.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
    await act(async () => popup.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
    await act(async () => new Promise(resolve => setTimeout(resolve, 350)));
    assert.ok(document.querySelector('[role="tooltip"]'), 'Popup survives crossing the point-to-popup gap');
    await act(async () => popup.querySelector('a').focus());
    assert.ok(document.querySelector('[role="tooltip"]'), 'Source link focus keeps the popup open');
    await act(async () => { popup.querySelector('a').blur(); popup.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
    await act(async () => new Promise(resolve => setTimeout(resolve, 350)));
    assert.ok(!document.querySelector('[role="tooltip"]'), 'Unpinned hover leaves no sticky panel');
  } finally { await cleanup(); }
});

test('popup clamps to narrow viewport edges and reanchors after chart scroll/viewport resize', async () => {
  let markRect = { left: 290, right: 310, top: 450, bottom: 470, width: 20, height: 20 };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }), '', win => {
    Object.defineProperties(win, { innerWidth: { value: 320, configurable: true }, innerHeight: { value: 480, configurable: true } });
    const original = win.HTMLElement.prototype.getBoundingClientRect;
    win.HTMLElement.prototype.getBoundingClientRect = function () {
      return this.hasAttribute('data-point-tooltip') ? { width: 304, height: 180, left: 0, right: 304, top: 0, bottom: 180 } : original.call(this);
    };
  });
  try {
    const point = document.querySelector('[data-source-observation]');
    point.getBoundingClientRect = () => markRect;
    await move(point);
    let popup = document.querySelector('[role="tooltip"]');
    assert.equal(popup.style.left, '8px', 'Popup never extends the narrow document');
    assert.equal(popup.style.top, '292px', 'Bottom edge stays inside the viewport');
    markRect = { left: 20, right: 40, top: 40, bottom: 60, width: 20, height: 20 };
    await act(async () => window.dispatchEvent(new Event('scroll')));
    popup = document.querySelector('[role="tooltip"]');
    assert.equal(popup.style.top, '8px', 'Scroll recomputes the correct mark position');
    Object.defineProperty(window, 'innerWidth', { value: 1000 });
    await act(async () => window.dispatchEvent(new Event('resize')));
    assert.equal(popup.style.left, '52px', 'Resize restores point-adjacent placement');
  } finally { await cleanup(); }
});

import { readFileSync } from 'node:fs';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
for (const id of ['simultaneously-recorded-neurons', 'tissue-mapped', 'neural-recording-hours']) {
  test(`${id}: source popup replaces readout, preserves coordinates and keyboard role, and links the exact source`, async () => {
    const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance, flat: true }), `#${id}`);
    try {
      const dialog = document.querySelector('dialog');
      assert.ok(!dialog.querySelector('.pc-point-readout'), 'No below-chart gray box');
      const [a, b] = dialog.querySelectorAll('[data-curve-point]');
      const geometry = [...dialog.querySelectorAll('[data-curve-point]')].map(p => [p.getAttribute('cx'), p.getAttribute('cy')]);
      const source = dialog.querySelector('.pc-table-scroll tbody a');
      const sources = [...dialog.querySelectorAll('.pc-table-scroll tbody a')].map(a => a.href);
      const role = id === 'simultaneously-recorded-neurons' ? 'button' : 'img';
      assert.equal(a.getAttribute('role'), role, 'Keep existing keyboard semantics');
      await act(async () => a.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
      assert.ok(!document.querySelector('[role="tooltip"]'), 'Stationary modal appearance never selects');
      await move(a);
      let popup = document.querySelector('[role="tooltip"]');
      assert.ok(popup, 'Actual pointer movement reveals a floating popup');
      assert.ok(popup.textContent.includes(a.getAttribute('aria-label')), 'Full scientific label is preserved');
      assert.equal(popup.querySelector('a').href, source.href);
      assert.ok(!popup.closest('.pc-chart-scroll'), 'Popup escapes scroller clipping');
      await act(async () => b.focus());
      await move(a);
      popup = document.querySelector('[role="tooltip"]');
      assert.ok(popup.textContent.includes(b.getAttribute('aria-label')), 'Keyboard point beats hover');
      assert.deepEqual([...dialog.querySelectorAll('[data-curve-point]')].map(p => [p.getAttribute('cx'), p.getAttribute('cy')]), geometry);
      assert.deepEqual([...dialog.querySelectorAll('.pc-table-scroll tbody a')].map(a => a.href), sources, 'Every source remains discoverable without hover');
    } finally { await cleanup(); }
  });
}

import { PointTooltip, usePointTooltip } from '../src/components/point-source-tooltip.tsx';
test('computed-label consumers may omit a point registry', async () => {
  function ComputedLabelChart() {
    const tooltip = usePointTooltip();
    return React.createElement(React.Fragment, null,
      React.createElement('button', { ...tooltip.pointProps('computed source label') }, 'Point'),
      React.createElement(PointTooltip, tooltip.tooltipProps, tooltip.active));
  }
  const cleanup = await mount(React.createElement(ComputedLabelChart));
  try {
    await act(async () => document.querySelector('button').focus());
    assert.ok(document.querySelector('[role="tooltip"]')?.textContent.includes('computed source label'), 'Computed labels work without registry validation');
  } finally { await cleanup(); }
});

test('curve unit captions align with the shared content edge without moving source coordinates', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance, flat: true }), '#tissue-mapped');
  try {
    for (const svg of document.querySelectorAll('.pc-preview svg, .pc-plot svg')) {
      assert.equal(svg.querySelector('text').getAttribute('x'), '0', 'Unit/scale caption shares the heading/content edge');
    }
  } finally { await cleanup(); }
});

test('observation annotation controls anchor source details to the actual scientific mark', async () => {
  const annotated = { ...plot, points: plot.points.map(p => ({ ...p, annotation: p.label })) };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: annotated }));
  try {
    const mark = document.querySelector('[data-source-observation="a"]');
    mark.getBoundingClientRect = () => ({ left: 190, right: 210, top: 170, bottom: 190, width: 20, height: 20 });
    const control = document.querySelector('[data-point-annotation="a"]');
    await act(async () => control.focus());
    assert.equal(document.querySelector('[role="tooltip"]').style.left, '222px', 'Label control reveals the associated mark, not a detached popup at the list');
  } finally { await cleanup(); }
});
