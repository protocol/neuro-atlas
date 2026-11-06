import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

globalThis.React = React;
const render = () => new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));

async function mount(t) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const keys = ['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT'];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let width = 1360;
  const observers = new Set();
  const rect = dom.window.HTMLElement.prototype.getBoundingClientRect;
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.classList.contains('cursor-crosshair') ? { width, height: 600, left: 0, top: 0, right: width, bottom: 600 } : rect.call(this);
  };
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: callback => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout,
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.add(this); }
      observe() {}
      disconnect() { observers.delete(this); }
    },
  });
  const root = createRoot(document.getElementById('root'));
  t.after(async () => {
    await act(async () => root.unmount());
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
    dom.window.close();
  });
  await act(async () => root.render(React.createElement(MilestoneTimeline)));
  return {
    doc: dom.window.document,
    click: async el => act(async () => el.click()),
    resize: async next => act(async () => {
      width = next;
      for (const observer of [...observers]) observer.callback([]);
      await new Promise(resolve => setTimeout(resolve, 5));
    }),
  };
}

test('folded and resized plots repack full-size logos without shifting their date centers', async t => {
  const { doc, click, resize } = await mount(t);
  const plot = () => doc.querySelector('.cursor-crosshair');
  const marks = () => [...plot().querySelectorAll('a[aria-label]')];
  const dates = () => marks().map(el => [el.getAttribute('aria-label'), el.style.left]);
  const originalDates = dates();
  const originalHeight = parseFloat(plot().style.height);
  await click(doc.querySelector('button[aria-label="Fold side panel to show the full year"]'));
  await resize(800);
  assert.deepEqual(dates(), originalDates, 'Repacking must not nudge any actual date');
  const rows = new Map();
  for (const mark of marks()) {
    assert.equal(mark.style.height, '34px', 'Categorical brand tokens remain 34px');
    const row = mark.style.top;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(parseFloat(mark.style.left) / 100 * 800);
  }
  for (const positions of rows.values()) {
    positions.sort((a, b) => a - b);
    for (let i = 1; i < positions.length; i++) assert.ok(positions[i] - positions[i - 1] >= 38 - 1e-8, `Logo tokens overlap at ${positions[i - 1]} / ${positions[i]}`);
  }
  assert.ok(parseFloat(plot().style.height) > originalHeight, 'Extra packed rows must expand the lane height');
  await resize(1360);
  assert.deepEqual(dates(), originalDates);
  assert.equal(parseFloat(plot().style.height), originalHeight);
});

test('expanded Clinical subcategory legend wraps within the available width', async t => {
  const { doc, click } = await mount(t);
  const button = [...doc.querySelectorAll('button[aria-expanded]')].find(el => el.textContent.startsWith('Clinical'));
  await click(button);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.match(button.parentElement.className, /flex-wrap/);
  assert.match(button.parentElement.className, /w-full/);
  const sub = doc.querySelector('button[aria-pressed]');
  assert.match(sub.parentElement.className, /flex-wrap/);
  assert.match(sub.parentElement.parentElement.className, /min-w-0/);
});

test('January text anchors inside the plot without moving any month date coordinate', () => {
  const dom = render();
  const labels = [...dom.window.document.querySelectorAll('div')].filter(el => el.childElementCount === 0 && /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(el.textContent));
  const start = Date.UTC(2026, 0, 1), end = Date.UTC(2026, 11, 31);
  labels.forEach((label, i) => assert.equal(parseFloat(label.parentElement.style.left), (Date.UTC(2026, i, 1) - start) / (end - start) * 100));
  assert.doesNotMatch(labels[0].className, /-translate-x-1\/2/);
  assert.match(labels[1].className, /-translate-x-1\/2/);
  dom.window.close();
});

test('collapsed years reserve readable labels inside a locally scrolling year strip', () => {
  const dom = render();
  const years = [...dom.window.document.querySelectorAll('button[aria-label^="Focus "]')];
  assert.equal(years.length, 2);
  for (const year of years) {
    assert.ok(parseFloat(year.style.minWidth) >= 72, 'Year and capital must fit without clipping at 320px');
    assert.match(year.parentElement.className, /overflow-x-auto/);
    assert.ok(parseFloat(year.parentElement.lastElementChild.style.minWidth) >= 240);
  }
  dom.window.close();
});

test('milestone labels use at least 12px neutral type instead of tiny faint or colored text', () => {
  const dom = render();
  const elements = [...dom.window.document.querySelectorAll('[class]')];
  assert.deepEqual(elements.filter(el => /text-\[(9|10|11)px\]|text-faint/.test(el.className)).map(el => el.textContent), []);
  const capitalHeading = elements.find(el => el.tagName === 'SPAN' && el.textContent === 'Capital' && el.parentElement.style.background);
  assert.equal(capitalHeading.style.color, '');
  assert.match(capitalHeading.className, /text-foreground/);
  dom.window.close();
});
