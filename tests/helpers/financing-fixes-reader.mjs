import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreReviewedFile, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';

export const FINANCING_FIXES_BASELINE_SHA = 'b3b901831da6ed7e50cd0dee15d636e4cdbbe4fc';
export const FINANCING_FIXES_REVIEWABLE_PATHS = Object.freeze([
  'data/funding-index/rounds.csv',
  'data/market-memo-q1-2026/milestones.csv',
  'data/funding-index/fx-conversions.json',
  'data/funding-index/reported-totals.json',
  'data/funding-index/investor-evidence.json',
  'src/data/funding-index.json',
  'src/data/milestones.json',
  'src/data/methodology-sources.json',
]);
export const FINANCING_FIXES_MERGED_BASELINE = JSON.parse(readFileSync(new URL('../fixtures/financing-fixes-merged-baseline-20261125.json', import.meta.url), 'utf8'));
assert.equal(FINANCING_FIXES_MERGED_BASELINE.sha, FINANCING_FIXES_BASELINE_SHA);
assert.deepEqual(Object.keys(FINANCING_FIXES_MERGED_BASELINE.files).sort(), [...FINANCING_FIXES_REVIEWABLE_PATHS].sort());

export function validateFinancingFixesFixture(fixture) {
  validateReviewedFilesFixture(fixture);
  assert.equal(fixture.baselineSha, FINANCING_FIXES_BASELINE_SHA, 'Wrong financing-fixes baseline');
  assert.ok(fixture.files.length > 0, 'The reviewed financing delta must not be empty');
  for (const entry of fixture.files) {
    assert.ok(FINANCING_FIXES_REVIEWABLE_PATHS.includes(entry.path), 'Out-of-scope financing file: ' + entry.path);
    assert.equal(entry.beforeSha256, FINANCING_FIXES_MERGED_BASELINE.files[entry.path], entry.path + ': original complete baseline hash');
    if (entry.encoding === 'json') {
      for (const change of entry.delta.changes) {
        assert.ok(change.path.length > 0 || change.edits, 'Whole-file/root value exemptions are not allowed');
      }
    }
  }
  return fixture;
}

// Historical tests opt in. Never import this reader into runtime/current-data
// tests. Exact changed slices are checked by the existing reviewed-delta engine;
// every unlisted value survives to the original golden instead of being erased.
export function createFinancingFixesReader(fixture, directory) {
  validateFinancingFixesFixture(fixture);
  const base = path.resolve(directory);
  const beforeFile = (text, file) => restoreReviewedFile(text, fixture, file);
  const read = (file, options) => {
    const resolved = path.resolve(file instanceof URL ? fileURLToPath(file) : file);
    const relative = path.relative(base, resolved).split(path.sep).join('/');
    const inside = relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative);
    const bytes = readFileSync(file);
    const reviewed = inside && fixture.files.some(entry => entry.path === relative);
    const result = reviewed ? Buffer.from(beforeFile(bytes.toString('utf8'), relative)) : bytes;
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? result.toString(encoding) : result;
  };
  return { beforeFile, readFileSync: read, readFile: async (file, options) => read(file, options) };
}
