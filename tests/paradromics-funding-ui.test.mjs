import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { FundingSourceContext } from '../src/components/funding-source-context.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const data = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const label = 'Excluded from indexed total — conversion overlap unresolved';
const held = data.rounds.find(r => r.companySlug === 'paradromics' && r.capitalTreatment);

test('the funding timeline and detail show the held 2022 source amount without implying it enters the total', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const row = document.querySelector('[data-funding-company-identity="paradromics"]').closest('button');
    assert.equal(row.textContent.includes('$85.4M'), true);
    assert.equal(row.textContent.includes('4 financing records'), true);
    assert.equal(row.textContent.includes('1 record excluded from total'), true);
    const readout = [...row.querySelectorAll('[data-financing-readout]')].find(e => e.textContent.includes('2022'));
    assert.equal(readout.textContent.includes(held.displayAmount), true);
    assert.equal(readout.textContent.includes(label), true);
    const bar = [...row.querySelectorAll('[title]')].find(e => e.title.includes('Equity/debt financing'));
    assert.equal(bar.title.includes(label), true);
    assert.equal(bar.classList.contains('border-dashed'), true, 'excluded financing has a distinct hollow marker');
    await click(row);
    const dialog = document.querySelector('[role="dialog"]');
    assert.equal(dialog.textContent.includes('$85.4M'), true);
    assert.equal(dialog.textContent.includes('1 financing record excluded from indexed financing'), true);
    assert.equal(dialog.querySelectorAll('section article').length >= 4, true);
    const article = [...dialog.querySelectorAll('article')].find(e => e.textContent.includes('Equity/debt financing'));
    assert.equal(article.textContent.includes('Reported Sep 21, 2022'), true);
    assert.equal(article.textContent.includes(held.displayAmount), true);
    assert.equal(article.textContent.includes(label), true);
    assert.equal(article.textContent.includes('2022-02-17'), true);
    assert.equal(article.querySelector('a').href, held.sourceUrl);
    await click(document.querySelector('[aria-label="Close detail panel"]'));
    await click([...document.querySelectorAll('button')].find(e => e.textContent === 'stage'));
    const stage = [...document.querySelectorAll('button')].find(e => e.textContent.includes('Paradromics'));
    assert.equal(stage.textContent.includes('$85.4M'), true);
    assert.equal(stage.textContent.includes('1 record excluded from total'), true);
    assert.equal(document.body.textContent.includes('Paradromics financing correction reviewed Nov 24, 2026'), true);
  } finally { await cleanup(); }
});

test('source context explicitly labels a held financing as excluded rather than only showing its amount', () => {
  const html = renderToStaticMarkup(React.createElement(FundingSourceContext, { source: held.sourceUrl }));
  assert.equal(html.includes(label), true);
  assert.equal(html.includes(held.displayAmount), true);
});


test('original announcement source deep links still resolve to participant evidence, not the later amended amount', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/paradromics-funding-20261124.json', import.meta.url)));
  for (const original of fixture.before.fundingRounds.slice(1)) {
    const html = renderToStaticMarkup(React.createElement(FundingSourceContext, { source: original.sourceUrl }));
    assert.equal(html.includes('Named-investor evidence'), true, original.sourceUrl);
    assert.equal(html.includes('Supports investor inclusion, not the indexed round amount'), true);
    assert.equal(html.includes('Round evidence'), false, 'earlier source must not be presented as proof of the amended amount');
  }
});
