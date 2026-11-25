import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { FundingSourceContext } from '../src/components/funding-source-context.tsx';
import { mount, click } from './modal-helpers.mjs';

const require = createRequire(import.meta.url);
const canonical = require('../src/data/funding-index.json');
globalThis.React = React;
const reasons = [
  ['overlap-unresolved', 'financing overlap unresolved'],
  ['superseded', 'superseded disclosure'],
  ['scope-unresolved', 'financing scope unresolved'],
];
const label = reason => `Excluded from indexed total — ${reason}`;
const data = {
  ...canonical,
  companies: [{ slug: 'fixture', name: 'Fixture', scope: 'Implanted', modality: 'Fixture', indication: 'Fixture' }],
  milestones: [], investors: [], reportedTotals: [],
  rounds: [
    { companySlug: 'fixture', announcedOn: '2024-01-10', stage: 'Seed', amountUsdM: 10, displayAmount: '$10M', datePrecision: 'day' },
    ...reasons.map(([capitalTreatment], index) => ({
      companySlug: 'fixture', announcedOn: `2024-0${index + 2}-10`, stage: `Disclosure ${index + 1}`,
      amountUsdM: 20, displayAmount: '$20M disclosed', datePrecision: 'day', capitalTreatment,
      sourceUrl: `https://source.example/${capitalTreatment}`, note: `Source explanation: ${capitalTreatment}.`,
    })),
  ],
  summary: { ...canonical.summary, firstYear: 2024, lastYear: 2024 },
};

test('each held record names its actual reason across Funding timeline, detail and source context', async () => {
  const originalCompanies = canonical.companies.splice(0, canonical.companies.length, ...data.companies);
  const originalRounds = canonical.rounds.splice(0, canonical.rounds.length, ...data.rounds);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const row = document.querySelector('[data-funding-company-identity="fixture"]').closest('button');
    assert.equal(row.textContent.includes('$10M'), true);
    for (const [treatment, reason] of reasons) {
      const round = data.rounds.find(round => round.capitalTreatment === treatment);
      const readout = [...row.querySelectorAll('[data-financing-readout]')].find(item => item.textContent.includes(round.stage));
      assert.equal(readout.textContent.includes(label(reason)), true, treatment);
      assert.equal([...row.querySelectorAll('[title]')].some(item => item.title.includes(round.stage) && item.title.includes(label(reason))), true);
      const html = renderToStaticMarkup(React.createElement(FundingSourceContext, { source: round.sourceUrl }));
      assert.equal(html.includes(label(reason)), true, `Source context: ${treatment}`);
      assert.equal(html.includes(round.note), true);
    }
    await click(row);
    const dialog = document.querySelector('[role="dialog"]');
    for (const [treatment, reason] of reasons) {
      const round = data.rounds.find(round => round.capitalTreatment === treatment);
      const article = [...dialog.querySelectorAll('article')].find(item => item.textContent.includes(round.stage));
      assert.equal(article.textContent.includes(label(reason)), true, treatment);
      assert.equal(article.textContent.includes(round.displayAmount), true);
      assert.equal(article.textContent.includes(round.note), true);
      assert.equal(article.querySelector('a').href, round.sourceUrl);
    }
  } finally {
    await cleanup();
    canonical.companies.splice(0, canonical.companies.length, ...originalCompanies);
    canonical.rounds.splice(0, canonical.rounds.length, ...originalRounds);
  }
});


test('company exclusion counts stay generic for mixed reasons in both total presentations', async () => {
  for (const reportedTotals of [[], [{ companySlug: 'fixture', amountUsdM: 90, reportedOn: '2024-06-10', scope: 'Company total', sourceUrl: 'https://source.example/total', note: 'Company self-report.' }]]) {
    const cleanup = await mount(React.createElement(FundingIndexDashboard, { data: { ...data, reportedTotals } }));
    try {
      const row = document.querySelector('[data-funding-company-identity="fixture"]').closest('button');
      assert.equal(row.textContent.includes('3 records excluded from total'), true);
      await click(row);
      const paragraphs = [...document.querySelector('[role="dialog"]').querySelectorAll('p')].filter(item => !item.closest('article'));
      assert.equal(paragraphs.some(item => item.textContent === (reportedTotals.length ? '3 financing records excluded from indexed financing.' : '3 records excluded from total.')), true);
      assert.equal(paragraphs.some(item => item.textContent.includes('financing overlap unresolved')), false);
      await click(document.querySelector('[aria-label="Close detail panel"]'));
      await click([...document.querySelectorAll('button')].find(item => item.textContent === 'stage'));
      const stageRow = [...document.querySelectorAll('button')].find(item => item.textContent.includes('Fixture'));
      assert.equal(stageRow.textContent.includes('3 records excluded from total'), true);
    } finally { await cleanup(); }
  }
});
