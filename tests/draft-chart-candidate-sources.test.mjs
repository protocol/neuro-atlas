import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;

// Renderer-only synthetic evidence; never published as a study attribution.
const candidate = { title: 'Candidate paper', url: 'https://example.org/candidate', note: 'Related task, but the original figure does not identify this mark.' };
const plot = {
  id: 'candidate-fixture', title: 'Candidate source fixture', xLabel: 'Year', yLabel: 'Rate', xKind: 'year', scale: 'log', scope: 'Synthetic renderer fixture.',
  points: [{ id: 'unknown', x: 2016, y: 0.16, label: 'Anonymous mark', dateLabel: '2016 slide position', sourceTitle: 'Original assignment unresolved', quote: 'Unlabeled mark', annotation: 'Anonymous mark · Image estimate', candidateSources: [candidate] }],
};

test('unconfirmed candidates are useful linked leads, never the primary source attribution', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    const row = document.querySelector('tbody tr');
    const candidates = row.querySelector('[data-candidate-sources]');
    assert.ok(candidates, 'Show candidate evidence in the persistent source table');
    assert.match(candidates.textContent, /assignment unconfirmed/i);
    assert.equal(candidates.querySelector('a').href, candidate.url);
    assert.ok(candidates.textContent.includes(candidate.note));
    await act(async () => document.querySelector('[data-source-observation]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const tip = document.querySelector('[role=tooltip]');
    assert.match(tip.querySelector('[data-candidate-sources]').textContent, /assignment unconfirmed/i);
    assert.equal(tip.querySelector('a').href, candidate.url);
    assert.ok(tip.textContent.includes('Original assignment unresolved'));
  } finally { await cleanup(); }
});
