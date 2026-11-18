import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFundingIndex, loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';

const group = {
  name: 'Fixture family', memberNames: ['Fixture Capital', 'Fixture Ventures'],
  sourceUrls: ['https://example.org/disclosure'], reviewedOn: '2026-11-17',
  note: 'Reviewed display-only family; distinct legal source identities retained.',
};
const financing = (date, investors, amount = '5') => ({
  company_slug: 'fixture', announced_on: date, date_precision: 'day', stage: 'Seed',
  amount_usd_m: amount, currency: 'USD', display_amount: '$5M', investors,
  source_url: 'https://example.org/round/' + date, note: '',
});
const fixture = () => ({
  companies: [{ slug: 'fixture', name: 'Fixture', modality: 'Fixture', scope: 'Fixture' }],
  rounds: [financing('2026-01-01', 'Fixture Capital;Fixture Ventures'), financing('2026-02-01', 'Fixture Ventures'), financing('2026-03-01', 'Fixture Capital-like')],
  milestones: [], investorGroups: [structuredClone(group)],
});

test('reviewed investor families count distinct financings in the ordinary ranking without rewriting source participants', () => {
  const sources = fixture();
  const before = structuredClone(sources);
  const index = buildFundingIndex(sources);
  assert.deepEqual(index.investors.find(row => row.name === 'Fixture family'), {
    name: 'Fixture family', roundCount: 2, companyCount: 1, associatedCapitalUsdM: 10,
  }, 'two family members in one financing must count that financing and its amount only once');
  assert.ok(!index.investors.some(row => group.memberNames.includes(row.name)), 'family and its members must not be ranked twice');
  assert.equal(index.investors.find(row => row.name === 'Fixture Capital-like').roundCount, 1, 'no fuzzy or prefix aliasing');
  assert.deepEqual(index.rounds.map(row => row.investors), [['Fixture Capital', 'Fixture Ventures'], ['Fixture Ventures'], ['Fixture Capital-like']]);
  assert.deepEqual(sources, before, 'aggregation cannot mutate source records');
});


test('investor family groups reject missing provenance and overlapping or ambiguous member names', () => {
  const invalid = [
    g => { g[0].sourceUrls = []; },
    g => { g[0].reviewedOn = '2026-02-30'; },
    g => { g[0].note = ''; },
    g => { g[0].name = ''; },
    g => { g[0].memberNames = ['Fixture Capital', 'Fixture Capital']; },
    g => { g[0].memberNames = []; },
    g => { g[0].sourceUrls = ['http://example.org/']; },
    g => { g.push({ ...structuredClone(g[0]), name: 'Other family' }); },
    g => { g.push({ ...structuredClone(g[0]), memberNames: ['Other Capital'] }); },
    g => { g[0].memberNames.push('Other family'); g.push({ ...structuredClone(g[0]), name: 'Other family', memberNames: ['Other Capital'] }); },
  ];
  for (const mutate of invalid) {
    const sources = fixture();
    mutate(sources.investorGroups);
    assert.throws(() => buildFundingIndex(sources), /Invalid investor grouping/, JSON.stringify(sources.investorGroups));
  }
});


test('investor family display names cannot absorb unrelated named source participants', async () => {
  for (const amount of ['5', '1', '']) {
    const sources = fixture();
    sources.investorGroups[0].name = 'Fixture Capital-like';
    sources.rounds[2].amount_usd_m = amount;
    assert.throws(() => buildFundingIndex(sources), /Invalid investor grouping: display name collides with source participant/, 'Check all source participants, not only ranked qualifying rounds');
  }
  const canonical = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);
  canonical.investorGroups[0].name = 'Khosla Ventures';
  assert.throws(() => buildFundingIndex(canonical), /Invalid investor grouping: display name collides with source participant/, 'Real canonical repro must fail closed, not silently merge Khosla');
  const explicitMember = fixture();
  explicitMember.investorGroups[0].name = 'Fixture Capital';
  assert.doesNotThrow(() => buildFundingIndex(explicitMember), 'A display name may match its own explicitly reviewed member');
});

test('canonical PL and PLC records form one neutral ranked family with no new financing or portfolio inference', async () => {
  const sources = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);
  assert.ok(Array.isArray(sources.investorGroups), 'loader reads separately reviewed grouping, not portfolio membership');
  const grouped = buildFundingIndex(sources);
  const ungrouped = buildFundingIndex({ ...sources, investorGroups: [] });
  const name = 'Protocol Labs (incl. PLC Neuro)';
  const members = ['Protocol Labs', 'PLC Neurotech', 'PL Capital'];
  const familyConfig = sources.investorGroups.find(row => row.name === name);
  assert.ok(familyConfig, 'the reviewed display family uses the owner-requested label');
  assert.deepEqual(familyConfig.memberNames, members, 'only the three reviewed exact source labels form this display family');
  assert.match(familyConfig.note, /PL Capital/);
  assert.match(familyConfig.note, /display.only/);
  assert.ok(familyConfig.sourceUrls.includes('https://www.linkedin.com/posts/protocolvc_congrats-to-merge-labs-on-its-250m-seed-activity-7418000018110009344-7fBL'));
  const records = grouped.rounds.filter(row => row.investors.some(member => members.includes(member)));
  assert.deepEqual(records.map(row => [row.companySlug, row.announcedOn]).sort(), [
    ['merge-labs', '2026-01-15'], ['neurosoft-bioelectronics', '2026-05-20'], ['science-corporation', '2026-11-17'], ['synchron', '2025-11-06'],
  ]);
  const family = grouped.investors.find(row => row.name === name);
  assert.deepEqual(family, { name, roundCount: 4, companyCount: 4, associatedCapitalUsdM: 859.5 });
  assert.ok(!grouped.investors.some(row => members.includes(row.name)), 'no duplicate member ranking');
  assert.deepEqual(grouped.rounds, ungrouped.rounds, 'source investor identities, stages, dates and amounts unchanged');
  assert.deepEqual(grouped.companies, ungrouped.companies);
  assert.deepEqual(grouped.investors.filter(row => row.name !== name), ungrouped.investors.filter(row => !members.includes(row.name)), 'every unrelated investor keeps the same counts and relative order');
  assert.deepEqual(grouped.investors, buildFundingIndex({ ...sources, portfolioDisclosures: [] }).investors, 'portfolio list is not a financing input');
});
