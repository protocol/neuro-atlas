import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { syntheticPublicationSnapshot, syntheticMatchedGrowth } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
for (const anchor of ['publication-output','publication-growth','researcher-sectors','researcher-sector-changes']) test(`${anchor}: source values float beside a selected mark, without a below-chart placeholder`, async () => {
 const cleanup = await mount(React.createElement(PublicationCharts, {snapshot:{...syntheticPublicationSnapshot(),matchedGrowth:syntheticMatchedGrowth()},allowTestFixture:true}), `#${anchor}`);
 try {
  const modal = document.querySelector('dialog');
  assert.ok(!modal.querySelector('.pc-point-readout'), 'Gray below-chart panel is retired');
  assert.equal(modal.querySelector('[data-point-tooltip]'), null, 'No source popup at rest');
  const mark = modal.querySelector('[data-publication-mark][tabindex="0"]');
  await act(async()=>mark.dispatchEvent(new window.FocusEvent('focusin',{bubbles:true})));
  const popup = modal.querySelector('[data-point-tooltip]');
  assert.ok(popup, 'Keyboard focus reveals source values in the anchored popup');
  assert.ok(popup.textContent.includes(mark.getAttribute('aria-label')), 'Exact source-bearing mark label is retained');
  assert.ok(!popup.closest('.publication-full-plot'), 'Source popup escapes the internally scrolling plot');
  await act(async()=>mark.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(modal.querySelector('[data-point-tooltip]'), null, 'Escape dismisses source popup first');
  assert.ok(document.querySelector('dialog[open]'), 'First Escape keeps chart open');
 } finally { await cleanup(); }
});
