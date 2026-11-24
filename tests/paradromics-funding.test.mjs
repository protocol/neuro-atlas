import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
import { buildCompanyRows, formatCapital } from '../src/lib/funding-index.ts';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const load = file => JSON.parse(read(file));
const fixture = load('tests/fixtures/paradromics-funding-20261124.json');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sec = [
  'https://www.sec.gov/Archives/edgar/data/1668302/000166830221000003/xslFormDX01/primary_doc.xml',
  'https://www.sec.gov/Archives/edgar/data/1668302/000166830222000002/xslFormDX01/primary_doc.xml',
  'https://www.sec.gov/Archives/edgar/data/1668302/000193459823000003/xslFormDX01/primary_doc.xml',
];

test('Paradromics retains four public records while only the reconciled offering amounts enter indexed capital', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-derived.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const funding = load('src/data/funding-index.json');
  const rounds = funding.rounds.filter(row => row.companySlug === 'paradromics');
  assert.equal(rounds.length, 4);
  const byYear = year => rounds.find(row => row.announcedOn.startsWith(year));
  for (const [year, date, stage, amount, source] of [
    ['2021', '2021-10-19', 'Seed', 28.2306, sec[0]],
    ['2022', '2022-09-21', 'Equity/debt financing', 8.864853, sec[1]],
    ['2023', '2023-11-07', 'Series A', 50.141276, sec[2]],
  ]) {
    const row = byYear(year);
    assert.equal(row.announcedOn, date);
    assert.equal(row.stage, stage);
    assert.equal(row.amountUsdM, amount);
    assert.equal(row.sourceUrl, source);
    assert.equal(row.dateBasis, 'reported');
    assert.equal(row.datePrecision, 'day');
    assert.equal(row.sourceKind, 'primary');
    assert.equal(row.reviewedOn, '2026-11-24');
  }
  assert.equal(byYear('2022').capitalTreatment, 'overlap-unresolved');
  assert.deepEqual(byYear('2022').investors, []);
  assert.match(byYear('2022').note, /2022-02-17/);
  assert.match(byYear('2022').note, /conversion overlap unresolved/i);
  for (const [year, oldDate, amount, saleDate] of [['2021', '2021-07-22', '$20m', '2021-01-15'], ['2023', '2023-05-18', '$33m', '2023-03-21']]) {
    const row = byYear(year);
    const original = fixture.before.fundingRounds.find(row => row.announcedOn === oldDate);
    for (const fact of [oldDate, amount, saleDate, original.sourceUrl]) assert.ok(row.note.includes(fact), fact);
    assert.match(row.note, /not.*later (?:sales|closings)/i);
    assert.deepEqual(row.investors, original.investors);
    assert.deepEqual(row.investorEvidence.map(e => e.investorName), original.investors);
    for (const evidence of row.investorEvidence) {
      assert.equal(evidence.sourceKind, 'primary');
      assert.ok(evidence.sourceExcerpt.includes(evidence.investorName));
    }
  }
  assert.deepEqual(byYear('2018'), fixture.before.fundingRounds[0]);
  const company = buildCompanyRows(funding.companies, funding.rounds, { query: 'Paradromics', scope: 'All', modality: 'All' })[0];
  assert.equal(company.observedCapitalUsdM, 85.37);
  assert.equal(formatCapital(company.observedCapitalUsdM), '$85.4M');
  assert.equal(funding.summary.observedCapitalUsdM, 3579.33);
  assert.equal(funding.summary.indexedRounds, 43);
  assert.equal(funding.summary.asOf, '2026-11-17', 'bounded row review is not a whole-index refresh');
});

test('the correction leaves every unrelated canonical record and provenance file unchanged', () => {
  const raw = parseCsv(read('data/funding-index/rounds.csv'));
  // New optional metadata is empty for legacy records, not a change in their meaning.
  const legacy = raw.filter(r => r.company_slug !== 'paradromics').map(({ capital_treatment, ...row }) => {
    assert.equal(capital_treatment, '');
    return row;
  });
  assert.equal(hash(legacy), fixture.unrelatedCanonicalSha256);
  const funding = load('src/data/funding-index.json');
  assert.equal(hash(funding.rounds.filter(r => r.companySlug !== 'paradromics')), fixture.unrelatedRoundsSha256);
  for (const [path, digest] of Object.entries(fixture.unchangedFiles)) {
    assert.equal(createHash('sha256').update(read(path)).digest('hex'), digest, path);
  }
});


test('the public source catalog registers this correction without reclassifying other evidence', async () => {
  const { beforeParadromicsCatalog } = await import('./helpers/paradromics-funding-baseline.mjs');
  beforeParadromicsCatalog(load('src/data/methodology-sources.json'));
});


test('historical normalization rejects missing, duplicate, extra-field or changed Paradromics records without weakening older hashes', async () => {
  const { beforeParadromicsRows, beforeParadromicsFunding } = await import('./helpers/paradromics-funding-baseline.mjs');
  for (const [kind, rows, key] of [
    ['fundingRounds', load('src/data/funding-index.json').rounds, 'companySlug'],
    ['canonicalRounds', parseCsv(read('data/funding-index/rounds.csv')), 'company_slug'],
  ]) {
    const snapshot = structuredClone(rows);
    const restored = beforeParadromicsRows(rows, kind);
    assert.deepEqual(rows, snapshot, 'normalization is non-mutating');
    assert.deepEqual(restored.filter(r => r[key] === 'paradromics'), fixture.before[kind]);
    const i = rows.findIndex(r => r[key] === 'paradromics' && (r.announcedOn ?? r.announced_on) === '2022-09-21');
    for (const field of Object.keys(rows[i])) {
      const changed = structuredClone(rows);
      changed[i][field] = 'unreviewed';
      assert.throws(() => beforeParadromicsRows(changed, kind), assert.AssertionError, field);
    }
    const extra = structuredClone(rows); extra[i].unreviewed = true;
    assert.throws(() => beforeParadromicsRows(extra, kind), assert.AssertionError);
    assert.throws(() => beforeParadromicsRows(rows.filter((_, j) => j !== i), kind), assert.AssertionError);
    assert.throws(() => beforeParadromicsRows([...rows, rows[i]], kind), assert.AssertionError);
  }
  const funding = load('src/data/funding-index.json');
  for (const mutate of [
    f => { f.investors[0].associatedCapitalUsdM += 1; },
    f => { f.summary.observedCapitalUsdM += 1; },
    f => { f.methodology.coverage += ' unreviewed'; },
  ]) {
    const changed = structuredClone(funding); mutate(changed);
    assert.throws(() => beforeParadromicsFunding(changed), assert.AssertionError);
  }
});

test('derived generation is byte-deterministic after the selective correction', () => {
  const first = read('src/data/funding-index.json');
  const result = spawnSync(process.execPath, ['scripts/generate-derived.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('src/data/funding-index.json'), first);
});


test('Paradromics chart labels stay compact while canonical amounts and notes retain exact source dollars', () => {
  const funding = load('src/data/funding-index.json');
  for (const [date, label, amount, dollars] of [
    ['2021-10-19', '$28.23m', 28.2306, '$28,230,600'],
    ['2022-09-21', '$8.86m', 8.864853, '$8,864,853'],
    ['2023-11-07', '$50.14m', 50.141276, '$50,141,276'],
  ]) {
    const row = funding.rounds.find(r => r.companySlug === 'paradromics' && r.announcedOn === date);
    assert.equal(row.displayAmount, label);
    assert.equal(row.amountUsdM, amount);
    assert.equal(row.note.includes(dollars), true);
  }
});
