import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { PublicationCharts, publicationExportNotes } from '../src/components/publication-charts.tsx';
import { parsePublicationSnapshot, selectPublicationCharts, PUBLICATION_ANCHORS, PUBLICATION_GROWTH_GROUPS } from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, syntheticMatchedGrowth, fixtureOptions } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;

for (const [index, anchor] of PUBLICATION_ANCHORS.entries()) test(`${anchor}: source tables and download payload stay intact`, async () => {
  const snapshot = { ...syntheticPublicationSnapshot(), matchedGrowth: syntheticMatchedGrowth() };
  const names = index === 0 ? ['nt_yearly'] : index === 1 ? ['nt_yearly', ...PUBLICATION_GROWTH_GROUPS.map(group => group.table)] : index === 2 ? ['nt_talent_table'] : ['nt_talent_moves'];
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#' + anchor);
  try {
    const modal = document.querySelector('dialog[open]');
    const payload = JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1]));
    assert.deepEqual(payload, {
      chart: anchor, snapshotSchemaVersion: snapshot.schemaVersion, source: snapshot.source,
      tables: Object.fromEntries(names.map(name => [name, snapshot.tables[name]])), audit: snapshot.audit,
      ...(index === 1 ? { matchedGrowth: snapshot.matchedGrowth } : {}),
    });
    for (const name of names) {
      const table = [...modal.querySelectorAll('.pc-provenance table')].find(el => el.querySelector('caption').textContent === name);
      assert.deepEqual([...table.querySelectorAll('thead th')].map(el => el.textContent), snapshot.tables[name].columns.map(column => column.name));
      assert.deepEqual([...table.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(el => el.textContent)), snapshot.tables[name].rows.map(row => row.map(cell => cell === null ? '—' : String(cell))));
    }
    assert.deepEqual([...modal.querySelectorAll('.pc-sources a')].map(el => el.href), [snapshot.source.url + '/', 'https://docs.openalex.org/']);
  } finally { await cleanup(); }
});

test('publication previews state readable corpus scopes before technical provenance', async () => {
  const snapshot = { ...syntheticPublicationSnapshot(), matchedGrowth: syntheticMatchedGrowth() };
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }));
  try {
    const scopes = [...document.querySelectorAll('[data-publication-card] .pc-coverage')].map(el => el.textContent);
    assert.match(scopes[0], /2010–2025.*wider neurotech corpus.*2026-11-05/i);
    assert.match(scopes[1], /2022–2025.*wider corpus and two-topic output/i);
    assert.match(scopes[2], /2025.*two-topic researcher cohort.*2026-11-06/i);
    assert.match(scopes[3], /two-topic.*2016–2025/i);
    for (const scope of scopes) assert.doesNotMatch(scope, /\bNT10\b|\bP2\b/, 'Explain corpus codes in methodology, not preview labels');
    assert.equal(document.querySelectorAll('.publication-preview [data-growth-row]').length, 21);
  } finally { await cleanup(); }
});

test('annual context explains the science index, anchor and four-domain range in export notes', () => {
  const parsed = parsePublicationSnapshot(syntheticPublicationSnapshot(), fixtureOptions);
  const notes = publicationExportNotes(0, parsed, selectPublicationCharts(parsed)).join(' ');
  assert.match(notes, /Science index = source growth-equivalent value \/ actual 2022 neurotech count/);
  assert.match(notes, /right axis is locked to 2022 = 100/);
  assert.match(notes, /minimum–maximum.*life.*social.*physical.*health sciences/i);
  assert.match(notes, /2025-12-31/);
});

test('two-topic chart exports retain the exact cohort definition', () => {
  const parsed = parsePublicationSnapshot(syntheticPublicationSnapshot(), fixtureOptions);
  const data = selectPublicationCharts(parsed);
  for (const index of [1, 2, 3]) {
    const notes = publicationExportNotes(index, parsed, data).join(' ');
    assert.match(notes, /two-topic cohort \(P2\).*brain-computer interfaces.*EEG.*neural engineering.*T10429 and T11601/i);
    assert.doesNotMatch(notes, /employment transitions are unverified|\bwe\b|\bour\b/i);
  }
});

test('growth inspection names its cohort while provenance retains exact source metadata', async () => {
  const snapshot = { ...syntheticPublicationSnapshot(), matchedGrowth: syntheticMatchedGrowth() };
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const data = selectPublicationCharts(parsed);
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#publication-growth');
  try {
    const modal = document.querySelector('dialog[open]');
    const svg = modal.querySelector('.publication-full-plot svg');
    await act(async () => {
      const baseline = modal.querySelector('[data-growth-baseline]');
      baseline.value = 'matched';
      baseline.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await act(async () => svg.querySelector('[data-growth-row="asia"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    const readout = modal.querySelector('[data-publication-inspector]').textContent;
    assert.match(readout, /two-topic corpus \(P2\)/);
    for (const expected of ['2022', '2025', '10 → 15', '+50%', '1,000 → 1,200', '+20%', '30 percentage points', '+25%', 'OpenAlex work ID']) assert.ok(readout.includes(expected), expected);
    assert.equal(svg.querySelectorAll('[data-growth-row]').length, 21);
    assert.equal(svg.querySelectorAll('[data-growth-reference-tick]').length, 9);
    assert.equal(svg.querySelectorAll('[data-reference-unavailable]').length, 12);
    const tableRows = [...modal.querySelectorAll('[aria-label="Growth numerator and matched reference values"] tbody tr')];
    for (const row of data.growth) {
      const rendered = tableRows.find(el => el.querySelector('th').textContent === row.group);
      assert.equal(rendered.querySelectorAll('td')[3].textContent, row.denominatorUniverse ?? "Reference unavailable");
    }
    const notes = publicationExportNotes(1, parsed, data).join(' ');
    assert.match(notes, /venue N = wider-corpus \(NT10\).*region\/institution N = P2 two-topic whole-work involvement/i);
    assert.match(notes, /author-fractional works.*quarterly known coverage/i);
    assert.match(modal.textContent, /full byline/);
    assert.match(modal.textContent, /citations received in the prior five years/);
    assert.match(modal.textContent, /plotted career\/citation endpoints use unrounded fractions/);
  } finally { await cleanup(); }
});

test('sector-change copy identifies the two-topic cohort and within-origin denominator in preview, detail and export', async () => {
  const snapshot = syntheticPublicationSnapshot();
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const data = selectPublicationCharts(parsed);
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sector-changes');
  try {
    const preview = document.querySelector('[data-publication-card="researcher-sector-changes"] .pc-coverage').textContent;
    const modal = document.querySelector('dialog[open]');
    const detail = modal.querySelector('[data-change-subtitle]').textContent;
    const notes = publicationExportNotes(3, parsed, data).join(' ');
    for (const text of [preview, detail, notes]) {
      assert.match(text, /two-topic/i, 'Name the measured cohort without an unexplained code');
      assert.match(text, /2016–2025/);
      assert.match(text, /first.*latest.*publication affiliation/i);
      assert.match(text, /shares.*starting sector.*changers/i, 'The share denominator is each origin’s different-sector cohort');
      assert.doesNotMatch(text, /employment transitions are unverified/i);
    }
    assert.match(modal.querySelector('.pc-methodology').textContent, /T10429 and T11601/, 'Retain the exact topic definition');
    assert.match(modal.textContent, /all four origins and twelve different-sector cells/);
    assert.match(modal.textContent, /distinct active years/);
    const download = JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1]));
    assert.deepEqual(download, {
      chart: 'researcher-sector-changes', snapshotSchemaVersion: snapshot.schemaVersion,
      source: snapshot.source, tables: { nt_talent_moves: snapshot.tables.nt_talent_moves }, audit: snapshot.audit,
    }, 'Editorial changes preserve the complete source-download payload');
  } finally { await cleanup(); }
});

test('growth denominator counts remain in image exports and tables without repeating in the main methodology', async () => {
  const snapshot = { ...syntheticPublicationSnapshot(), matchedGrowth: syntheticMatchedGrowth() };
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const notes = publicationExportNotes(1, parsed, selectPublicationCharts(parsed));
  assert.ok(notes.some(note => note.startsWith('Source counts: Asia: N (P2) 10')), 'Full-image export retains exact underlying N and D counts');
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#publication-growth');
  try {
    const paragraphs = [...document.querySelectorAll('dialog[open] .pc-methodology > p')].map(p => p.textContent);
    assert.equal(paragraphs.some(p => p.startsWith('Source counts:')), false, 'The table owns these repeated values on the page');
    assert.equal(document.querySelectorAll('[aria-label="Growth numerator and matched reference values"] tbody tr').length, 21);
  } finally { await cleanup(); }
});
