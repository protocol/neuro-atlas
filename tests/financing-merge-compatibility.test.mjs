import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256, restoreReviewedFile } from '../scripts/qa/build-reviewed-delta.mjs';
import { PARADROMICS_OVER_CHINA, CHINA_OVER_PARADROMICS, beforeMergeChinaFunding } from './helpers/financing-merge-baseline.mjs';
import { beforeParadromicsFunding } from './helpers/paradromics-funding-baseline.mjs';
import { readHistoricalFileSync } from './helpers/china-funding-baseline.mjs';

for (const [name, fixture] of Object.entries({ PARADROMICS_OVER_CHINA, CHINA_OVER_PARADROMICS })) {
  test(name + ' preserves exact reviewed parent bytes and exact merged candidate bytes', () => {
    for (const entry of fixture.files) {
      const current = readFileSync(new URL('../' + entry.path, import.meta.url), 'utf8');
      assert.equal(sha256(current), entry.afterSha256, entry.path + ': exact merged bytes');
      assert.equal(sha256(restoreReviewedFile(current, fixture, entry.path)), entry.beforeSha256, entry.path + ': exact original parent bytes');
    }
  });
}

test('both independent reviewed projections compose to the identical frozen pre-PR funding payload', () => {
  const file = new URL('../src/data/funding-index.json', import.meta.url);
  const live = JSON.parse(readFileSync(file, 'utf8'));
  const original = JSON.parse(readHistoricalFileSync(file, 'utf8'));
  assert.deepEqual(beforeParadromicsFunding(live), original);
  assert.deepEqual([live.companies.length, live.rounds.length, live.summary.observedCapitalUsdM], [31, 54, 4050.05]);
  assert.deepEqual([original.companies.length, original.rounds.length, original.summary.observedCapitalUsdM], [25, 42, 3553.96]);
});

test('China projection rejects changed, missing, duplicate and extra-field reviewed financing records', () => {
  const live = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url), 'utf8'));
  const i = live.rounds.findIndex(row => row.companySlug === 'nanochap');
  for (const mutate of [
    f => { f.rounds[i].note += ' unreviewed'; },
    f => { f.rounds.splice(i, 1); },
    f => { f.rounds.push(f.rounds[i]); },
    f => { f.rounds[i].extra = true; },
  ]) {
    const changed = structuredClone(live); mutate(changed);
    assert.throws(() => beforeMergeChinaFunding(changed), assert.AssertionError);
  }
});
