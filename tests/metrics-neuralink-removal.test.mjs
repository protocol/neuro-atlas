import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click, settle } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
const engagement = () => document.querySelector('[data-metrics-category="Neurotech field engagement"]');
const identities = () => [...engagement().querySelectorAll('article')].map(card => card.dataset.trendsCard ?? card.dataset.performanceCard);

test('field engagement omits only the Neuralink brand-context chart across expand and collapse', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const expected = ['neurotech', 'idea_vintage', 'latency_compression', 'revealed_commitments', 'publication-output', 'publication-growth', 'researcher-sectors', 'researcher-sector-changes'];
    assert.deepEqual(identities(), expected);
    await click(engagement().querySelector('[data-metric-toggle]'));
    await click(engagement().querySelector('[data-metric-toggle]'));
    await click(document.querySelector('[data-expand-metrics]'));
    assert.deepEqual(identities(), expected);
    assert.equal(document.querySelector('[data-trends-card="neuralink"]'), null);
    assert.ok(document.querySelector('[data-draft-popout="metric-panel-neuralink-cumulative"]'), 'Unrelated Neuralink recording evidence remains');
  } finally { await cleanup(); }
});

test('removed brand chart is neither reopened by its old hash nor retained in engagement search metadata', async () => {
  const cleanup = await mount(React.createElement(Page), '#google-trends-neuralink');
  try {
    await settle();
    assert.equal(document.querySelector('dialog[open]'), null);
    const input = document.querySelector('#metrics-search');
    for (const [query, shouldMatch] of [['Google Trends', true], ['brand context', false]]) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, query);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(!engagement().hidden, shouldMatch, `Engagement search for ${query}`);
    }
  } finally { await cleanup(); }
});
