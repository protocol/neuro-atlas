import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, buildFundingIndex, loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';
import { countedCapital } from '../src/lib/funding-capital.mjs';
import { buildCompanyRows } from '../src/lib/funding-index.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/financing-fixes-20261125-assertions.json', import.meta.url)));
const funding = () => JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const timeline = () => JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const filter = { query: '', scope: 'All', modality: 'All' };

for (const file of fixture.files) {
  const actual = parseCsv(readFileSync(new URL('../' + file.path, import.meta.url), 'utf8'));
  for (const change of file.changes) {
    test('financing correction ' + change.id + ' matches every approved canonical field', () => {
      const r = change.after;
      const keys = file.path.includes('funding-index')
        ? ['company_slug', 'announced_on', 'stage', 'source_url']
        : ['company', 'date', 'activity', 'source_url'];
      const found = actual.filter(row => keys.every(key => row[key] === r[key]));
      assert.equal(found.length, 1, 'one exact stable financing identity: ' + change.id);
      assert.deepEqual(found[0], r, 'complete reviewed field delta: ' + change.id);
    });
  }
  test(file.path + ' preserves exact reviewed record count', () => assert.equal(actual.length, file.recordCount));
}

test('the selective financing review checkpoint is November 25 without claiming complete lifetime cash coverage', () => {
  assert.equal(funding().summary.asOf, '2026-11-25');
});

test('the full current funding payload is generated from actual canonical sources', async () => {
  const input = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);
  const built = buildFundingIndex(input);
  const generated = funding();
  assert.deepEqual(generated.rounds, built.rounds);
  assert.deepEqual(generated.investors, built.investors);
  assert.deepEqual(generated.reportedTotals, built.reportedTotals);
  assert.equal(generated.summary.observedCapitalUsdM, Number(built.rounds.reduce((sum, r) => sum + countedCapital(r), 0).toFixed(2)));
});

test('supplementary participant citations remain attached to the corrected offering instead of relying on an amount-only principal source', () => {
  const rounds = funding().rounds;
  for (const [slug, stage, name, host] of [
    ['neuralink', 'Series D', 'Founders Fund', 'cnn.com'],
    ['merge-labs', 'Seed', 'Interface Fund', 'butterflynetwork.com'],
    ['neuroxess', 'Series B', 'SDIC Unity Capital', 'en.neuroxess.com'],
    ['conmind', 'Series C', '粤科金融', 'vbdata.cn'],
  ]) {
    const row = rounds.find(r => r.companySlug === slug && r.stage === stage);
    assert.ok(row.investorEvidence?.some(e => e.investorName === name && e.sourceUrl.includes(host)), name);
  }
});

test('material same-offering amendments and combined closes appear once', () => {
  const rounds = funding().rounds;
  const neuralink = rounds.filter(r => r.companySlug === 'neuralink' && r.stage === 'Series D');
  assert.equal(neuralink.length, 1);
  assert.equal(neuralink[0].amountUsdM, 323.241676);
  const seed = rounds.filter(r => r.companySlug === 'neurobionics' && r.stage === 'Seed');
  assert.equal(seed.length, 1);
  assert.equal(seed[0].amountUsdM, 10);
  assert.equal(seed[0].announcedOn, '2025-12-16');
});

test('Nia retains the Penn report while counting the latest continuing offering once', () => {
  const index = funding();
  const rows = index.rounds.filter(r => r.companySlug === 'nia-therapeutics');
  assert.equal(rows.length, 2);
  assert.equal(rows.find(r => r.sourceUrl.includes('pci.upenn.edu')).capitalTreatment, 'scope-unresolved');
  const latest = rows.find(r => r.sourceUrl.includes('000175872526000002'));
  assert.equal(latest.amountUsdM, 23.573844);
  assert.equal(rows.reduce((sum, r) => sum + countedCapital(r), 0), 23.573844);
  assert.equal(buildCompanyRows(index.companies, index.rounds, filter).find(r => r.slug === 'nia-therapeutics').observedCapitalUsdM, 23.57);
});

test('Precision keeps issuer cumulative context separate from its supported rounds and unallocated SAFE', () => {
  const index = funding();
  const rounds = index.rounds.filter(r => r.companySlug === 'precision-neuroscience');
  const safe = rounds.find(r => r.stage === 'SAFE');
  assert.equal(safe.amountUsdM, 27.5);
  assert.equal(safe.capitalTreatment, 'overlap-unresolved');
  assert.equal(rounds.reduce((sum, r) => sum + countedCapital(r), 0), 405);
  assert.equal(index.reportedTotals.find(r => r.companySlug === 'precision-neuroscience').amountUsdM, 430);
});

test('signed facilities, control consideration and period-unknown support retain disclosed values with explicit exclusions', () => {
  const index = funding();
  for (const [slug, fragment] of [['inbrain-neuroelectronics', 'eib.org'], ['blackrock-neurotech', 'tether-invested'], ['neucyber-neurotech', 'krro.com']]) {
    const row = index.rounds.find(r => r.companySlug === slug && r.sourceUrl.includes(fragment));
    assert.ok(row && row.amountUsdM > 0, 'source amount remains visible: ' + slug);
    assert.equal(row.capitalTreatment, 'scope-unresolved', slug);
    assert.equal(countedCapital(row), 0, slug);
  }
});

test('the timeline preserves superseded and multiyear source disclosures outside additive annual capital', () => {
  const rows = timeline();
  const kickoff = rows.find(r => r.company === 'Blue Arbor Technologies' && r.amountUsdM === 5);
  const close = rows.find(r => r.company === 'Blue Arbor Technologies' && r.amountUsdM === 10.5);
  assert.equal(kickoff.capitalTreatment, 'superseded');
  assert.equal(countedCapital(kickoff), 0);
  assert.equal(countedCapital(close), 10.5);
  const nia = rows.filter(r => r.company === 'Nia Therapeutics' && r.stage === 'capital');
  assert.equal(nia.length, 2);
  assert.equal(nia.reduce((sum, r) => sum + countedCapital(r), 0), 0);
  const old = rows.find(r => r.company === 'Neuracle' && r.sourceUrl.includes('426207'));
  assert.equal(old.date, '2019-08-26');
  assert.equal(rows.some(r => r.company === 'Neuracle' && r.date === '2024-03-03' && r.stage === 'capital'), false);
});
