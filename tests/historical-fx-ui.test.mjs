import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const fx = {
  sourceUrl: 'https://example.org/prospectus.pdf#page=45', companySlug: 'fixture',
  currency: 'CNY', amountNativeM: 150, investmentDate: null, announcedOn: '2022-09-24', dateBasis: 'event_date',
  rateDate: '2022-09-23', nativePerUsd: 7.1266, rateDateBasis: 'previous_available_business_day',
  rateSource: 'Federal Reserve H.10', rateSourceUrl: 'https://www.federalreserve.gov/releases/h10/20220926/', reviewedOn: '2026-11-24',
};
const data = {
  companies: [{ slug: 'fixture', name: 'Synthetic FX fixture', modality: 'BCI', indication: 'Research', scope: 'Implanted', logo: '' }],
  rounds: [{ companySlug: 'fixture', announcedOn: '2022-09-24', datePrecision: 'day', dateBasis: 'event', stage: 'Financing', amountUsdM: 150 / 7.1266, displayAmount: 'RMB 150m', sourceUrl: fx.sourceUrl, fx }],
  milestones: [], investors: [],
  summary: { selectedCompanies: 1, indexedRounds: 1, regulatoryMilestones: 0, observedCapitalUsdM: 150 / 7.1266, firstYear: 2022, lastYear: 2026, asOf: '2026-11-24', excludedBelowThreshold: 0 },
  methodology: { thresholdUsdM: 2, scope: 'Synthetic test', coverage: 'Synthetic test' },
};

test('real funding details label documented event FX and the previous H.10 observation without implying an investment or announcement', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click([...document.querySelectorAll('button')].find(button => button.textContent.includes('Synthetic FX fixture')));
    const article = document.querySelector('[role="dialog"] article');
    assert.ok(article);
    assert.match(article.textContent, /Exchange rate for event date/);
    assert.match(article.textContent, /previous published rate Sep 23, 2022/);
    assert.doesNotMatch(article.textContent, /investment-date FX|announcement-date FX|announcement.*fallback/i);
    const source = article.querySelector(`a[href="${fx.rateSourceUrl}"]`);
    assert.ok(source, 'The historical-rate observation must link to its own source');
  } finally { await cleanup(); }
});

test('the actual milestone tooltip retains the documented event basis and previous-observation label', async () => {
  const { createRequire } = await import('node:module');
  const { MilestoneTimeline } = await import('../src/components/milestone-timeline.tsx');
  const { act } = await import('react');
  const require = createRequire(import.meta.url);
  const rows = require('../src/data/milestones.json');
  const snapshot = [...rows];
  // In-memory synthetic fixture only; no source file is changed. Keep a date in
  // an existing displayed year so this tests the real accessible tooltip.
  const event = { company: 'Synthetic FX event', slug: 'synthetic-fx-event', activity: '$20m', stage: 'capital', amountUsdM: 20, date: '2026-09-24', datePrecision: 'day', dateBasis: 'event', note: 'Synthetic test', sourceUrl: 'https://example.org/synthetic-event', logo: null, scope: 'bci', fx: { ...fx, announcedOn: '2026-09-24', rateDate: '2026-09-23' } };
  let cleanup;
  try {
    rows.push(event);
    cleanup = await mount(React.createElement(MilestoneTimeline));
    const source = document.querySelector('a[aria-label="Synthetic FX event — $20m"]');
    assert.ok(source, 'The synthetic event must reach the actual timeline');
    await act(async () => source.focus());
    const tooltip = document.querySelector('[data-milestone-detail]');
    assert.ok(tooltip);
    assert.match(tooltip.textContent, /Exchange rate for event date/);
    assert.match(tooltip.textContent, /previous published rate Sep 23, 2026/);
    assert.doesNotMatch(tooltip.textContent, /announcement.*fallback|Investment-date FX/);
  } finally {
    if (cleanup) await cleanup();
    rows.splice(0, rows.length, ...snapshot);
  }
});

test('existing investment and announcement FX labels remain distinct from documented event FX', async () => {
  const { formatFundingFxBasis } = await import('../src/lib/funding-index.ts');
  assert.match(formatFundingFxBasis({ ...fx, investmentDate: '2022-09-22', dateBasis: 'investment_date', rateDateBasis: undefined }), /^Exchange rate for investment date · Sep 22, 2022$/);
  assert.match(formatFundingFxBasis({ ...fx, dateBasis: 'announcement_date', rateDateBasis: undefined }), /^Exchange rate for announcement date · Sep 24, 2022$/);
});
