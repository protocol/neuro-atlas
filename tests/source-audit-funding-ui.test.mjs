import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const data = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const timeline = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));

test('CorTec IDE date stays explicitly unverified on both source-identical surfaces', async () => {
  const source = 'https://www.medicaldevice-network.com/news/fda-cortec-implant-study';
  const marker = data.milestones.find(r => r.sourceUrl.replace(/\/$/, '') === source);
  const event = timeline.find(r => r.sourceUrl.replace(/\/$/, '') === source);
  assert.equal(event.dateBasis, 'unverified');
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click([...document.querySelectorAll('button')].find(el => el.textContent.includes('CorTec')));
    const article = [...document.querySelectorAll('[role="dialog"] article')].find(el => el.querySelector('a')?.href === marker.sourceUrl);
    assert.ok(article);
    assert.match(article.textContent, /Date unverified.*May 24, 2024/);
    assert.doesNotMatch(article.textContent, /Reported May 24, 2024/);
    assert.equal(marker.dateBasis, event.dateBasis);
  } finally { await cleanup(); }
});

test('Funding Index describes committed philanthropic funding as financing, not cash raised', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const company = [...document.querySelectorAll('button')].find(el => el.textContent.includes('Forest Neurotech'));
    await click(company);
    const detail = document.querySelector('[role="dialog"]');
    assert.match(detail.textContent, /Indexed financing/);
    assert.match(detail.textContent, /Funding commitment/);
    assert.doesNotMatch(detail.textContent, /capital raised/i);
    assert.match(detail.textContent, /Sum of indexed financing amounts, including labeled commitments\./);
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
