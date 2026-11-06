import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { syntheticPublicationSnapshot, syntheticMatchedGrowth } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
const fixture = () => ({ ...syntheticPublicationSnapshot(), matchedGrowth: syntheticMatchedGrowth() });
for (const anchor of ['publication-output', 'publication-growth', 'researcher-sectors', 'researcher-sector-changes']) test(`${anchor}: expanded chart labels stay 12 CSS px across rendered scales`, async () => {
  const prior = globalThis.ResizeObserver;
  const observers = [];
  let scale = 1;
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  let cleanup;
  try {
    cleanup = await mount(React.createElement(PublicationCharts, { snapshot: fixture(), allowTestFixture: true }), `#${anchor}`, window => {
      window.SVGElement.prototype.getScreenCTM = () => ({ a: scale, b: 0 });
      window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 740, height: 370 });
    });
    const svg = document.querySelector('dialog .publication-full-plot svg');
    assert.ok(svg.querySelector('text'), 'Populated chart contains labels');
    for (const next of [.6, 1, 1.4]) {
      scale = next;
      await act(async () => {
        for (const o of observers.filter(o => !o.disconnected)) o.callback([{ contentRect: { width: 740 * scale, height: 370 * scale } }]);
      });
      assert.ok(Math.abs(parseFloat(svg.style.fontSize) * scale - 12) < .001, `Expected 12 rendered px; got ${svg.style.fontSize} × ${scale}`);
    }
    if (anchor === 'publication-output') {
      for (const dot of svg.querySelectorAll('circle[data-publication-mark]')) assert.ok(Math.abs(Number(dot.getAttribute('r')) * scale - 5) < .001, 'Annual observations use the shared 5 CSS px expanded radius');
    }
    assert.equal(svg.getAttribute('data-export-font-size'), '12', 'Standalone export retains canonical type');
  } finally {
    if (cleanup) await cleanup();
    if (prior === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = prior;
  }
});
