import test from 'node:test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parsePublicationSnapshot, selectPublicationCharts, PUBLICATION_SECTORS } from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, fixtureOptions } from './fixtures/publication-synthetic.mjs';

test('affiliation-change selector retains all four origins and every explicit off-diagonal count', () => {
  const snapshot = syntheticPublicationSnapshot();
  const selected = selectPublicationCharts(parsePublicationSnapshot(snapshot, fixtureOptions));
  assert.deepEqual(new Set(selected.transitions.map(row => row.from)), new Set(PUBLICATION_SECTORS));
  assert.equal(selected.transitions.flatMap(row => row.destinations).length, 12);
  for (const source of snapshot.tables.nt_talent_moves.rows) {
    const row = selected.transitions.find(row => row.from === source[0]);
    assert.equal(row.total, source.slice(1).reduce((sum, n) => sum + (n ?? 0), 0));
    for (const dest of row.destinations) {
      assert.notEqual(dest.sector, row.from);
      assert.equal(dest.count, source[PUBLICATION_SECTORS.indexOf(dest.sector) + 1]);
      assert.equal(dest.share, row.total ? dest.count / row.total * 100 : 0);
    }
  }
  assert.equal(selected.transitions.find(row => row.from === 'No listed affiliation').destinations.find(d => d.sector === 'Academic').count, 1);
  assert.equal(selected.transitions.find(row => row.from === 'Other institutions').destinations.find(d => d.sector === 'Industry').count, 0, 'Explicit zero stays distinct from the null diagonal');
});


test('one shared count scale conserves all four origin and destination nodes', async () => {
  assert.ok(existsSync(new URL('../src/lib/publication-sankey.ts', import.meta.url)), 'Shared-count Sankey layout is implemented');
  const { buildPublicationSankey } = await import('../src/lib/publication-sankey.ts');
  const data = selectPublicationCharts(parsePublicationSnapshot(syntheticPublicationSnapshot(), fixtureOptions));
  const layout = buildPublicationSankey(data.transitions);
  assert.equal(layout.sources.length, 4); assert.equal(layout.targets.length, 4);
  assert.equal(layout.total, data.transitions.reduce((sum, row) => sum + row.total, 0));
  assert.equal(layout.links.length, 11, 'Only the explicit zero cell has no ribbon');
  for (const node of [...layout.sources, ...layout.targets]) {
    const links = layout.links.filter(link => (node.side === 'source' ? link.from : link.to) === node.sector);
    assert.ok(Math.abs(node.height - node.count * layout.scale) < 1e-8);
    assert.ok(Math.abs(links.reduce((sum, link) => sum + link.width, 0) - node.height) < 1e-8);
    for (const link of links) {
      const y = node.side === 'source' ? link.sourceY : link.targetY;
      assert.ok(y >= node.y - 1e-8 && y + link.width <= node.y + node.height + 1e-8);
      assert.equal(link.width, link.count * layout.scale);
    }
  }
});


test('complete endpoint selection includes same-sector counts, while an old missing matrix stays unavailable', () => {
  const snapshot = syntheticPublicationSnapshot();
  assert.equal(selectPublicationCharts(snapshot).endpointTransitions, null);
  snapshot.tables.nt_talent_endpoints = { columns: snapshot.tables.nt_talent_moves.columns,
    rows: snapshot.tables.nt_talent_moves.rows.map((row, i) => row.map((cell, j) => j === i + 1 ? 10 + i : cell)) };
  const data = selectPublicationCharts(snapshot);
  assert.equal(data.endpointTransitions.length, 4);
  assert.equal(data.endpointTransitions.flatMap(row => row.destinations).length, 16);
  for (const row of data.endpointTransitions) assert.ok(row.destinations.find(d => d.sector === row.from).count >= 10);
});


test('rendered Sankey includes complete same/different-sector ribbons and eight directly labeled nodes', async () => {
  assert.ok(existsSync(new URL('../src/components/publication-sankey.tsx', import.meta.url)), 'Rendered full-cohort Sankey is implemented');
  const React = (await import('react')).default;
  globalThis.React = React;
  const { act } = await import('react');
  const { mount } = await import('./modal-helpers.mjs');
  const { PublicationSankey } = await import('../src/components/publication-sankey.tsx');
  const snapshot = syntheticPublicationSnapshot();
  snapshot.tables.nt_talent_endpoints = { columns: snapshot.tables.nt_talent_moves.columns,
    rows: snapshot.tables.nt_talent_moves.rows.map((row, i) => row.map((cell, j) => j === i + 1 ? 10 + i : cell)) };
  const data = selectPublicationCharts(snapshot); let inspected = '';
  const cleanup = await mount(React.createElement(PublicationSankey, { data, inspect: text => inspected = text }));
  try {
    const svg = document.querySelector('svg');
    assert.equal(svg.querySelectorAll('[data-sankey-node]').length, 8);
    assert.equal(svg.querySelectorAll('[data-sankey-label]').length, 8);
    assert.equal(svg.querySelectorAll('[data-publication-mark]').length, 15);
    assert.equal(svg.querySelectorAll('[data-same-sector="true"]').length, 4);
    assert.equal(inspected, '');
    for (const source of data.endpointTransitions) for (const dest of source.destinations) {
      const mark = svg.querySelector(`[data-from="${source.from}"][data-to="${dest.sector}"]`);
      if (!dest.count) { assert.equal(mark, null); continue; }
      assert.equal(Number(mark.dataset.value), dest.count);
      assert.ok(mark.getAttribute('aria-label').includes(source.label));
      assert.ok(mark.getAttribute('aria-label').includes(dest.label));
    }
    const same = svg.querySelector('[data-same-sector="true"]');
    await act(async () => same.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })));
    assert.match(inspected, /Same sector at first and latest paper/);
    assert.doesNotMatch(inspected, /never changed|stayed throughout/i);
  } finally { await cleanup(); }
});


test('zero and very skewed endpoint matrices stay finite without inflating thin ribbons', async () => {
  const { buildPublicationSankey } = await import('../src/lib/publication-sankey.ts');
  for (const largest of [0, 1000000000]) {
    const transitions = PUBLICATION_SECTORS.map((from, i) => ({ from, label: from,
      destinations: PUBLICATION_SECTORS.map((sector, j) => ({ sector, count: largest ? i === 0 && j === 0 ? largest : 1 : 0, share: 0, offset: 0, label: sector, color: '#000' })) }));
    for (const row of transitions) row.total = row.destinations.reduce((sum, d) => sum + d.count, 0);
    const result = buildPublicationSankey(transitions);
    assert.ok(Number.isFinite(result.scale));
    assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
    assert.equal(result.links.length, largest ? 16 : 0);
    if (largest) {
      const tiny = result.links.find(link => link.count === 1);
      assert.ok(tiny.width > 0 && tiny.width < .001, 'No artificial minimum flow width');
    } else assert.equal(result.total, 0);
  }
});
