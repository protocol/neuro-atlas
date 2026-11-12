import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFile } from 'node:fs/promises';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { buildCompanyRows, getTimelinePosition, formatFundingDate } from '../src/lib/funding-index.ts';
import { mount, click } from './modal-helpers.mjs';

const data = JSON.parse(await readFile(new URL('../src/data/funding-index.json', import.meta.url), 'utf8'));
globalThis.React = React;
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);

test('mounted funding views keep supporting type at least 12px with calm label typography', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    for (const view of ['timeline', 'stage', 'investors']) {
      await click(button(view));
      const tiny = [...document.querySelectorAll('[class]')].filter(el => /text-\[(9|10|11)px\]/.test(el.className));
      assert.equal(tiny.length, 0, `${view}: undersized text: ${tiny.slice(0, 3).map(el => el.textContent).join('; ')}`);
      const caps = [...document.querySelectorAll('[class]')].filter(el => /\buppercase\b/.test(el.className));
      assert.equal(caps.length, 0, `${view}: avoid tracked all-caps supporting labels`);
    }
  } finally { await cleanup(); }
});

test('every financing amount has a readable visible readout without expanding the quantitative capsule', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const rows = buildCompanyRows(data.companies, data.rounds, { query: '', scope: 'All', modality: 'All' });
    assert.equal(document.querySelectorAll('[data-financing-readout]').length, data.rounds.length, 'every financing has a visible readout');
    for (const row of rows) {
      const company = [...document.querySelectorAll('button')].find(el => el.textContent.includes(row.name));
      const readouts = [...company.querySelectorAll('[data-financing-readout]')];
      assert.equal(readouts.length, row.rounds.length);
      row.rounds.forEach((round, index) => {
        const mark = [...company.querySelectorAll('[title]')].find(el => el.title === `${row.name} · ${round.stage} · ${round.displayAmount}`);
        const width = Math.min(76, 20 + Math.sqrt(round.amountUsdM) * 2.1);
        assert.equal(mark.style.width, `${width}px`, 'amount-encoded width is unchanged');
        const expected = document.createElement('span');
        expected.style.left = `calc(${getTimelinePosition(round.announcedOn, data.summary.firstYear, data.summary.lastYear)}% - ${width / 2}px)`;
        assert.equal(mark.style.left, expected.style.left);
        assert.equal(mark.textContent, '', 'narrow marks do not contain enlarged overflowing text');
        assert.match(mark.className, /bg-accent/);
        const readout = readouts[index];
        assert.ok(readout.textContent.includes(round.displayAmount));
        assert.ok(readout.textContent.includes(round.stage));
        assert.ok(readout.textContent.includes(formatFundingDate(round.announcedOn, round.datePrecision)));
        assert.match(readout.className, /text-xs/);
        assert.equal(readout.closest('[hidden], [aria-hidden="true"]'), null);
      });
    }
  } finally { await cleanup(); }
});

test('company financing details let long stages and full amount labels reflow independently', async () => {
  const company = data.companies[0];
  const longStage = 'Extended strategic financing with international institutional participants';
  const round = { ...data.rounds.find(item => item.companySlug === company.slug), stage: longStage };
  const fixture = { ...data, companies: [company], rounds: [round] };
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data: fixture }));
  try {
    await click([...document.querySelectorAll('button')].find(el => el.textContent.includes(company.name)));
    const dialog = document.querySelector('[role="dialog"]');
    assert.match(dialog.querySelector('h2').className, /text-lg/);
    const stage = [...dialog.querySelectorAll('div')].find(el => el.textContent === longStage);
    const heading = stage.parentElement.parentElement;
    assert.match(heading.className, /flex-wrap/, 'amount can move below a long stage at narrow widths');
    assert.match(stage.parentElement.className, /min-w-0/);
    assert.equal(heading.lastElementChild.textContent, round.displayAmount);
    assert.match(heading.lastElementChild.className, /shrink-0/);
    assert.equal(dialog.querySelectorAll('[class*="text-[9px]"], [class*="text-[10px]"], [class*="text-[11px]"]').length, 0);
  } finally { await cleanup(); }
});

for (const width of [320, 390]) {
  test(`investor rows at ${width}px use an unconstrained name lane and a separate capital row`, async () => {
    const max = data.investors.reduce((a, b) => a.roundCount >= b.roundCount ? a : b);
    const longName = 'International Neurotechnology Investment and Research Partnership';
    const fixture = { ...data, investors: [{ ...max, name: longName }, ...data.investors] };
    const cleanup = await mount(React.createElement(FundingIndexDashboard, { data: fixture }), '', win => {
      Object.defineProperty(win, 'innerWidth', { value: width, configurable: true });
    });
    try {
      await click(button('investors'));
      const name = [...document.querySelectorAll('div')].find(el => el.textContent === longName);
      const main = name.parentElement;
      const row = main.parentElement;
      assert.match(row.className, /grid-cols-\[24px_minmax\(0,1fr\)\]/, 'mobile reserves only rank plus a flexible name lane');
      assert.match(main.className, /min-w-0/);
      assert.match(name.className, /\[overflow-wrap:anywhere\]/, 'long names may wrap without being clipped');
      assert.doesNotMatch(name.className, /truncate|whitespace-nowrap/);
      const participation = name.nextElementSibling;
      assert.match(participation.className, /flex-col/, 'count sits below dots, never squeezed beside the strip');
      assert.equal(participation.querySelector('[aria-hidden="true"]').children.length, max.roundCount);
      assert.ok(participation.textContent.includes(`${max.roundCount} rounds · ${max.companyCount} companies`));
      const associated = row.lastElementChild;
      assert.match(associated.className, /col-start-2/);
      assert.match(associated.className, /sm:row-start-1/);
      assert.ok(associated.textContent.includes('associated rounds'));
      assert.match(associated.className, /min-w-0/);
    } finally { await cleanup(); }
  });
}
