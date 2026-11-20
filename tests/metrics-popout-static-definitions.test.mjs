import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { BCI_BITRATE_EVIDENCE } from '../src/data/bci-bitrate.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('BCI popout uses a static definition section and keeps coverage once in Source notes', async () => {
  const cleanup = await mount(React.createElement(Page), '#metric-panel-bci-bitrate');
  try {
    const modal = document.querySelector('dialog[open]');
    const method = modal.querySelector('[data-draft-methodology]');
    assert.equal(method.tagName, 'SECTION', 'Definition and comparability is not a disclosure');
    assert.equal(method.querySelector('h3')?.textContent, 'Definition and comparability');
    assert.ok(method.querySelector('summary') === null, 'No collapse affordance');
    assert.ok(modal.querySelector('.mx-left .draft-chart-summary') === null, 'No floating, redundant BCI coverage summary');
    const plot = BCI_BITRATE_EVIDENCE.plots[0];
    const coverage = modal.querySelector('[data-draft-sources-scope]');
    assert.equal(coverage.textContent, plot.scope, 'Complete original coverage survives in Source notes');
    assert.equal(modal.querySelectorAll('[data-draft-sources-scope]').length, 1);
    assert.equal(modal.querySelectorAll('.mx-data tbody tr').length, plot.points.length);
  } finally { await cleanup(); }
});

test('other curated popout summaries belong inside their static definition section', async () => {
  const cleanup = await mount(React.createElement(Page), '#metric-recording-hours');
  try {
    const modal = document.querySelector('dialog[open]');
    const method = modal.querySelector('[data-draft-methodology]');
    assert.equal(method.tagName, 'SECTION');
    assert.ok(method.querySelector('.draft-chart-summary')?.textContent.trim(), 'The unique explanation belongs to its section');
    assert.ok(modal.querySelector('.mx-left > .draft-chart-summary') === null, 'No unowned paragraph above the heading');
    assert.ok(modal.querySelector('.mx-data details > summary'), 'The long data table remains a disclosure');
  } finally { await cleanup(); }
});
