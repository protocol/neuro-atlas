import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { FundingSourceContext } from '../src/components/funding-source-context.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const data = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const precision = data.reportedTotals.find(total => total.companySlug === 'precision-neuroscience');
const note = 'Possible overlap between round and SAFE disclosures.';
const row = () => document.querySelector('[data-funding-company-identity="precision-neuroscience"]').closest('button');

test('Precision source view keeps the published total and identifies the announcement accurately', async () => {
  const cleanup = await mount(React.createElement(FundingSourceContext, { source: precision.sourceUrl }));
  try {
    const context = document.querySelector('#source-context');
    assert.equal(context.textContent.includes('Company-reported total · $430M*'), true);
    assert.equal(context.querySelector('[data-reported-total-footnote]').textContent, `* ${note}`);
    assert.equal(context.textContent.includes('interview published'), false, 'Precision citation is an issuer announcement');
    assert.equal(context.querySelector('a').href, precision.sourceUrl);
    assert.equal(context.querySelector('time').dateTime, '2026-09-24');
  } finally { await cleanup(); }
});

test('Precision keeps the published $430M headline with a visible possible-overlap asterisk', async () => {
  assert.equal(precision.amountUsdM, 430);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click(row());
    const dialog = document.querySelector('[role="dialog"]');
    const headline = dialog.querySelector('.text-4xl');
    assert.equal(headline.textContent, '$430M*');
    assert.equal(headline.parentElement.textContent.includes('Company-reported total'), true);
    const footnote = dialog.querySelector('[data-reported-total-footnote]');
    assert.ok(footnote !== null, 'explanatory asterisk text is visible without opening Source notes');
    assert.equal(footnote.textContent, `* ${note}`);
    assert.equal(footnote.closest('details'), null);
    assert.equal(dialog.querySelector('[data-indexed-financing-summary]').textContent.includes('$405M'), true);
    assert.equal([...dialog.querySelectorAll('a')].some(a => a.href === precision.sourceUrl), true);
    assert.equal(footnote.textContent.includes('included in'), false, 'the SAFE explanation remains a possibility');
  } finally { await cleanup(); }
});

test('Precision timeline and stage annotations retain $430M with the same visible caveat', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const assertAnnotation = companyRow => {
      const annotation = companyRow.querySelector('[data-reported-company-total]');
      assert.equal(annotation.querySelector('.font-semibold').textContent, '$430M* company-reported total');
      assert.equal(annotation.querySelector('[data-reported-total-footnote]').textContent, `* ${note}`);
      assert.equal(companyRow.textContent.includes('$405M'), true);
    };
    assertAnnotation(row());
    const paradromics = document.querySelector('[data-funding-company-identity="paradromics"]').closest('button');
    assert.equal(paradromics.querySelector('[data-reported-total-footnote]'), null, 'Precision caveat does not leak to other company reports');
    await click([...document.querySelectorAll('button')].find(button => button.textContent === 'stage'));
    const stageRow = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Precision Neuroscience'));
    assertAnnotation(stageRow);
  } finally { await cleanup(); }
});
