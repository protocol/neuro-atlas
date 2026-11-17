import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { mount, click, settle } from './modal-helpers.mjs';

globalThis.React = React;
const rows = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text);

// JSDOM has no layout: supply only the viewport/plot measurements used by the
// real component. Native geometry and CSS coverage are in the companion QA script.
function timelineGeometry(window, viewportWidth = 480) {
  const frameWidth = el => {
    const frame = el.querySelector('[data-milestone-frame]') ?? el.firstElementChild;
    return frame?.style.width === '100%' ? viewportWidth : Number.parseFloat(frame?.style.width) || 1360;
  };
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.matches('.milestone-year-scroll') ? viewportWidth : 0; } });
  Object.defineProperty(window.HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return this.matches('.milestone-year-scroll') ? frameWidth(this) : 0; } });
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    let width = 0;
    if (this.matches('.milestone-year-scroll')) width = viewportWidth;
    if (this.matches('[data-milestone-plot]')) width = frameWidth(this.closest('.milestone-year-scroll')) - 56;
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 400, width, height: 400, toJSON() {} };
  };
  window.HTMLElement.prototype.scrollTo = function (options) { this.scrollLeft = Math.max(0, Math.min(options.left, this.scrollWidth - this.clientWidth)); };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
}

test('detail opens centered on the actual current date with the summary rail still expanded', async t => {
  t.mock.method(Date, 'now', () => Date.UTC(2026, 10, 17, 13));
  const cleanup = await mount(React.createElement(MilestoneTimeline), '', timelineGeometry);
  try {
    await settle();
    const scroll = document.querySelector('.milestone-year-scroll');
    assert.ok(scroll.scrollLeft > 700, 'initial viewport must move to November, not remain at January');
    assert.ok(document.querySelector('aside'), 'expanded side panel remains the default');
    const today = document.querySelector('[data-milestone-today]');
    assert.ok(today, 'today marker is exposed for the current year');
    const plot = document.querySelector('[data-milestone-plot]');
    const x = 28 + Number.parseFloat(today.style.left) / 100 * plot.getBoundingClientRect().width - scroll.scrollLeft;
    assert.ok(x > 24 && x < scroll.clientWidth - 24, 'today is inside the visible plot, not underneath the summary rail');
    assert.match(today.getAttribute('aria-label'), /Nov 17, 2026/);
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});


test('current-date focus follows the clock across supported years, including the final day', async t => {
  t.mock.method(Date, 'now', () => Date.UTC(2025, 11, 31, 23, 59));
  const cleanup = await mount(React.createElement(MilestoneTimeline), '', timelineGeometry);
  try {
    await settle();
    assert.match(document.querySelector('.milestone-year-scroll').getAttribute('aria-label'), /^2025 timeline/);
    const today = document.querySelector('[data-milestone-today]');
    assert.ok(today, 'a live current-year marker is not restricted to 2026');
    assert.equal(Number.parseFloat(today.style.left), 100, 'the whole final UTC calendar day belongs to Dec 31');
    assert.match(today.getAttribute('aria-label'), /Dec 31, 2025/);
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});


test('Fit year keeps every dated source at its precise x position, packing full-size marks into extra rows', async t => {
  t.mock.method(Date, 'now', () => Date.UTC(2026, 10, 17));
  const cleanup = await mount(React.createElement(MilestoneTimeline), '', win => timelineGeometry(win, 320));
  try {
    const detail = [...document.querySelector('[data-milestone-plot]').querySelectorAll('a')].map(el => [el.href, el.style.left]);
    const fit = button('Fit year');
    assert.ok(fit, 'explicit Fit year control exists independently of the summary rail');
    await click(fit);
    await settle();
    assert.equal(fit.getAttribute('aria-pressed'), 'true');
    const scroll = document.querySelector('.milestone-year-scroll');
    assert.equal(scroll.scrollWidth, scroll.clientWidth, 'the full Jan–Dec axis fits without horizontal scrolling');
    assert.match(scroll.getAttribute('aria-label'), /full year visible/i);
    assert.ok(document.querySelector('aside'), 'fitting the year does not collapse the summary panel');
    const marks = [...document.querySelector('[data-milestone-plot]').querySelectorAll('a')];
    assert.deepEqual(marks.map(el => [el.href, el.style.left]), detail, 'no sources or exact date-derived x positions disappear');
    for (const mark of marks) assert.equal(mark.style.height, '34px', 'logos and source targets are not shrunk');
    const width = document.querySelector('[data-milestone-plot]').getBoundingClientRect().width;
    for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++) {
      if (marks[i].style.top !== marks[j].style.top) continue;
      assert.ok(Math.abs(Number.parseFloat(marks[i].style.left) - Number.parseFloat(marks[j].style.left)) / 100 * width >= 37.99, 'same-row marks have a readable gap');
    }
    const fitHeight = Number.parseFloat(document.querySelector('[data-milestone-plot]').style.height);
    await click(button('Detail'));
    await settle();
    assert.ok(document.querySelector('.milestone-year-scroll').scrollWidth > 320, 'detail mode remains available');
    assert.ok(fitHeight > Number.parseFloat(document.querySelector('[data-milestone-plot]').style.height), 'fit trades extra rows for horizontal room');
    assert.ok(document.querySelector('.milestone-year-scroll').scrollLeft > 700, 'returning to detail returns to the current date');
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});


test('Fit year preserves filters, range selection, and keyboard source details with precise dates', async t => {
  t.mock.method(Date, 'now', () => Date.UTC(2026, 10, 17));
  const cleanup = await mount(React.createElement(MilestoneTimeline), '', timelineGeometry);
  try {
    await click(button('Fit year'));
    await click([...document.querySelectorAll('button')].find(el => el.textContent.startsWith('BCI only')));
    const links = [...document.querySelector('[data-milestone-plot]').querySelectorAll('a')];
    assert.ok(links.length > 0);
    const row = rows.find(row => row.sourceUrl === links[0].href && row.company === links[0].getAttribute('aria-label').split(' — ')[0]);
    assert.equal(row.scope, 'bci');
    await act(async () => links[0].focus());
    const detail = document.querySelector('[data-milestone-detail]');
    assert.ok(detail, 'keyboard focus reveals the source evidence, not only a logo');
    assert.ok(detail.textContent.includes(row.note));
    assert.equal(links[0].getAttribute('aria-describedby'), detail.id);
    await act(async () => links[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[data-milestone-detail]'), null);
    const plot = document.querySelector('[data-milestone-plot]');
    await act(async () => {
      plot.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 40 }));
      plot.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 200 }));
      plot.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 200 }));
    });
    assert.match(document.querySelector('aside').textContent, /Selected window/);
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});
