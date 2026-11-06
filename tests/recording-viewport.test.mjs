import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));

test('a single optical observation is revealed in a narrow plot without selecting it or changing source geometry', async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  const observers = [];
  const dimensions = { client: 246, scroll: 560 };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance, flat: true, selection: ['simultaneously-recorded-neurons'] }), '', win => {
    win.history.replaceState(null, '', '/field-velocity?recordingView=optical#simultaneously-recorded-neurons');
    globalThis.ResizeObserver = win.ResizeObserver = Observer;
    for (const [property, metric] of [['clientWidth', 'client'], ['scrollWidth', 'scroll']]) {
      Object.defineProperty(win.HTMLElement.prototype, property, { configurable: true, get() {
        return this.classList.contains('pc-chart-scroll') && this.closest('[data-recording-view]') ? dimensions[metric] : 0;
      } });
    }
  });
  try {
    const plot = document.querySelector('dialog .pc-chart-scroll');
    const svg = plot.querySelector('svg');
    const geometry = svg.outerHTML;
    assert.equal(plot.scrollLeft, (dimensions.scroll - dimensions.client) / 2, 'Reveal the one source mark instead of opening an empty left-hand slice');
    assert.equal(document.querySelector('dialog .pc-point-readout').textContent, '', 'Revealing a mark is not inspecting it');
    assert.equal(svg.querySelector('[data-curve-point]').dataset.value, '1136223');
    const observer = observers.find(item => item.target === plot);
    assert.ok(observer, 'Viewport changes keep the single mark reachable');
    dimensions.client = dimensions.scroll = 720;
    await act(async () => observer.callback([]));
    assert.equal(plot.scrollLeft, 0);
    assert.equal(svg.outerHTML, geometry, 'Scrolling never changes the plotted source geometry');
    dimensions.client = 246; dimensions.scroll = 560;
    await act(async () => observer.callback([]));
    assert.equal(plot.scrollLeft, (560 - 246) / 2);
    await act(async () => {
      const select = document.querySelector('[data-recording-view-select]');
      select.value = 'human-channels'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(plot.scrollLeft, 0, 'A multi-point view starts at its source axis rather than retaining the optical offset');
  } finally {
    await cleanup();
    if (saved) Object.defineProperty(globalThis, 'ResizeObserver', saved); else delete globalThis.ResizeObserver;
  }
});
