import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { PublicationCharts, publicationExportNotes } from '../src/components/publication-charts.tsx';
import { parsePublicationSnapshot, selectPublicationCharts, PUBLICATION_SECTORS } from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, syntheticPublicationEndpointSnapshot, fixtureOptions } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;

test('first/latest affiliations use every full-cohort cell in preview, detail, source JSON and PNG', async () => {
  const snapshot = syntheticPublicationEndpointSnapshot();
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const data = selectPublicationCharts(parsed);
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sector-changes');
  try {
    const expected = data.endpointTransitions.flatMap(row => row.destinations.filter(d => d.count > 0));
    for (const svg of [document.querySelector('[data-publication-card="researcher-sector-changes"] .publication-preview svg'), document.querySelector('dialog .publication-full-plot svg')]) {
      assert.equal(svg.querySelectorAll('[data-sankey-label]').length, 8);
      assert.equal(svg.querySelectorAll('[data-publication-mark]').length, expected.length);
      assert.equal(svg.querySelectorAll('[data-same-sector="true"]').length, 4);
      for (const row of data.endpointTransitions) for (const dest of row.destinations) {
        const mark = svg.querySelector(`[data-publication-mark][data-from="${row.from}"][data-to="${dest.sector}"]`);
        assert.equal(mark !== null, dest.count > 0);
        if (mark) assert.equal(Number(mark.getAttribute('data-value')), dest.count);
      }
      for (const side of ['source', 'target']) assert.deepEqual(new Set([...svg.querySelectorAll(`[data-sankey-node][data-side="${side}"]`)].map(n => n.dataset.sector)), new Set(PUBLICATION_SECTORS));
      assert.equal(svg.querySelectorAll('[data-change-leader]').length, 0);
    }
    const modal = document.querySelector('dialog');
    assert.match(modal.querySelector('[data-change-subtitle]').textContent, /2016–2025.*two active publication years.*widths show people.*same-sector/i);
    const download = JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1]));
    assert.deepEqual(download.tables.nt_talent_endpoints, snapshot.tables.nt_talent_endpoints);
    assert.deepEqual(download.tables.nt_talent_moves, snapshot.tables.nt_talent_moves);
    const { buildChartImage } = await import('../src/lib/chart-export.ts');
    const image = buildChartImage({ svg: modal.querySelector('.publication-full-plot svg'), title: 'First and latest affiliations', anchor: 'researcher-sector-changes', notes: publicationExportNotes(3, parsed, data) }, 'https://atlas.example/field-velocity');
    assert.match(image.svg, /One shared people-count scale/);
    assert.match(image.svg, /same sector at first\/latest paper/);
    for (const row of data.endpointTransitions) assert.ok(image.svg.includes(`From ${row.label} (${row.total} people)`));
    assert.doesNotMatch(image.svg, /Each displayed origin is normalized|university and company origins/);
  } finally { await cleanup(); }
});

test('old changes-only snapshots do not manufacture same-sector zeros or a complete-looking Sankey', async () => {
  const snapshot = syntheticPublicationSnapshot();
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sector-changes');
  try {
    const modal = document.querySelector('dialog');
    assert.equal(modal.querySelectorAll('[data-publication-mark]').length, 0);
    assert.match(modal.textContent, /Complete endpoint counts unavailable/);
    assert.ok(modal.querySelector('[data-copy-chart]').disabled);
    assert.ok(modal.querySelector('[data-download-chart]').disabled);
  } finally { await cleanup(); }
});
