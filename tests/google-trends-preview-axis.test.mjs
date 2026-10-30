import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';

test('Google Trends mini previews keep numeric and date axes visible inside their SVG frame', async () => {
  globalThis.React = React;
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  const css = readFileSync('src/components/google-trends.css', 'utf8');
  const dom = new JSDOM(`<style>${css}</style>${renderToStaticMarkup(React.createElement(GoogleTrends, { flat: true }))}`);
  for (const svg of dom.window.document.querySelectorAll('.gt-preview svg')) {
    const [left, top, width, height] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const labels = [...svg.querySelectorAll('text')];
    assert.deepEqual(labels.slice(0, 3).map(node => node.textContent), ['0', '50', '100']);
    assert.equal(labels.filter(node => /^\d{4}-\d{2}$/.test(node.textContent)).length, 2, 'Both timeline endpoints are present');
    for (const label of labels) {
      assert.notEqual(dom.window.getComputedStyle(label).display, 'none', 'Preview numeric/date axes must not be CSS-hidden');
      const x = Number(label.getAttribute('x')), y = Number(label.getAttribute('y'));
      assert.ok(x >= left && x <= left + width && y > top && y < top + height, 'Preview viewBox must include every axis-label baseline');
    }
  }
  dom.window.close();
});

test('Google Trends preview tick labels use the same 11px coordinate font as curated previews', async () => {
  globalThis.React = React;
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  const css = readFileSync('src/components/google-trends.css', 'utf8');
  const dom = new JSDOM(`<style>${css}</style>${renderToStaticMarkup(React.createElement(GoogleTrends, { flat: true }))}`);
  for (const label of dom.window.document.querySelectorAll('.gt-preview svg text')) {
    assert.equal(dom.window.getComputedStyle(label).fontSize, '11px', 'Preview numeric/date tick typography must match curated charts');
  }
  const source = readFileSync('src/components/google-trends.tsx', 'utf8');
  assert.match(source, /ResizeObserver/, 'A fixed SVG viewBox must not scale the tick font as cards widen');
  dom.window.close();
});

test('Google Trends preview coordinate width follows card resize and retains the last usable hidden width', async () => {
  globalThis.React = React;
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  const previous = globalThis.ResizeObserver;
  const observed = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observed.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  let cleanup;
  try {
    cleanup = await mount(React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] }));
    assert.equal(observed.length, 1, 'Compact chart must observe its actual card width');
    const svg = document.querySelector('.gt-preview svg');
    for (const width of [520, 224]) {
      await act(async () => observed[0].callback([{ target: observed[0].target, contentRect: { width } }]));
      assert.equal(Number(svg.getAttribute('viewBox').split(/\s+/)[2]), width, 'Preview coordinates must match rendered CSS width so 11px ticks do not scale');
      const labels = [...svg.querySelectorAll('text')].slice(-2).map(label => label.textContent);
      assert.ok(labels.every(label => width < 240 ? /^\d{4}$/.test(label) : /^\d{4}-\d{2}$/.test(label)), 'Narrow timeline labels shorten to years instead of overlapping');
    }
    await act(async () => observed[0].callback([{ target: observed[0].target, contentRect: { width: 0 } }]));
    assert.equal(Number(svg.getAttribute('viewBox').split(/\s+/)[2]), 224, 'Hidden siblings retain the last usable coordinate frame');
  } finally {
    if (cleanup) await cleanup();
    if (previous === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = previous;
  }
  assert.ok(observed[0].disconnected, 'Resize observation is released on unmount');
});
