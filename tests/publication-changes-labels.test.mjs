import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { PublicationCharts, publicationExportNotes } from '../src/components/publication-charts.tsx';
import { parsePublicationSnapshot, selectPublicationCharts } from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, fixtureOptions } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;

test('sector-change destinations are directly attached to their segments in preview, detail and export', async () => {
  const snapshot = syntheticPublicationSnapshot();
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const data = selectPublicationCharts(parsed);
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sector-changes');
  try {
    for (const svg of [document.querySelector('[data-publication-card="researcher-sector-changes"] .publication-preview svg'), document.querySelector('dialog .publication-full-plot svg')]) {
      for (const row of data.transitions) for (const dest of row.destinations) {
        const group = svg.querySelector(`[data-change-destination][data-from="${row.from}"][data-to="${dest.sector}"]`);
        assert.ok(group, `${row.from} → ${dest.sector}: one segment/label group`);
        assert.equal(Number(group.querySelector('rect').getAttribute('data-value')), dest.count);
        const label = group.querySelector('[data-change-label]');
        assert.ok(label, 'Visible label belongs to this segment, not a color-key list');
        assert.ok(label.textContent.replaceAll(' ', '').includes(dest.label.replaceAll(' ', '')), dest.label);
        assert.ok(label.textContent.includes(`${Math.round(dest.share * 10) / 10}%`));
        assert.ok(label.textContent.includes(String(dest.count)));
      }
      assert.equal(svg.querySelectorAll('[data-change-label]').length, 6);
      assert.equal(svg.querySelectorAll('[data-change-leader]').length, 0, 'No connectors, matching the reference');
      for (const row of data.transitions) {
        const labels = [...svg.querySelectorAll(`[data-change-destination][data-from="${row.from}"]`)];
        labels.forEach((group, index) => {
          const label = group.querySelector('[data-change-label]');
          assert.equal(label.getAttribute('text-anchor'), index === 2 ? 'end' : 'start');
          if (index < 2) assert.equal(label.getAttribute('x'), group.querySelector('rect').getAttribute('x'));
        });
      }
    }
    const modal = document.querySelector('dialog');
    const subtitle = modal.querySelector('[data-change-subtitle]');
    assert.match(subtitle.textContent, /first neurotech papers in 2016–2025/i);
    assert.match(subtitle.textContent, /latest paper.*different affiliation sector/i);
    assert.match(subtitle.textContent, /shares.*starting sector.*changers/i);
    const { buildChartImage } = await import('../src/lib/chart-export.ts');
    const image = buildChartImage({ svg: modal.querySelector('.publication-full-plot svg'), title: 'Publication-affiliation sector changes', anchor: 'researcher-sector-changes', notes: publicationExportNotes(3, parsed, data) }, 'https://atlas.example/field-velocity');
    assert.match(image.svg, /Companies/);
    assert.match(image.svg, /3%/);
    assert.match(image.svg, /first neurotech papers in 2016–2025/i);
  } finally { await cleanup(); }
});
