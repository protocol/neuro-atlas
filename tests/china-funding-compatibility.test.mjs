import test from 'node:test';
import { countedCapital } from '../src/lib/funding-capital.mjs';
import { beforeMergeParadromicsFile } from './helpers/financing-merge-baseline.mjs';
import { beforeFinancingFixesFile } from './helpers/financing-fixes-baseline.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReviewedFilesFixture, sha256 } from '../scripts/qa/build-reviewed-delta.mjs';

const compatibility = await import('./helpers/china-funding-baseline.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('historical reader restores only explicit reviewed source/generated paths and leaves live files untouched', async t => {
  assert.equal(typeof compatibility.createHistoricalFileReader, 'function', 'A historical-only reader must exist');
  const root = await mkdtemp(join(tmpdir(), 'neuro-historical-reader-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const base = join(root, 'base'), candidate = join(root, 'candidate');
  await mkdir(base); await mkdir(candidate);
  const before = 'slug,note\nold,"original, unchanged"\n';
  const after = before + 'new,"reviewed source"\n';
  await writeFile(join(base, 'rows.csv'), before); await writeFile(join(candidate, 'rows.csv'), after);
  const fixture = await buildReviewedFilesFixture({ baseDir: base, candidateDir: candidate, baselineSha: 'a'.repeat(40), files: ['rows.csv'] });
  const read = compatibility.createHistoricalFileReader(fixture, candidate);
  assert.equal(read(join(candidate, 'rows.csv'), 'utf8'), before);
  assert.equal(read(join(candidate, 'rows.csv')).toString('utf8'), before);
  const { readFile } = await import('node:fs/promises');
  assert.equal(await readFile(join(candidate, 'rows.csv'), 'utf8'), after, 'The real data must not be rewritten');
  await writeFile(join(candidate, 'rows.csv'), after.replace('original, unchanged', 'unreviewed old field'));
  assert.notEqual(sha256(read(join(candidate, 'rows.csv'), 'utf8')), fixture.files[0].beforeSha256,
    'Unlisted historical mutations still fail the original byte golden');
  await writeFile(join(candidate, 'untouched.json'), '{"notInAllowance":true}');
  assert.equal(read(join(candidate, 'untouched.json'), 'utf8'), '{"notInAllowance":true}');
  assert.equal(read(join(base, 'rows.csv'), 'utf8'), before, 'An outside file is read normally, never matched by basename');
});

test('every reviewed current file reconstructs the exact pinned historical bytes without a runtime git lookup', async () => {
  const { readFile } = await import('node:fs/promises');
  const { CHINA_FUNDING_DELTA, CHINA_FUNDING_BASELINE_SHA, readHistoricalFileSync } = compatibility;
  assert.equal(CHINA_FUNDING_BASELINE_SHA, '023598e99d14b799b536df680e07f9d30e83b649');
  assert.equal(CHINA_FUNDING_DELTA.baselineSha, CHINA_FUNDING_BASELINE_SHA);
  for (const entry of CHINA_FUNDING_DELTA.files) {
    const file = new URL('../' + entry.path, import.meta.url);
    const current = beforeMergeParadromicsFile(beforeFinancingFixesFile(await readFile(file, 'utf8'), entry.path), entry.path);
    assert.equal(sha256(current), entry.afterSha256, entry.path + ': complete reviewed candidate bytes after copy and financing reversals');
    assert.equal(sha256(readHistoricalFileSync(file, 'utf8')), entry.beforeSha256, entry.path + ': exact original bytes, not a refreshed golden');
  }
});

test('unprojected current source data and generated funding consumers retain exact builder parity as the roster grows', async () => {
  const { readFile } = await import('node:fs/promises');
  const { buildFundingIndex, loadFundingIndexSources } = await import('../scripts/lib/funding-index.mjs');
  const sources = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);
  const current = JSON.parse(await readFile(new URL('../src/data/funding-index.json', import.meta.url), 'utf8'));
  const built = buildFundingIndex(sources);
  assert.deepEqual(current.companies.map(({ logo, ...company }) => company), built.companies);
  for (const key of ['rounds', 'milestones', 'investors', 'portfolioDisclosures']) assert.deepEqual(current[key], built[key], key);
  assert.equal(current.summary.selectedCompanies, built.companies.length);
  assert.equal(current.summary.indexedRounds, built.rounds.length);
  assert.equal(current.summary.regulatoryMilestones, built.milestones.length);
  assert.equal(current.summary.observedCapitalUsdM, Number(built.rounds.reduce((sum, round) => sum + countedCapital(round), 0).toFixed(2)));
});
