import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const sourceData = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));

test('company financing detail links additional named-participant evidence beside the ordinary financing source', async () => {
  const data = {
    ...sourceData,
    companies: [{ slug: 'fixture', name: 'Fixture Company', modality: 'Fixture', scope: 'Implanted', indication: 'Renderer fixture only' }],
    rounds: [{
      companySlug: 'fixture', announcedOn: '2026-01-15', stage: 'Seed', amountUsdM: 5, displayAmount: '$5M',
      investors: ['Fixture Capital'], sourceUrl: 'https://example.org/reported-round', sourceKind: 'reporting',
      investorEvidence: [{ investorName: 'Fixture Capital', sourceUrl: 'https://example.org/investor-disclosure', sourceKind: 'primary', reviewedOn: '2026-11-17', sourceExcerpt: 'Synthetic renderer fixture, not a real financing.' }],
    }],
    milestones: [],
  };
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const company = [...document.querySelectorAll('button')].find(e => e.textContent.includes('Fixture Company'));
    await click(company);
    const article = document.querySelector('[role="dialog"] article');
    assert.ok(article);
    const links = [...article.querySelectorAll('a')];
    assert.equal(links.find(a => a.textContent === 'Source ↗')?.href, data.rounds[0].sourceUrl);
    const disclosure = links.find(a => a.textContent === 'Fixture Capital participation source ↗');
    assert.equal(disclosure?.href, data.rounds[0].investorEvidence[0].sourceUrl, 'participation must link its own evidence, not only the unrelated financing report');
    assert.equal(disclosure.target, '_blank');
    assert.equal(disclosure.rel, 'noreferrer');
  } finally { await cleanup(); }
});
