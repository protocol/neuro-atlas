import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildFundingIndex, loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';
import { buildCompanyRows } from '../src/lib/funding-index.ts';
const load = file => JSON.parse(readFileSync(new URL('../' + file, import.meta.url)));
const fixture = load('tests/fixtures/paradromics-reported-total-20261124.json');
const sources = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);

test('public company totals are a separate evidence class and leave every itemized metric unchanged', () => {
  const legacy = buildFundingIndex({ ...sources, reportedTotals: [] });
  const result = buildFundingIndex({ ...sources, reportedTotals: fixture.reportedTotals });
  const { reportedTotals, ...rest } = result;
  assert.deepEqual(reportedTotals, fixture.reportedTotals, 'retain the sourced company self-report separately from rounds');
  assert.deepEqual(rest, legacy, 'rounds, roster, investors, and aggregate calculations are unchanged');
  assert.equal(Object.hasOwn(legacy, 'reportedTotals'), false, 'no metadata retains legacy payload shape');
  assert.deepEqual(buildFundingIndex({ ...sources, reportedTotals: undefined }), legacy, 'omitted metadata retains legacy calculations');
  const row = buildCompanyRows(result.companies, result.rounds, { query: 'Paradromics', scope: 'All', modality: 'All' })[0];
  assert.equal(row.observedCapitalUsdM, 85.37);
});

test('reported company totals reject invalid identity, amount, date, source, and scope', () => {
  const valid = fixture.reportedTotals[0];
  for (const patch of [
    { companySlug: 'unknown' }, { companySlug: '' },
    { amountUsdM: 0 }, { amountUsdM: -1 }, { amountUsdM: NaN }, { amountUsdM: Infinity }, { amountUsdM: '180' },
    { reportedOn: '' }, { reportedOn: '2026-02-30' }, { reportedOn: 'November 18, 2026' },
    { sourceUrl: '' }, { sourceUrl: 'http://example.com' }, { sourceUrl: 'invalid' },
    { sourceUrl: [valid.sourceUrl] }, { sourceUrl: ` ${valid.sourceUrl} ` },
    { sourceUrl: 'https://reviewer@example.com/source' }, { sourceUrl: 'https:/example.com/source' },
    { sourceUrl: 'https://example.com/%ZZ' }, { sourceUrl: 'https://example.com/has space' },
    { privateNote: 'synthetic unexpected field' },
    { sourceKind: '' }, { sourceKind: 'audited' }, { scope: '' }, { scope: ' ' },
    { reviewedOn: '2026-02-30' }, { note: '' },
  ]) {
    assert.throws(() => buildFundingIndex({ ...sources, reportedTotals: [{ ...valid, ...patch }] }), /reported total/i, JSON.stringify(patch));
  }
  for (const reportedTotals of [null, {}, [null], [valid, valid]]) {
    assert.throws(() => buildFundingIndex({ ...sources, reportedTotals }), /reported total/i);
  }
});

test('canonical reported totals load independently of itemized financing', async () => {
  const loaded = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);
  assert.deepEqual(loaded.reportedTotals, fixture.reportedTotals);
});

test('legacy canonical directories may omit the optional reported-total file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'funding-legacy-'));
  try {
    for (const name of ['companies.csv', 'rounds.csv', 'milestones.csv', 'foundings.csv', 'fx-conversions.json', 'portfolio-disclosures.json', 'investor-groups.json', 'investor-evidence.json']) {
      await cp(new URL('../data/funding-index/' + name, import.meta.url), path.join(directory, name));
    }
    const loaded = await loadFundingIndexSources(directory);
    assert.deepEqual(loaded.reportedTotals, []);
    assert.equal(Object.hasOwn(buildFundingIndex(loaded), 'reportedTotals'), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('generated company total preserves all indexed metrics and has an exact historical allowance', async () => {
  const { beforeParadromicsFunding } = await import('./helpers/paradromics-funding-baseline.mjs');
  const current = load('src/data/funding-index.json');
  assert.deepEqual(current.reportedTotals, fixture.reportedTotals);
  assert.equal(current.summary.observedCapitalUsdM, 3579.33);
  assert.equal(current.summary.indexedRounds, 43);
  assert.equal(current.companies.length, 25);
  assert.equal(Object.hasOwn(beforeParadromicsFunding(current), 'reportedTotals'), false);
  for (const field of Object.keys(fixture.reportedTotals[0])) {
    const changed = structuredClone(current);
    changed.reportedTotals[0][field] = 'unreviewed';
    assert.throws(() => beforeParadromicsFunding(changed), assert.AssertionError, field);
  }
  for (const mutate of [
    f => { f.reportedTotals = []; },
    f => { delete f.reportedTotals; },
    f => { f.reportedTotals.push(f.reportedTotals[0]); },
    f => { f.reportedTotals[0].amountUsdM = 181; },
    f => { f.reportedTotals[0].extra = true; },
    f => { f.reportedTotals[0].scope = 'Private capital'; },
  ]) {
    const changed = structuredClone(current); mutate(changed);
    assert.throws(() => beforeParadromicsFunding(changed), assert.AssertionError);
  }
});

test('the public source catalog registers the exact interview and preserves previous historical goldens', async () => {
  const { beforeParadromicsCatalog } = await import('./helpers/paradromics-funding-baseline.mjs');
  const catalog = load('src/data/methodology-sources.json');
  for (const [category, pairs] of Object.entries(fixture.catalogAdditions)) {
    for (const pair of pairs) assert.deepEqual(catalog[category].filter(([url]) => url === pair[0]), [pair]);
  }
  beforeParadromicsCatalog(catalog);
  for (const [category, pairs] of Object.entries(fixture.catalogAdditions)) {
    const changed = structuredClone(catalog);
    changed[category].find(([url]) => url === pairs[0][0])[1] += ' unreviewed';
    assert.throws(() => beforeParadromicsCatalog(changed), assert.AssertionError);
  }
});
