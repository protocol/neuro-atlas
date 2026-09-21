import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { mount, click } from './modal-helpers.mjs';

const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
function animationClock(reduced = false) {
  let time = 0, nextId = 0;
  const frames = new Map(), listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  return {
    configure(window) {
      window.matchMedia = query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; };
      window.performance.now = () => time;
      globalThis.requestAnimationFrame = window.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
      globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
    },
    async advance(ms) {
      time += ms;
      const pending = [...frames.values()]; frames.clear();
      await act(async () => { for (const callback of pending) callback(time); });
    },
    async reduce(value) { await act(async () => { media.matches = value; for (const fn of listeners) fn(media); }); },
    get pending() { return frames.size; },
    get subscriptions() { return listeners.size; },
  };
}
const tickY = (svg, label) => Number([...svg.querySelectorAll('text')].find(el => el.textContent === label)?.getAttribute('y'));
const between = (value, a, b, label) => assert.ok(value > Math.min(a, b) && value < Math.max(a, b), `${label}: ${value} must lie strictly between ${a} and ${b}`);
const geometry = svg => ({
  height: Number(svg.getAttribute('viewBox').split(' ')[3]),
  marks: [...svg.querySelectorAll('[data-curve-point]')].map(p => [Number(p.getAttribute('cx')), Number(p.getAttribute('cy'))]),
});

test('enabled-only controls stay below the chart and both hint strings reserve a stable shared row', async () => {
  const clock = animationClock();
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#neural-recording-hours', clock.configure);
  try {
    const scroll = document.querySelector('dialog .pc-chart-scroll');
    const hint = document.getElementById(document.querySelector('[role="switch"]').getAttribute('aria-describedby'));
    assert.equal(hint.children.length, 2, 'Both hint strings must occupy the same reserved grid cell, including while off');
    const hintTexts = [...hint.children].map(el => el.textContent);
    await click(document.querySelector('[role="switch"]'));
    for (const selector of ['[data-scenario-warning]', '.pc-scenario-select', '[data-fit-diagnostics]']) {
      const node = document.querySelector(selector);
      assert.ok(scroll.compareDocumentPosition(node) & window.Node.DOCUMENT_POSITION_FOLLOWING, `${selector} must not push chart down`);
    }
    assert.deepEqual([...hint.children].map(el => el.textContent), hintTexts, 'Changing hints must not change reserved content size');
    assert.equal([...hint.children].filter(el => el.getAttribute('aria-hidden') !== 'true').length, 1);
    const style = document.createElement('style'); style.textContent = readFileSync('src/components/performance-curves.css', 'utf8'); document.head.append(style);
    assert.equal(getComputedStyle(hint).display, 'grid');
    for (const child of hint.children) assert.equal(getComputedStyle(child).gridArea, '1 / 1');
  } finally { await cleanup(); }
});

test('unmount during motion cancels RAF and removes the preference listener, including StrictMode replay', async () => {
  const clock = animationClock();
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(PerformanceCurves, { data, provenance })), '#simultaneously-recorded-neurons', clock.configure);
  await click(document.querySelector('[role="switch"]')); await clock.advance(200);
  assert.ok(clock.pending > 0);
  assert.ok(clock.subscriptions > 0);
  await cleanup();
  assert.equal(clock.pending, 0);
  assert.equal(clock.subscriptions, 0);
  await clock.advance(1000);
});

test('reduced motion snaps both ways without RAF and a live preference change finishes the current destination', async () => {
  const clock = animationClock(true);
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#neural-recording-hours', clock.configure);
  try {
    const svg = document.querySelector('dialog svg'), toggle = document.querySelector('[role="switch"]');
    const original = svg.outerHTML;
    // Ignore unrelated modal autofocus frames; the chart must add none.
    await clock.advance(0); const pending = clock.pending;
    await click(toggle);
    assert.equal(geometry(svg).height, 380, 'Reduced motion reaches on immediately');
    assert.equal(clock.pending, pending);
    await click(toggle);
    assert.equal(svg.outerHTML, original);
    await clock.reduce(false); await click(toggle); await clock.advance(200);
    between(geometry(svg).height, 300, 380, 'Normal motion restored');
    await clock.reduce(true);
    assert.equal(geometry(svg).height, 380, 'Live reduction snaps to the requested destination');
    assert.equal(clock.pending, 0);
    await clock.reduce(false); await click(toggle); await clock.advance(200);
    await clock.reduce(true);
    assert.equal(svg.outerHTML, original, 'Live reduction during reverse restores off');
  } finally { await cleanup(); }
  assert.equal(clock.pending, 0);
  assert.equal(clock.subscriptions, 0);
});

test('ticks move and crossfade; render constraints and forecast reveal follow the geometry clock', async () => {
  const clock = animationClock();
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#simultaneously-recorded-neurons', clock.configure);
  try {
    const svg = document.querySelector('dialog svg'), scroll = svg.parentElement;
    const oldTick = tickY(svg, '100');
    await click(document.querySelector('[role="switch"]'));
    assert.equal(scroll.style.getPropertyValue('--pc-chart-min-width'), '560px', 'Do not jump the mobile render width on click');
    assert.equal(svg.querySelector('.pc-extrapolation-overlay')?.getAttribute('opacity'), '0');
    await clock.advance(200);
    for (const label of ['100M', '2080']) {
      const incoming = [...svg.querySelectorAll('text')].find(el => el.textContent === label);
      const layer = label === '2080' ? incoming : incoming.parentElement;
      assert.equal(layer.getAttribute('opacity'), '0', 'New labels stay invisible while crowded at the entry edge');
    }
    await clock.advance(200);
    const middleTick = tickY(svg, '100');
    assert.equal(scroll.style.getPropertyValue('--pc-chart-min-width'), '640px');
    assert.notEqual(scroll.style.getPropertyValue('--pc-chart-max-height'), 'none', 'Original height cap must not vanish on click');
    const incoming = [...svg.querySelectorAll('text')].find(el => el.textContent === '100M');
    assert.ok(incoming, 'Incoming ticks exist before the final frame');
    between(Number(incoming.parentElement.getAttribute('opacity')), 0, 1, 'Incoming tick fade');
    const futureYear = [...svg.querySelectorAll('text')].find(el => el.textContent === '2080');
    between(Number(futureYear.getAttribute('opacity')), 0, 1, 'Incoming year fade');
    const middleYearX = Number(futureYear.getAttribute('x'));
    assert.equal(svg.querySelector('.pc-extrapolation-overlay').getAttribute('opacity'), '0', 'Reveal forecast only after the main rescale');
    await clock.advance(200);
    between(Number(svg.querySelector('.pc-extrapolation-overlay').getAttribute('opacity')), 0, 1, 'Late forecast reveal');
    await clock.advance(200);
    between(middleTick, oldTick, tickY(svg, '100'), 'Common y tick');
    const finalYear = [...svg.querySelectorAll('text')].find(el => el.textContent === '2080');
    between(middleYearX, Number(finalYear.getAttribute('x')), 698, 'Future x tick enters from right edge');
    assert.equal(scroll.hasAttribute('data-motion'), false);
  } finally { await cleanup(); }
});

for (const id of ['simultaneously-recorded-neurons', 'neural-recording-hours']) {
  test(`${id}: rapid reversals resume the displayed frame and restore the exact original SVG`, async () => {
    const clock = animationClock();
    const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), `#${id}`, clock.configure);
    try {
      const svg = document.querySelector('dialog svg'), toggle = document.querySelector('[role="switch"]');
      const original = svg.outerHTML;
      await click(toggle); await clock.advance(600);
      const forward = geometry(svg), overlay = svg.querySelector('.pc-extrapolation-overlay').getAttribute('opacity');
      await click(toggle);
      assert.deepEqual(geometry(svg), forward);
      assert.equal(svg.querySelector('.pc-extrapolation-overlay').getAttribute('opacity'), overlay, 'Overlay does not blink away on reverse');
      await clock.advance(200); const backward = geometry(svg);
      assert.ok(backward.height < forward.height);
      await click(toggle); assert.deepEqual(geometry(svg), backward);
      await clock.advance(800); assert.equal(geometry(svg).height, 380);
      await click(toggle); await clock.advance(400);
      between(geometry(svg).height, 300, 380, 'Returning geometry');
      await clock.advance(400);
      assert.equal(svg.outerHTML, original, 'No residual SVG attributes, styles, reordered ticks or changed points');
    } finally { await cleanup(); }
  });

  test(`${id}: toggle moves the same historical marks and SVG size through eased intermediate frames`, async () => {
    const clock = animationClock();
    const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), `#${id}`, clock.configure);
    try {
      const svg = document.querySelector('dialog svg'), toggle = document.querySelector('[role="switch"]');
      const original = geometry(svg), marks = [...svg.querySelectorAll('[data-curve-point]')];
      const previews = [...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML);
      await click(toggle);
      assert.deepEqual(geometry(svg), original, 'No geometry replacement on the click frame');
      await clock.advance(200); const early = geometry(svg);
      await clock.advance(200); const middle = geometry(svg);
      await clock.advance(400); const final = geometry(svg);
      assert.equal(final.height, 380);
      between(early.height, original.height, middle.height, 'early height');
      between(middle.height, original.height, final.height, 'middle height');
      assert.ok((early.height - original.height) < (middle.height - early.height), 'Ease-in, not a linear timer');
      middle.marks.forEach((point, index) => point.forEach((value, axis) => {
        if (original.marks[index][axis] !== final.marks[index][axis]) between(value, original.marks[index][axis], final.marks[index][axis], `mark ${index}, axis ${axis}`);
      }));
      assert.deepEqual([...svg.querySelectorAll('[data-curve-point]')], marks, 'Markers remain mounted for inspection/focus');
      assert.deepEqual([...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML), previews);
    } finally { await cleanup(); }
  });
}
