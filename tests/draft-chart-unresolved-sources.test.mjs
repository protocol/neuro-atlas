import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const source = DRAFT_CHART_EVIDENCE['Brain tissue mapped over time'].plots[0];
// Rehearse missing provenance links by omitting only a real observation's URL;
// coordinates, reported values, source title and quotation remain unchanged.
for (const sourceUrl of [undefined, '']) test(`a ${sourceUrl === undefined ? 'missing' : 'blank'} observation URL renders plain provenance, never a fabricated source link`, async () => {
  const before = JSON.stringify(source);
  const plot = { ...source, points: source.points.map((point, index) => index ? point : { ...point, sourceUrl }) };
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: 'metric-panel-bci-bitrate' }), '#bci-information-transfer-over-time');
  try {
    const dialog = document.querySelector('dialog[open]');
    assert.ok(dialog);
    const first = plot.points[0];
    const rows = [...dialog.querySelectorAll('.draft-plot-data tbody tr')];
    assert.equal(rows[0].querySelectorAll('a').length, 0, 'An unidentified source has no clickable placeholder');
    assert.ok(rows[0].textContent.includes(first.sourceTitle), 'The unresolved source title remains readable');
    assert.equal(rows[0].querySelector('blockquote').textContent, first.quote);
    const expectedLinks = [...new Set(plot.points.flatMap(point => [point.sourceUrl, ...(point.supportingReferences ?? []).map(reference => reference.url)]).filter(Boolean))];
    assert.ok(expectedLinks.includes('https://pmc.ncbi.nlm.nih.gov/articles/PMC6063995/'), 'The confirmed original FAFB reference remains a real source alongside the other intact principal URLs');
    assert.deepEqual([...dialog.querySelectorAll('.pc-sources a')].map(link => link.href), expectedLinks, 'Only verified nonempty source URLs populate Sources');
    assert.equal(dialog.querySelector('[role=tooltip]'), null);
    const mark = dialog.querySelector(`[data-source-observation="${first.id}"]`);
    await act(async () => mark.focus());
    const tooltip = dialog.querySelector('[role=tooltip]');
    assert.ok(tooltip.textContent.includes(first.sourceTitle));
    assert.equal(tooltip.querySelectorAll('a').length, 0, 'The popover also presents an unresolved source as plain text');
    await act(async () => mark.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    for (const [index, point] of plot.points.entries()) {
      if (index) assert.equal(rows[index].querySelector('a').href, point.sourceUrl, 'Known record URLs remain intact');
    }
    assert.equal(JSON.stringify(source), before);
  } finally { await cleanup(); }
});
