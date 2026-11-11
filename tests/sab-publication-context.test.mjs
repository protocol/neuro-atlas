import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const snapshot = JSON.parse(readFileSync(new URL('../src/data/publications/publication-charts.snapshot.json', import.meta.url), 'utf8'));

test('affiliation detail prominently identifies the selected author cohort without changing any cell', async () => {
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot, allowTestFixture: true }), '#researcher-sector-changes');
  try {
    const modal = document.querySelector('dialog[open]');
    const context = modal.querySelector('[data-author-cohort-context]');
    assert.ok(context, 'Cohort context is visible before the full Sankey');
    assert.match(context.textContent, /26,493 unique OpenAlex authors/);
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
    assert.match(context.textContent, /31,001 unique OpenAlex authors/);
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
    assert.match(context.textContent, /Europe: 1,797 → 2,094.*\+16\.5%/);
    assert.match(context.textContent, /all-field European output grew \+6\.8%/);
    assert.match(context.textContent, /2022–2025/);
    assert.match(context.textContent, /causes and within-period acceleration require separate evidence/);
    assert.doesNotMatch(context.textContent, /funding cuts|regulation|brain drain/i);
  } finally { await cleanup(); }
});
