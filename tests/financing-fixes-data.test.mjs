import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, buildFundingIndex, loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';
import { countedCapital } from '../src/lib/funding-capital.mjs';
import { buildCompanyRows } from '../src/lib/funding-index.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/financing-copy-current-assertions-20261125.json', import.meta.url)));
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

// EVID-01: use the real canonical and generated payloads, never a historical reader.
for (const [slug, date, qualifier] of [
  ['blackrock-neurotech', '2024-05-06', /first sale April 29, 2024/],
  ['bci-sonics', '2026-06-09', /comparison anchor rather than an exact per-round cash amount/],
  ['nanochap', '2026-05-06', /contemporaneous strategic-financing label/],
  ['zhiran-medical', '2025-08-12', /lower bound; actual proceeds exceed it/],
]) {
  test('EVID-01 counted disclosure is present once on both real surfaces: ' + slug, () => {
    const canonicalFunding = parseCsv(readFileSync(new URL('../data/funding-index/rounds.csv', import.meta.url), 'utf8'))
      .filter(row => row.company_slug === slug && row.announced_on === date);
    assert.equal(canonicalFunding.length, 1);
    const source = canonicalFunding[0];
    const round = funding().rounds.find(row => row.companySlug === slug && row.announcedOn === date && row.sourceUrl === source.source_url);
    assert.ok(round && countedCapital(round) > 0, 'actual Funding disclosure is counted');
    const canonical = parseCsv(readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8'))
      .filter(row => row.nf_slug === slug && row.date === date && row.source_url === source.source_url);
    assert.equal(canonical.length, 1, 'one corresponding canonical Milestone: ' + slug);
    assert.equal(canonical[0].scope, 'bci');
    assert.equal(canonical[0].stage, 'capital');
    assert.equal(canonical[0].date_precision, source.date_precision);
    assert.equal(canonical[0].date_basis, source.date_basis);
    assert.equal(canonical[0].amount_usd_m, source.amount_usd_m, 'reuse native FX rather than a rounded USD scalar');
    assert.equal(canonical[0].capital_treatment, source.capital_treatment);
    assert.match(canonical[0].note, qualifier);
    const generated = timeline().filter(row => row.company === canonical[0].company && row.date === date && row.sourceUrl === source.source_url);
    assert.equal(generated.length, 1, 'one generated Milestone: ' + slug);
    assert.equal(generated[0].amountUsdM, round.amountUsdM);
    assert.equal(countedCapital(generated[0]), countedCapital(round));
    assert.equal(generated[0].dateBasis, round.dateBasis);
    assert.deepEqual(generated[0].fx, round.fx, 'identical existing source/date historical FX');
    assert.match(generated[0].note, qualifier);
    if (slug !== 'blackrock-neurotech') {
      const later = timeline().find(row => row.company === canonical[0].company && row.stage === 'capital' && row.date > date);
      assert.ok(later, 'separately supported later round remains present');
      assert.doesNotMatch(later.note, /remains under review|separate research lead/);
    }
    if (slug === 'bci-sonics') {
      assert.equal(timeline().filter(row => row.company === canonical[0].company && row.sourceUrl === source.source_url).length, 1, 'combined angel series is not split into invented closes');
    }
  });
}

test('the selective financing review checkpoint is November 25 without claiming complete lifetime cash coverage', () => {
  assert.equal(funding().summary.asOf, '2026-11-25');
});

test('raw integrated inventory and real counted capital preserve the accepted financing checkpoint', () => {
  const index = funding(), rows = timeline();
  assert.equal(index.rounds.length, 78);
  assert.equal(rows.length, 126);
  assert.equal(rows.filter(row => row.stage === 'capital').length, 70);
  assert.equal(rows.filter(row => row.stage !== 'capital').length, 56);
  assert.equal(index.companies.length, 31);
  assert.equal(index.milestones.length, 15);
  assert.equal(Number(index.rounds.reduce((sum, round) => sum + countedCapital(round), 0).toFixed(2)), 4316.65);
  assert.equal(index.summary.observedCapitalUsdM, 4316.65);
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
