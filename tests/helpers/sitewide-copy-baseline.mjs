import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restoreReviewedFile, sha256, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';
const read = name => readFileSync(new URL('../fixtures/' + name, import.meta.url), 'utf8');
const original = read('sitewide-copy-delta-20261125.json');
assert.equal(sha256(original), '709ef9db791180d98062527f402858f9f51a38eafb061b797ad2620ebb5d0024', 'Immutable original copy fixture');
export const SITEWIDE_COPY_DELTA = validateReviewedFilesFixture(JSON.parse(original));
assert.equal(SITEWIDE_COPY_DELTA.baselineSha, '9c1ddcca0bb49daf1c825d9b3b6e318fd870ac3b');
export const COPY_BRIDGE_PATHS = Object.freeze([
  'data/funding-index/rounds.csv', 'data/market-memo-q1-2026/milestones.csv',
  'src/app/funding/page.tsx', 'src/app/milestones/page.tsx',
  'src/components/funding-index-dashboard.tsx', 'src/components/funding-source-context.tsx',
  'src/components/milestone-source-context.tsx', 'src/components/milestone-timeline.tsx',
  'src/data/funding-index.json', 'src/data/milestones.json',
]);
const lock = JSON.parse(read('financing-copy-current-revision-20261125.json'));
export function validateCopyBridge(fixture) {
  validateReviewedFilesFixture(fixture);
  assert.equal(fixture.baselineSha, 'df97d0d70736465657ac50bc9569bbc1b60e6095');
  assert.deepEqual(fixture.files.map(f => f.path).sort(), [...COPY_BRIDGE_PATHS].sort());
  for (const file of fixture.files) {
    assert.equal(file.beforeSha256, SITEWIDE_COPY_DELTA.files.find(f => f.path === file.path).afterSha256, file.path + ': B endpoint');
    assert.equal(file.afterSha256, lock.files[file.path], file.path + ': M endpoint');
    if (file.encoding === 'json') for (const change of file.delta.changes) {
      assert.ok(change.path.length > 0 || change.edits, 'No root-value replacement');
    }
  }
  return fixture;
}
const bridgeText = read('merge-financing-over-copy-20261125.json');
assert.equal(sha256(bridgeText), lock.artifacts['tests/fixtures/merge-financing-over-copy-20261125.json']);
export const FINANCING_OVER_COPY = validateCopyBridge(JSON.parse(bridgeText));
// Historical-only entrypoints, not a generic normalization stack. Original
// copy expects B, while archived finance expects F through a different edge.
export const restoreCopyMainFile = (text, file) => restoreReviewedFile(text, FINANCING_OVER_COPY, file);
export const restoreMerged151Copy = (text, file) => restoreReviewedFile(restoreCopyMainFile(text, file), SITEWIDE_COPY_DELTA, file);
