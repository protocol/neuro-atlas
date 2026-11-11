import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFile } from 'node:fs/promises';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { getFinancingDotDiameter } from '../src/lib/funding-index.ts';
import { mount, click } from './modal-helpers.mjs';

const data = JSON.parse(await readFile(new URL('../src/data/funding-index.json', import.meta.url), 'utf8'));
globalThis.React = React;

test('the timeline has a labeled size key on the same area scale outside the horizontally scrolling years', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const key = document.querySelector('[aria-label="Financing size key"]');
    assert.ok(key, 'financing needs a visible size key');
    assert.match(key.textContent, /Circle area shows indexed USD financing/);
    assert.match(key.textContent, /Same scale across companies and filters/);
    assert.equal(key.closest('.overflow-x-auto'), null, 'mobile readers can see the size key without scrolling the years');
    assert.ok(key.compareDocumentPosition(document.querySelector('[data-funding-company]').closest('.overflow-x-auto')) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'the size key precedes the long company list');
    const examples = [...key.querySelectorAll('[data-financing-size-usd-m]')];
    assert.deepEqual(examples.map(el => Number(el.dataset.financingSizeUsdM)), [10, 100, 650]);
    for (const [index, example] of examples.entries()) {
      const diameter = 40 * Math.sqrt(Number(example.dataset.financingSizeUsdM) / 650);
      assert.equal(example.style.width, `${diameter}px`);
      assert.equal(example.style.height, example.style.width);
      assert.match(example.className, /bg-accent\/65/);
      assert.equal(example.parentElement.textContent, ['$10M', '$100M', '$650M'][index]);
      assert.equal(example.getAttribute('aria-hidden'), 'true', 'readable labels describe decorative size samples');
    }
    assert.doesNotMatch(document.body.textContent, /width scales with/);
  } finally { await cleanup(); }
});

test('missing or invalid amounts use an unscaled hollow diamond rather than a zero-dollar circle', async () => {
  for (const amount of [null, undefined, 0, -1, NaN, Infinity]) {
    assert.equal(getFinancingDotDiameter(amount, 650), null, String(amount));
  }
  for (const largest of [0, -1, NaN, Infinity]) {
    assert.equal(getFinancingDotDiameter(10, largest), null, String(largest));
  }
  const company = data.companies[0];
  const unknown = { ...data.rounds.find(round => round.companySlug === company.slug), amountUsdM: null, displayAmount: 'Undisclosed' };
  const fixture = { ...data, companies: [company], rounds: [unknown], milestones: [] };
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data: fixture }));
  try {
    const mark = document.querySelector('[data-financing-unknown]');
    assert.ok(mark, 'unknown amounts have a distinct unscaled mark');
    assert.match(mark.className, /rotate-45/);
    assert.doesNotMatch(mark.className, /rounded-full|bg-accent/);
    assert.match(mark.title, /Undisclosed/);
    assert.equal(document.querySelectorAll('[data-financing-dot]').length, 0);
    const key = document.querySelector('[aria-label="Financing size key"]');
    assert.match(key.textContent, /Amount unavailable · unscaled/);
    assert.equal(key.querySelectorAll('[data-financing-size-usd-m]').length, 0, 'no numeric scale is invented for an all-unknown fixture');
    assert.match(document.querySelector('[data-financing-readout]').textContent, /Undisclosed/);
  } finally { await cleanup(); }
});

test('each financing has an independent keyboard and pointer target that preserves the exact amount and source details', async () => {
  const company = data.companies.find(company => company.slug === 'neuracle-technology');
  const round = data.rounds.find(round => round.companySlug === company.slug);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'details start hidden');
    const targets = [...document.querySelectorAll('button[data-financing-target]')];
    assert.equal(targets.length, data.rounds.length, 'every financing is keyboard reachable');
    assert.equal(document.querySelectorAll('button button, button a').length, 0, 'no nested interactive controls');
    const target = targets.find(el => el.getAttribute('aria-label').includes(company.name));
    assert.ok(target.getAttribute('aria-label').includes(round.displayAmount), 'native currency and approximate USD label are preserved');
    assert.ok(parseFloat(target.style.width) >= 24 && parseFloat(target.style.height) >= 24, 'tiny circles have a larger transparent hit target');
    await act(async () => target.focus());
    let tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(tooltip.textContent.includes(round.displayAmount));
    assert.ok(tooltip.textContent.includes(round.note), 'FX basis remains available');
    assert.equal(document.getElementById(target.getAttribute('aria-describedby')), tooltip);
    await act(async () => target.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    await act(async () => target.blur());
    await act(async () => target.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true })));
    tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(tooltip.textContent.includes(round.displayAmount), 'hover and focus expose the same amount');
    await act(async () => target.focus()); // JSDOM .click() does not perform native pointer focus.
    await click(target);
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'the tooltip closes when detail opens');
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog.textContent.includes(round.displayAmount));
    assert.ok([...dialog.querySelectorAll('a')].some(link => link.getAttribute('href') === round.sourceUrl));
    await click(dialog.querySelector('[aria-label="Close detail panel"]'));
    assert.equal(document.activeElement, target, 'closing company detail restores financing focus');
  } finally { await cleanup(); }
});

test('filtering companies keeps the complete-index scale and source values unchanged', async () => {
  const original = structuredClone(data);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const company = data.companies.find(company => company.slug === 'neurobionics');
    const round = data.rounds.find(round => round.companySlug === company.slug);
    const findDot = () => [...document.querySelectorAll('[data-financing-dot]')].find(el => el.title === `${company.name} · ${round.stage} · ${round.displayAmount}`);
    const beforeDiameter = findDot().style.width;
    const beforeKey = [...document.querySelectorAll('[data-financing-size-usd-m]')].map(el => [el.dataset.financingSizeUsdM, el.style.width]);
    const select = document.querySelector('[aria-label="Filter by modality"]');
    await act(async () => { select.value = company.modality; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    assert.equal(document.querySelector('[data-funding-company="neuralink"]'), null, 'the largest round is filtered out');
    assert.equal(findDot().style.width, beforeDiameter, 'the same financing keeps the same area');
    assert.deepEqual([...document.querySelectorAll('[data-financing-size-usd-m]')].map(el => [el.dataset.financingSizeUsdM, el.style.width]), beforeKey);
    assert.deepEqual(data, original, 'filtering and drawing preserve every source record and qualifier');
  } finally { await cleanup(); }
});

test('the area scale retains fractional amounts and proportional ratios without floors or caps', () => {
  for (const amount of [0.01, 1, 4, 100, 650, 1000]) {
    const diameter = getFinancingDotDiameter(amount, 650);
    assert.ok(Math.abs(diameter ** 2 / amount - 1600 / 650) < 1e-9);
  }
  assert.equal(getFinancingDotDiameter(650, 650), 40);
  assert.equal(getFinancingDotDiameter(4, 100) / getFinancingDotDiameter(1, 100), 2, 'four times the amount doubles the diameter');
});
