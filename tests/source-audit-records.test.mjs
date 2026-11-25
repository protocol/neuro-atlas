import test from 'node:test';
import assert from 'node:assert/strict';
import { beforeFinancingFixesFile } from './helpers/financing-fixes-baseline.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCopyDataFileSync } from './helpers/sitewide-copy-data.mjs';
import { restoreMerged151Copy, SITEWIDE_COPY_DELTA } from './helpers/sitewide-copy-baseline.mjs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
import { beforeParadromicsRows } from './helpers/paradromics-funding-baseline.mjs';
const cases = JSON.parse(readFileSync(new URL('./fixtures/source-audit-records-20261116.json', import.meta.url)));
for (const item of cases) {
  test(item.id + ': ' + item.title, () => {
    for (const change of item.changes) {
      const parsed = parseCsv(beforeFinancingFixesFile(readCopyDataFileSync(new URL('../' + change.path, import.meta.url), 'utf8'), change.path));
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
    ['observedCapitalUsdM', current.summary.observedCapitalUsdM + 1],
    ['asOf', '1900-01-01'],
    ['unlistedNote', 'Unreviewed prose must survive reconstruction'],
  ]) {
    const mutated = structuredClone(current);
    mutated.summary[field] = value;
    const restored = restoreMerged151Copy(JSON.stringify(mutated), file);
    assert.equal(JSON.parse(restored).summary[field], value, `unlisted ${field} survives`);
    assert.throws(() => assert.equal(digest(restored), reviewed.beforeSha256),
      { code: 'ERR_ASSERTION' }, `original full-file golden rejects unlisted ${field}`);
  }
  const edited = structuredClone(current);
  edited.rounds.find(row => row.companySlug === 'coherence-neuro' && row.stage === 'Seed').note += ' Unreviewed prose.';
  assert.throws(() => restoreMerged151Copy(JSON.stringify(edited), file),
    { code: 'ERR_ASSERTION' }, 'reviewed prose only accepts the exact approved wording');
});
