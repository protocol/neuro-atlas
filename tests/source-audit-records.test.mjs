import test from 'node:test';
import assert from 'node:assert/strict';
import { beforeFinancingFixesFile } from './helpers/financing-fixes-baseline.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCopyDataFileSync } from './helpers/sitewide-copy-data.mjs';
import { restoreCopyMainFile, restoreMerged151Copy, SITEWIDE_COPY_DELTA } from './helpers/sitewide-copy-baseline.mjs';
import { restoreReviewedFile } from '../scripts/qa/build-reviewed-delta.mjs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
import { beforeParadromicsRows } from './helpers/paradromics-funding-baseline.mjs';
const cases = JSON.parse(readFileSync(new URL('./fixtures/source-audit-records-20261116.json', import.meta.url)));
for (const item of cases) {
  test(item.id + ': ' + item.title, () => {
    for (const change of item.changes) {
      const parsed = parseCsv(beforeFinancingFixesFile(readFileSync(new URL('../' + change.path, import.meta.url), 'utf8'), change.path));
      // Frozen fixture row numbers predate the exact, separately asserted addition.
      const rows = change.path === 'data/funding-index/rounds.csv'
        ? beforeParadromicsRows(parsed, 'canonicalRounds') : parsed;
      const row = rows[change.rowNumber - 2];
      assert.ok(row, change.recordId);
      assert.equal(row.company ?? row.company_slug, change.company, 'exact record identity');
      for (const [field, expected] of Object.entries(change.after)) assert.equal(row[field], expected, `${change.recordId}.${field}`);
    }
    assert.ok(item.evidence.length > 0, 'reviewed source evidence is retained with the correction');
  });
}


test('copy-only reconstruction retains unlisted mutations for the original full-file golden', () => {
  const file = 'src/data/funding-index.json';
  const reviewed = SITEWIDE_COPY_DELTA.files.find(entry => entry.path === file);
  const current = JSON.parse(readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
  const digest = text => createHash('sha256').update(text).digest('hex');
  const historical = readCopyDataFileSync(new URL('../' + file, import.meta.url), 'utf8');
  assert.equal(digest(historical), reviewed.beforeSha256, 'unchanged original full-file golden');
  for (const [field, value] of [
    ['unlistedNote', 'Unreviewed prose must survive reconstruction'],
  ]) {
    const mutated = structuredClone(current);
    mutated.summary[field] = value;
    let restored;
    try { restored = restoreMerged151Copy(JSON.stringify(mutated), file); }
    catch (error) {
      assert.ok(error instanceof assert.AssertionError, 'only an exact reviewed-byte rejection is acceptable');
      // The B→M bridge has an exact line delta here: the added root key's
      // insertion order cannot round-trip with the existing JSON leaf builder.
      // Unknown input must reject, never disappear. Keep B's independent
      // original-copy control below as well, without changing that fixture.
      const atB = JSON.parse(restoreCopyMainFile(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), file));
      atB.summary[field] = value;
      restored = restoreReviewedFile(JSON.stringify(atB), SITEWIDE_COPY_DELTA, file);
    }
    assert.equal(JSON.parse(restored).summary[field], value, `unlisted ${field} survives original copy inverse`);
    assert.throws(() => assert.equal(digest(restored), reviewed.beforeSha256),
      { code: 'ERR_ASSERTION' }, `original full-file golden rejects unlisted ${field}`);
  }
  for (const field of ['observedCapitalUsdM', 'asOf']) {
    const mutated = structuredClone(current); mutated.summary[field] = 'UNREVIEWED';
    assert.throws(() => restoreMerged151Copy(JSON.stringify(mutated), file), assert.AssertionError, 'reviewed bridge summary field rejects: ' + field);
  }
  const edited = structuredClone(current);
  edited.rounds.find(row => row.companySlug === 'coherence-neuro' && row.stage === 'Seed').note += ' Unreviewed prose.';
  assert.throws(() => restoreMerged151Copy(JSON.stringify(edited), file),
    { code: 'ERR_ASSERTION' }, 'reviewed prose only accepts the exact approved wording');
});
