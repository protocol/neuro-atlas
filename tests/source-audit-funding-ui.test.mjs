import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const data = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));

test('Funding Index describes committed philanthropic funding as financing, not cash raised', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const company = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Forest Neurotech'));
    await click(company);
    const detail = document.querySelector('[role="dialog"]');
    assert.match(detail.textContent, /Indexed financing/);
    assert.match(detail.textContent, /Funding commitment/);
    assert.doesNotMatch(detail.textContent, /capital raised/i);
    assert.match(detail.textContent, /commitments.*not.*cash/i);
  } finally { await cleanup(); }
});


test('combined financings and philanthropic commitments are counted as records, not completed equity rounds', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const row = [...document.querySelectorAll('button')].find(el => el.textContent.includes('NeuroXess'));
    assert.match(row.textContent, /2 financing records/);
    assert.doesNotMatch(row.textContent, /2 rounds/);
    assert.doesNotMatch(document.querySelector('[aria-label="Index lens"]').parentElement.parentElement.parentElement.parentElement.textContent, /Raised/);
  } finally { await cleanup(); }
});
