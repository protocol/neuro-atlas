import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import FundingPage from '../src/app/funding/page.tsx';
import { buildCompanyRows } from '../src/lib/funding-index.ts';
import { JSDOM } from 'jsdom';

// Initialize React DOM's event support against a DOM, not its server-only fallback.
const bootstrap = new JSDOM('<!doctype html><body></body>');
globalThis.window = bootstrap.window;
globalThis.document = bootstrap.window.document;
const { mount, click } = await import('./modal-helpers.mjs');
bootstrap.window.close();

globalThis.React = React;
const sourceData = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent === text);
const companyButton = name => [...document.querySelectorAll('button')].find(el => el.textContent.includes(name));

// Isolated renderer fixtures are not evidence of real company financing or portfolio membership.
function fixture(stages) {
  const companies = stages.map((stage, i) => ({ slug: `fixture-${i}`, name: `Fixture ${i}`, scope: 'Implanted', modality: 'ECoG', indication: 'Renderer fixture' }));
  return {
    ...sourceData, companies, milestones: [], investors: [], portfolioDisclosures: [],
    rounds: stages.map((stage, i) => ({ companySlug: companies[i].slug, announcedOn: '2026-01-01', stage, amountUsdM: 5, displayAmount: '$5M' })),
  };
}

test('mounted Stage view groups undisclosed equivalents together without changing original financing wording', async () => {
  const stages = ['Investment', 'Financing', 'Investment (stage undisclosed)', 'Financing (stage undisclosed)', 'Investment stage undisclosed', 'Financing stage undisclosed', 'Stage-undisclosed', 'Undisclosed', 'unspecified', 'Seed', 'Series A', 'Pre-seed', 'Funding commitment'];
  const data = fixture(stages);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click(button('stage'));
    const groups = [...document.querySelectorAll('article')];
    const undisclosed = groups.filter(el => el.querySelector('h2')?.textContent === 'Undisclosed');
    assert.equal(undisclosed.length, 1, 'one shared Undisclosed stage group');
    assert.equal(undisclosed[0].querySelectorAll('button').length, 9, 'all generic undisclosed financing variants belong together');
    assert.deepEqual(groups.map(el => el.querySelector('h2')?.textContent).sort(), ['Undisclosed', 'Seed', 'Series A', 'Pre-seed', 'Funding commitment'].sort());
    const rows = buildCompanyRows(data.companies, data.rounds, { query: '', scope: 'All', modality: 'All' });
    assert.deepEqual(data.companies.map(company => rows.find(row => row.slug === company.slug).rounds[0].stage), stages, 'source wording remains unmodified');
    await click(companyButton('Fixture 2'));
    assert.equal(document.querySelector('[role="dialog"] article .text-sm.font-semibold')?.textContent, stages[2]);
  } finally { await cleanup(); }
});

async function travel(direction) {
  await act(async () => {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`No popstate for ${direction}`)), 1000);
      window.addEventListener('popstate', () => { clearTimeout(timeout); resolve(); }, { once: true });
      window.history[direction]();
    });
  });
}

test('real funding route restores its Investors URL and preserves unrelated query, hash, Back and Forward', async () => {
  const route = FundingPage.default ?? FundingPage;
  const startUrl = '/funding?review=1&tag=a&tag=b&view=investors#sources';
  let cleanup = await mount(React.createElement(route), '', win => win.history.replaceState(null, '', startUrl));
  try {
    assert.equal(button('investors').getAttribute('aria-pressed'), 'true', 'direct Investors URL opens the Investors lens');
    assert.ok([...document.querySelectorAll('h2')].some(el => el.textContent.includes('Most active indexed investors')));
    await click(button('companies'));
    assert.equal(window.location.pathname + window.location.search + window.location.hash, '/funding?review=1&tag=a&tag=b#sources');
    await travel('back');
    assert.equal(button('investors').getAttribute('aria-pressed'), 'true');
    assert.equal(window.location.search, '?review=1&tag=a&tag=b&view=investors');
    await travel('forward');
    assert.equal(button('companies').getAttribute('aria-pressed'), 'true');
    await click(button('investors'));
    const investorsUrl = window.location.pathname + window.location.search + window.location.hash;
    assert.equal(investorsUrl, startUrl);
    const length = window.history.length;
    await click(button('investors'));
    assert.equal(window.history.length, length, 'clicking the active lens does not add a duplicate entry');
    await cleanup();
    cleanup = await mount(React.createElement(route), '', win => win.history.replaceState(null, '', investorsUrl));
    assert.equal(button('investors').getAttribute('aria-pressed'), 'true', 'remount/reload restores the same Investors lens');
  } finally { await cleanup(); }
});

for (const width of [320, 390]) {
  test(`mounted mobile controls at ${width}px start collapsed, focus search, filter companies and close with Escape`, async () => {
    const data = { ...fixture(['Seed', 'Series A']), companies: [
      { ...fixture(['Seed']).companies[0], name: 'Alpha', modality: 'ECoG', scope: 'Implanted' },
      { ...fixture(['Seed', 'Series A']).companies[1], name: 'Beta', modality: 'Ultrasound', scope: 'Implant-adjacent' },
    ] };
    const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }), '', win => Object.defineProperty(win, 'innerWidth', { value: width }));
    try {
      const searchToggle = document.querySelector('[aria-label="Toggle company search"]');
      assert.ok(searchToggle, 'mobile search has an icon toggle rather than a permanently expanded search row');
      const search = document.getElementById(searchToggle.getAttribute('aria-controls'));
      assert.equal(search.classList.contains('hidden'), true);
      assert.equal(searchToggle.getAttribute('aria-expanded'), 'false');
      await click(searchToggle);
      const input = search.querySelector('input');
      assert.equal(search.classList.contains('hidden'), false);
      assert.ok(document.activeElement === input, 'opening search puts keyboard focus in the field');
      await act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Alpha');
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
      assert.ok(companyButton('Alpha'));
      assert.ok(!companyButton('Beta'), 'mobile search filters the actual company rows');
      await act(async () => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      assert.equal(search.classList.contains('hidden'), true);
      assert.ok(document.activeElement === searchToggle, 'Escape returns focus to search toggle');
      const filtersToggle = document.querySelector('[aria-label="Toggle company filters"]');
      assert.ok(filtersToggle, 'mobile filters are reachable behind a compact control');
      const filters = document.getElementById(filtersToggle.getAttribute('aria-controls'));
      assert.equal(filters.classList.contains('hidden'), true);
      await click(filtersToggle);
      assert.equal(filters.classList.contains('hidden'), false);
      const modality = filters.querySelector('[aria-label="Filter by modality"]');
      await act(async () => {
        modality.value = 'Ultrasound';
        modality.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
      assert.match(document.body.textContent, /No companies match/);
      await click([...filters.querySelectorAll('button')].find(el => el.textContent === 'Reset filters'));
      assert.ok(companyButton('Alpha'));
      assert.ok(companyButton('Beta'));
      await act(async () => filters.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      assert.equal(filters.classList.contains('hidden'), true);
      assert.ok(document.activeElement === filtersToggle);
    } finally { await cleanup(); }
  });
}

test('mounted timeline keeps a compact opaque company identity in the sticky lane while scrolling later years', async () => {
  const data = fixture(['Seed']);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    const timeline = document.querySelector('[aria-label="Company financing timeline. Scroll horizontally for later years."]');
    assert.ok(timeline, 'timeline is a named keyboard-scrollable region');
    assert.equal(timeline.tabIndex, 0);
    const identity = timeline.querySelector('[data-funding-company-identity]');
    assert.ok(identity, 'company name has a dedicated sticky lane');
    assert.match(identity.className, /\bsticky\b.*\bleft-0\b/);
    assert.match(identity.className, /bg-surface-raised/, 'opaque identity covers marks scrolling behind it');
    assert.match(identity.parentElement.className, /grid-cols-\[100px_/, 'mobile company lane leaves timeline space even at 320px, not the old 220px block');
    await act(async () => {
      timeline.scrollLeft = 1000;
      timeline.dispatchEvent(new window.Event('scroll'));
    });
    assert.ok(identity.textContent.includes(data.companies[0].name));
    await click(identity.closest('button'));
    assert.equal(document.querySelector('[role="dialog"] h2')?.textContent, data.companies[0].name, 'identity still opens its exact company');
  } finally { await cleanup(); }
});

test('mounted Investors lens reconciles the reviewed family portfolio and financing evidence without aliasing source labels', async () => {
  const data = sourceData;
  const disclosure = data.portfolioDisclosures.find(row => row.investorName === 'Protocol Labs / PLC Neurotech');
  assert.ok(disclosure, 'source-backed portfolio disclosure exists');
  const before = structuredClone(data);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click(button('investors'));
    const portfolio = document.querySelector('[data-funding-portfolio="Protocol Labs / PLC Neurotech"]');
    assert.ok(portfolio, 'portfolio evidence is prominent and separate from financing leaderboard rows');
    assert.equal(portfolio.querySelector('[data-portfolio-total]')?.textContent, '10');
    assert.equal(portfolio.querySelector('[data-portfolio-matched]')?.textContent, '6');
    assert.equal(portfolio.querySelector('[data-family-financing-count]')?.textContent, '3');
    assert.match(portfolio.textContent, /selected neurotech portfolio companies/i);
    assert.match(portfolio.textContent, /in this BCI screen/i);
    assert.match(portfolio.textContent, /distinct indexed financing records/i);
    assert.match(portfolio.textContent, /Protocol Labs: 2 financing records/);
    assert.match(portfolio.textContent, /PLC Neurotech: 1 financing record/);
    assert.match(portfolio.textContent, /display-only.*distinct.*legal/i);
    assert.match(portfolio.textContent, /does not establish.*round|not.*financing dates/i);
    assert.equal(portfolio.querySelectorAll('[data-portfolio-company]').length, 10);
    assert.equal(portfolio.querySelectorAll('button[data-portfolio-screen-match]').length, 6);
    assert.ok([...portfolio.querySelectorAll('a')].some(a => a.href === disclosure.sourceUrl));
    assert.ok([...portfolio.querySelectorAll('a')].some(a => a.href === 'https://plcapital.xyz/disclaimer'));
    for (const name of disclosure.familyGrouping.memberNames) {
      const investor = data.investors.find(row => row.name === name);
      const label = [...document.querySelectorAll('[data-indexed-investor]')].find(el => el.getAttribute('data-indexed-investor') === name);
      assert.ok(label, 'original exact-name leaderboard row stays visible');
      assert.ok(label.textContent.includes(`${investor.roundCount} financing record`));
    }
    await click(portfolio.querySelector('[data-portfolio-screen-match="science-corporation"]'));
    const detail = document.querySelector('[role="dialog"]');
    const scienceD = [...detail.querySelectorAll('article')].find(el => el.querySelector('a')?.href === 'https://science.xyz/news/series-d/');
    assert.ok(scienceD.textContent.includes('PLC Neurotech'));
    assert.ok(!scienceD.textContent.includes('Protocol Labs'), 'reviewed family grouping never replaces source investor names in round histories');
    assert.deepEqual(data, before, 'view-level portfolio display does not mutate counts, records or names');
  } finally { await cleanup(); }
});

test('display-only family financing union deduplicates a jointly named financing and ignores portfolio-only relationships', async () => {
  const data = fixture(['Series A', 'Seed']);
  data.rounds = [
    { ...data.rounds[0], investors: ['Protocol Labs', 'PLC Neurotech'], sourceUrl: 'https://example.org/joint' },
    { ...data.rounds[0], investors: ['PLC Neurotech'], sourceUrl: 'https://example.org/joint-secondary' },
    { ...data.rounds[1], investors: ['Protocol Labs-like name'] },
  ];
  data.portfolioDisclosures = [{
    investorName: 'Reviewed display family', sourceInvestorName: 'PLC Neurotech', sourceUrl: 'https://example.org/portfolio', reviewedOn: '2026-11-17',
    familyGrouping: { memberNames: ['Protocol Labs', 'PLC Neurotech'], reviewedOn: '2026-11-17', sourceUrls: ['https://example.org/disclaimer'], note: 'Display-only grouping, not legal identity.' },
    companies: data.companies.map(company => ({ name: company.name, website: 'https://example.org/' + company.slug, companySlug: company.slug })),
  }];
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }), '', win => win.history.replaceState(null, '', '/funding?view=investors'));
  try {
    const portfolio = document.querySelector('[data-funding-portfolio]');
    assert.equal(portfolio?.querySelector('[data-family-financing-count]')?.textContent, '1', 'stable company/date/stage identity deduplicates the union, not a sum of member counts');
    assert.equal(portfolio?.querySelector('[data-family-associated-capital]')?.textContent, '$5M');
    assert.equal(portfolio?.querySelector('[data-portfolio-matched]')?.textContent, '2', 'matched-screen portfolio count is not the financing participant count');
  } finally { await cleanup(); }
});
