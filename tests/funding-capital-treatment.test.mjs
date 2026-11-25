import test from 'node:test';
import assert from 'node:assert/strict';
import { capitalExclusionLabel, CAPITAL_EXCLUSION_LABEL, countedCapital } from '../src/lib/funding-capital.mjs';
import { buildFundingIndex, buildCompanyRows } from '../scripts/lib/funding-index.mjs';
import { buildCompanyRows as clientRows, summarizePortfolioEvidence } from '../src/lib/funding-index.ts';

const fixture = () => ({
  companies: [{ slug: 'fixture', name: 'Fixture', modality: 'Fixture', scope: 'Implanted' }],
  rounds: [
    { company_slug: 'fixture', announced_on: '2021-10-19', stage: 'Seed', amount_usd_m: '28.2306', investors: 'Fixture Capital' },
    { company_slug: 'fixture', announced_on: '2022-09-21', stage: 'Equity/debt financing', amount_usd_m: '8.864853', investors: 'Fixture Capital', capital_treatment: 'overlap-unresolved', note: 'Conversion overlap unresolved; held out pending reconciliation.' },
  ], milestones: [],
});
const filters = { query: '', scope: 'All', modality: 'All' };

test('a held financing retains its source amount and record count but contributes no company or investor capital', () => {
  const index = buildFundingIndex(fixture());
  assert.equal(index.rounds.length, 2);
  assert.equal(index.rounds[1].amountUsdM, 8.864853);
  assert.equal(index.investors[0].roundCount, 2);
  assert.equal(index.investors[0].associatedCapitalUsdM, 28.23);
  assert.equal(index.rounds[1].capitalTreatment, 'overlap-unresolved');
  for (const rows of [buildCompanyRows, clientRows]) {
    const company = rows(index.companies, index.rounds, filters)[0];
    assert.equal(company.rounds.length, 2);
    assert.equal(company.observedCapitalUsdM, 28.23);
  }
});

test('portfolio family and member associated capital also omit held dollars without losing the financing appearance', () => {
  const index = buildFundingIndex(fixture());
  const result = summarizePortfolioEvidence({ investorName: 'Fixture Capital', companies: [{ name: 'Fixture', companySlug: 'fixture' }] }, index.companies, index.rounds);
  assert.equal(result.indexedFinancingCount, 2);
  assert.equal(result.associatedCapitalUsdM, 28.23);
  assert.equal(result.members[0].associatedCapitalUsdM, 28.23);
});

test('capital treatment rejects unknown statuses and unexplained holds even on unnamed or below-threshold records', () => {
  for (const amount of ['8.864853', '1', '']) {
    for (const edit of [...['unknown', ' ', null, false, 42].map(value => round => { round.capital_treatment = value; }), round => { round.note = ''; }, round => { round.note = '   '; }]) {
      const sources = fixture();
      sources.rounds[1].amount_usd_m = amount;
      sources.rounds[1].investors = '';
      edit(sources.rounds[1]);
      assert.throws(() => buildFundingIndex(sources), /Invalid capital treatment/);
    }
  }
});


test('superseded disclosures remain visible while only the replacing financing contributes capital', () => {
  const sources = fixture();
  sources.rounds[1].capital_treatment = 'superseded';
  sources.rounds[1].note = 'The later filing replaces this preliminary announcement.';
  const index = buildFundingIndex(sources);
  assert.equal(index.rounds.length, 2);
  assert.equal(index.rounds[1].amountUsdM, 8.864853);
  assert.equal(index.investors[0].roundCount, 2);
  assert.equal(index.investors[0].associatedCapitalUsdM, 28.23);
  for (const rows of [buildCompanyRows, clientRows]) {
    assert.equal(rows(index.companies, index.rounds, filters)[0].observedCapitalUsdM, 28.23);
  }
});


test('scope-unresolved disclosures retain participation with no assumed additive capital', () => {
  const sources = fixture();
  sources.rounds[1].capital_treatment = 'scope-unresolved';
  sources.rounds[1].note = 'The disclosed total includes secondary sales with no primary allocation.';
  const index = buildFundingIndex(sources);
  assert.equal(index.rounds[1].amountUsdM, 8.864853);
  assert.equal(index.investors[0].associatedCapitalUsdM, 28.23);
  const result = summarizePortfolioEvidence({ investorName: 'Fixture Capital', companies: [{ name: 'Fixture', companySlug: 'fixture' }] }, index.companies, index.rounds);
  assert.equal(result.indexedFinancingCount, 2);
  assert.equal(result.associatedCapitalUsdM, 28.23);
  assert.equal(result.members[0].associatedCapitalUsdM, 28.23);
});


test('capital holds require a written source note for every supported reason', () => {
  for (const capitalTreatment of ['overlap-unresolved', 'superseded', 'scope-unresolved']) {
    for (const note of [undefined, null, '', ' ', false, 42, {}, []]) {
      assert.throws(() => countedCapital({ amountUsdM: null, capitalTreatment, note }), /Invalid capital treatment/);
    }
  }
});


test('null capital is unconverted while malformed amounts fail before aggregation', () => {
  assert.equal(countedCapital({ amountUsdM: null }), 0);
  for (const amountUsdM of [undefined, '', '10', false, NaN, Infinity, -1]) {
    for (const capitalTreatment of [undefined, 'overlap-unresolved', 'superseded', 'scope-unresolved']) {
      assert.throws(() => countedCapital({ amountUsdM, capitalTreatment, note: 'Source scope requires a hold.' }), /Invalid capital amount/);
    }
  }
});


test('exclusion labels share the strict treatment boundary and preserve the established overlap wording', () => {
  const record = { amountUsdM: 20, note: 'Source explanation.' };
  assert.equal(capitalExclusionLabel(record), null);
  assert.equal(capitalExclusionLabel({ ...record, capitalTreatment: '' }), null);
  assert.equal(capitalExclusionLabel({ ...record, capitalTreatment: 'overlap-unresolved' }), CAPITAL_EXCLUSION_LABEL);
  for (const capitalTreatment of ['unknown', null, false, 42, [], {}]) {
    assert.throws(() => capitalExclusionLabel({ ...record, capitalTreatment }), /Invalid capital treatment/);
  }
});
