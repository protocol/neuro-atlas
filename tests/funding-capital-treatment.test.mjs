import test from 'node:test';
import assert from 'node:assert/strict';
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
