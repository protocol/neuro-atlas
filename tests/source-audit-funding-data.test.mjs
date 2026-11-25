import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFundingIndex, loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';

const sources = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);

test('source-supported capitalization aliases do not split one investor across leaderboards', () => {
  const index = buildFundingIndex(sources);
  const names = index.investors.filter(i => i.name.toLowerCase() === 'neurotechnology investors');
  assert.equal(names.length, 1);
  assert.equal(names[0].name, 'NeuroTechnology Investors');
  assert.equal(names[0].roundCount, 4);
  assert.equal(names[0].companyCount, 1);
  assert.equal(names[0].associatedCapitalUsdM, 325);
  for (const round of index.rounds) assert.ok(!round.investors.includes('Neurotechnology Investors'));
});


test('date-basis metadata fails closed on invalid labels and defaults missing labels to unverified', () => {
  for (const kind of ['rounds', 'milestones']) {
    const invalid = structuredClone(sources);
    invalid[kind][0].date_basis = 'assume-confirmed';
    assert.throws(() => buildFundingIndex(invalid), /Invalid source date basis/);
    const missing = structuredClone(sources);
    delete missing[kind][0].date_basis;
    assert.equal(buildFundingIndex(missing)[kind][0].dateBasis, 'unverified');
  }
});


test('NeuroXess combined angel and pre-Series A disclosure is indexed once without invented round allocation', () => {
  const matches = sources.rounds.filter(r => r.company_slug === 'neuroxess' && r.source_url.includes('yicaiglobal.com'));
  assert.equal(matches.length, 1);
  const row = matches[0];
  assert.equal(row.stage, 'Angel + pre-Series A (combined)');
  assert.equal(row.announced_on, '2022-01-11');
  assert.equal(row.amount_usd_m, '15.2');
  assert.equal(row.amount_native_m, '97');
  assert.equal(row.investors, 'Shanda Group;Sequoia Capital China');
  const index = buildFundingIndex(sources);
  const specific = index.investors.find(i => i.name === 'Sequoia Capital China');
  assert.equal(specific.roundCount, 1);
  assert.equal(specific.associatedCapitalUsdM, 15.2);
  const generic = index.investors.find(i => i.name === 'Sequoia Capital');
  assert.equal(generic.roundCount, 1);
  assert.equal(generic.associatedCapitalUsdM, 650);
  assert.match(row.note, /allocation by round remains undisclosed/i);
  assert.equal(index.rounds.filter(r => r.companySlug === 'neuroxess' && r.stage === 'Angel + pre-Series A (combined)').length, 1, 'The combined disclosure is counted once');
});
