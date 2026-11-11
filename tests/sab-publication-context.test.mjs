import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const snapshot = JSON.parse(readFileSync(new URL('../src/data/publications/publication-charts.snapshot.json', import.meta.url), 'utf8'));
const count = n => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const endpointTotal = snapshot.tables.nt_talent_endpoints.rows.reduce((sum, row) => sum + row.slice(1).reduce((n, value) => n + value, 0), 0);
const annualTotal = snapshot.tables.nt_talent_table.rows.reduce((sum, row) => sum + row[2], 0);

test('affiliation detail prominently identifies the selected author cohort without changing any cell', async () => {
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sector-changes');
  try {
    const modal = document.querySelector('dialog[open]');
    const context = modal.querySelector('[data-author-cohort-context]');
    assert.ok(context, 'Cohort context is visible before the full Sankey');
    assert.ok(context.textContent.includes(`${count(endpointTotal)} unique OpenAlex authors`), 'Displayed cohort equals all sixteen source cells');
    assert.match(context.textContent, /selected BCI\/EEG and neural-engineering topics/);
    assert.match(context.textContent, /2016–2025.*at least two active publication years/);
    assert.match(context.textContent, /Census coverage and employment histories are unmeasured/);
    assert.ok(context.compareDocumentPosition(modal.querySelector('.publication-full-plot')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    const download = JSON.parse(decodeURIComponent(modal.querySelector('a[download$="-source.json"]').href.split(',')[1]));
    assert.deepEqual(download.tables.nt_talent_endpoints, snapshot.tables.nt_talent_endpoints);
    assert.deepEqual(download.tables.nt_talent_moves, snapshot.tables.nt_talent_moves);
  } finally { await cleanup(); }
});

test('sector counts visibly describe unique publishing authors during the source year', async () => {
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sectors');
  try {
    const context = document.querySelector('dialog[open] [data-author-cohort-context]');
    assert.ok(context, 'Visible data-scope context exists');
    assert.ok(context.textContent.includes(`${count(annualTotal)} unique OpenAlex authors`), 'Annual author count equals the current source-sector totals');
    assert.match(context.textContent, /papers in 2025/);
    assert.match(context.textContent, /selected BCI\/EEG and neural-engineering topics/);
    assert.match(context.textContent, /Universities is a paper-affiliation category/);
  } finally { await cleanup(); }
});

test('regional reading distinguishes endpoint output growth from its matched background without inventing causes', async () => {
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#publication-growth');
  try {
    const context = document.querySelector('dialog[open] [data-regional-reading]');
    assert.ok(context, 'Visible data-scope context exists');
    const europe = snapshot.matchedGrowth.rows.find(row => row.id === 'europe');
    const start = europe.numeratorCounts['2022'], end = europe.numeratorCounts['2025'];
    const reference = europe.referenceCounts;
    assert.ok(context.textContent.includes(`Europe: ${count(start)} → ${count(end)} indexed works (+${count((end / start - 1) * 100)}%)`), 'Europe reading uses current independently acquired numerator endpoints');
    assert.ok(context.textContent.includes(`all-field European output grew +${count((reference['2025'] / reference['2022'] - 1) * 100)}%`), 'European context uses its matched all-field denominator');
    assert.match(context.textContent, /2022–2025/);
    assert.match(context.textContent, /causes and within-period acceleration require separate evidence/);
    assert.doesNotMatch(context.textContent, /funding cuts|regulation|brain drain/i);
  } finally { await cleanup(); }
});
