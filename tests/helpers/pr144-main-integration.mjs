import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restoreReviewedFile, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';

// Generated ONLY from the fixed accepted PR/main/base objects by
// build-pr144-main-fixture.py. No candidate files or runtime Git reads.
export const PR144_MAIN_INTEGRATION = validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/pr144-main-copy-integration.json', import.meta.url), 'utf8')));
assert.equal(PR144_MAIN_INTEGRATION.baselineSha, 'df97d0d70736465657ac50bc9569bbc1b60e6095');
const credit = JSON.parse(readFileSync(new URL('../fixtures/pr144-source-credit.json', import.meta.url), 'utf8'));
assert.equal(credit.pr, '85ceb1a0d55e0d2a139b3d1105a577b2497b0f1c');
assert.equal(credit.main, PR144_MAIN_INTEGRATION.baselineSha);
export function restorePr144Integration(text, path) {
  if (path === 'src/data/methodology-sources.json') {
    const data = JSON.parse(text);
    for (const [category, entry] of credit.additions) {
      const matches = data[category].filter(row => row[0] === entry[0]);
      assert.deepEqual(matches, [entry], 'Only the exact PR-only PMC1564115 source credit is normalized');
      data[category].splice(data[category].findIndex(row => row[0] === entry[0]), 1);
    }
    // Retain formatting and every non-credit byte; don't reserialize the file.
    const block = '    ' + JSON.stringify(credit.additions[0][1], null, 2).replaceAll('\n', '\n    ') + ',\n';
    assert.equal(text.split(block).length, 2, 'Exact original credit bytes occur once');
    return text.replace(block, '');
  }
  return restoreReviewedFile(text, PR144_MAIN_INTEGRATION, path);
}
