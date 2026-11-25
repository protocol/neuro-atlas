import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const data = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url), 'utf8'));

test('the shared Funding exclusion legend states the common exclusion and leaves reasons to each actual record', async t => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  t.after(cleanup);
  const legend = [...document.querySelectorAll('span')]
    .find(span => span.textContent.startsWith('Disclosed amount excluded from totals'));
  assert.ok(legend, 'The dashed disclosure marker has a visible legend');
  assert.equal(legend.textContent, 'Disclosed amount excluded from totals · reason shown per record');
  const reasons = {
    'scope-unresolved': 'financing scope unresolved',
    'overlap-unresolved': 'financing overlap unresolved',
  };
  for (const [treatment, reason] of Object.entries(reasons)) {
    const held = data.rounds.filter(round => round.capitalTreatment === treatment);
    assert.ok(held.length > 0, `Exercise actual ${treatment} source records`);
    for (const round of held) {
      const company = data.companies.find(company => company.slug === round.companySlug);
      const title = `${company.name} · ${round.stage} · ${round.displayAmount} · Excluded from indexed total — ${reason}`;
      const marker = [...document.querySelectorAll('[title]')].find(element => element.title === title);
      assert.ok(marker, `${company.name}: preserve the actual reason on the matching disclosure`);
      assert.ok(marker.classList.contains('border-dashed'));
      assert.equal(marker.classList.contains('bg-accent'), false);
      const readout = [...marker.closest('button').querySelectorAll('[data-financing-readout]')]
        .find(element => element.textContent.includes(round.stage) && element.textContent.includes(round.displayAmount));
      assert.ok(readout.textContent.includes(reason));
    }
  }
});
