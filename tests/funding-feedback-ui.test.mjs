import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import FundingPage from '../src/app/funding/page.tsx';
import { buildCompanyRows, formatCapital } from '../src/lib/funding-index.ts';
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
  let cleanup = await mount(await route(), '', win => win.history.replaceState(null, '', startUrl));
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
    cleanup = await mount(await route(), '', win => win.history.replaceState(null, '', investorsUrl));
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

test('mounted Investors starts with the neutral leaderboard, not an investor-specific showcase', async () => {
  const data = structuredClone(sourceData);
  // Legacy disclosure metadata is only a renderer fixture, not financing evidence.
  // Keeping it in the input proves that metadata cannot opt an investor into a showcase.
  data.portfolioDisclosures = [{
    investorName: 'Protocol Labs / PLC Neurotech', sourceInvestorName: 'PLC Neurotech',
    sourceUrl: 'https://example.org/fixture-portfolio', reviewedOn: '2026-11-17',
    familyGrouping: { memberNames: ['Protocol Labs', 'PLC Neurotech'], reviewedOn: '2026-11-17', sourceUrls: ['https://example.org/fixture-disclaimer'], note: 'Renderer fixture only.' },
    companies: [{ name: 'Fixture portfolio company', website: 'https://example.org/fixture-company', companySlug: data.companies[0].slug }],
  }];
  const before = structuredClone(data);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }), '', win => win.history.replaceState(null, '', '/funding?view=investors'));
  try {
    assert.equal(document.querySelector('h2')?.textContent, 'Most active indexed investors and funders', 'Investors content begins with the shared financing leaderboard');
    assert.equal(document.querySelectorAll('[data-funding-portfolio], [data-portfolio-company], [data-portfolio-screen-match], [data-family-financing-count]').length, 0, 'no investor showcase, portfolio cards or family totals');
    const links = [...document.querySelectorAll('a')];
    assert.ok(!links.some(el => /portfolio|disclaimer|family context/i.test(el.textContent) || el.getAttribute('href')?.startsWith('#funding-portfolio') || el.href.startsWith('https://example.org/fixture-')), 'no portfolio, company-card, disclaimer or family-context links');
    assert.ok(!document.body.textContent.includes('Fixture portfolio company'));
    assert.ok(![...document.querySelectorAll('h2, h3')].some(el => el.textContent === 'Protocol Labs / PLC Neurotech'), 'an investor family may be an ordinary row, never a showcase heading');

    const rows = [...document.querySelectorAll('[data-indexed-investor]')];
    const expected = data.investors.slice(0, 24);
    const family = rows.find(row => row.dataset.indexedInvestor === 'Protocol Labs (incl. PLC Neuro)');
    assert.ok(family, 'the ordinary ranked row uses the owner-requested display label');
    assert.ok(family.textContent.includes('4 financing records · 4 companies'), 'renaming does not change sourced counts');
    assert.ok(!rows.some(row => row.dataset.indexedInvestor === 'Protocol Labs / PLC Neurotech'), 'the previous display label is no longer shown');
    assert.equal(rows.length, expected.length, 'same top-24 display limit, with no extra showcase rows');
    assert.deepEqual(rows.map(row => row.getAttribute('data-indexed-investor')), expected.map(investor => investor.name), 'source leaderboard order and investor names are preserved');
    const neutralStyle = row => [row.className, ...[...row.querySelectorAll('[class]')].filter(el => !el.closest('[aria-hidden="true"]')).map(el => el.className)];
    for (const [index, row] of rows.entries()) {
      const investor = expected[index];
      assert.equal(row.firstElementChild.textContent, String(index + 1).padStart(2, '0'));
      assert.ok(row.textContent.includes(`${investor.roundCount} financing ${investor.roundCount === 1 ? 'record' : 'records'} · ${investor.companyCount} ${investor.companyCount === 1 ? 'company' : 'companies'}`), 'financing and company counts remain data-driven');
      assert.equal(row.querySelectorAll('.bg-accent').length, investor.roundCount, 'participation dots keep the sourced count');
      assert.equal(row.lastElementChild.lastElementChild.textContent, formatCapital(investor.associatedCapitalUsdM), 'associated financing remains data-driven');
      assert.deepEqual(neutralStyle(row), neutralStyle(rows[0]), `${investor.name} uses the same unhighlighted row and label styling as every other investor`);
    }
    assert.deepEqual(data, before, 'the Investors lens does not mutate financing, names, order or legacy metadata');
  } finally { await cleanup(); }
});

test('mounted Investors explains reviewed family counting without promoting a particular investor', async () => {
  const data = structuredClone(sourceData);
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }), '', win => win.history.replaceState(null, '', '/funding?view=investors'));
  try {
    const aside = document.querySelector('aside');
    assert.ok(aside?.textContent.includes('Reviewed investor families are grouped for counting only; company records retain the original investor names. A grouping does not imply a single legal entity.'), 'the shared reading guide explains the counting rule and legal-identity limitation');
    assert.doesNotMatch(aside.textContent, /Protocol Labs|PLC Neurotech/);
  } finally { await cleanup(); }
});

test('mounted company financing detail retains exact source investor names without portfolio UI', async () => {
  const data = structuredClone(sourceData);
  delete data.portfolioDisclosures;
  const before = structuredClone(data);
  const science = data.companies.find(company => company.slug === 'science-corporation');
  const round = data.rounds.find(round => round.companySlug === science.slug && round.sourceUrl === 'https://science.xyz/news/series-d/');
  assert.ok(round.investors.includes('PLC Neurotech'), 'the sourced round names PLC Neurotech');
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click(companyButton(science.name));
    const detail = document.querySelector('[role="dialog"]');
    const scienceD = [...detail.querySelectorAll('article')].find(el => el.querySelector('a')?.href === round.sourceUrl);
    assert.ok(scienceD, 'the normal company row opens the sourced financing history');
    assert.ok([...scienceD.querySelectorAll('p')].some(el => el.textContent === round.investors.join(' · ')), 'round detail displays the exact source names, not an aggregated family label');
    assert.ok(!scienceD.textContent.includes('Protocol Labs'), 'family counting does not rewrite source investor names');
    await click(document.querySelector('[aria-label="Close detail panel"]'));
    await click(button('investors'));
    await click(button('companies'));
    assert.deepEqual(data, before, 'company detail and lens switches do not mutate records, counts or names');
  } finally { await cleanup(); }
});
