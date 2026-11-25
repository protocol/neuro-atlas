import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256, restoreReviewedFile } from '../scripts/qa/build-reviewed-delta.mjs';
import { FINANCING_COPY_COMPOSITE, beforeFinancingFixesFile, readFinancingFixesBaselineFileSync } from './helpers/financing-fixes-baseline.mjs';
import { FINANCING_FIXES_BASELINE_SHA, FINANCING_FIXES_MERGED_BASELINE } from './helpers/financing-fixes-reader.mjs';
import { readHistoricalFileSync } from './helpers/china-funding-baseline.mjs';
import { PARADROMICS_OVER_CHINA } from './helpers/financing-merge-baseline.mjs';
import { CHINA_FUNDING_DELTA } from './helpers/china-funding-baseline.mjs';
import { beforeParadromicsFunding } from './helpers/paradromics-funding-baseline.mjs';

test('the reviewed financing delta restores the exact merged baseline and composes through both older histories', () => {
  assert.equal(FINANCING_COPY_COMPOSITE.baselineSha, FINANCING_FIXES_BASELINE_SHA);
  for (const [file, digest] of Object.entries(FINANCING_FIXES_MERGED_BASELINE.files)) {
    const url = new URL('../' + file, import.meta.url);
    assert.equal(sha256(readFinancingFixesBaselineFileSync(url)), digest, file + ': complete original merged bytes');
    const current = readFileSync(url, 'utf8');
    const merged = beforeFinancingFixesFile(current, file);
    const preParadromicsMerge = restoreReviewedFile(merged, PARADROMICS_OVER_CHINA, file);
    const preBoth = restoreReviewedFile(preParadromicsMerge, CHINA_FUNDING_DELTA, file);
    assert.equal(readHistoricalFileSync(url, 'utf8'), preBoth, file + ': new reversal → merge compatibility → China');
  }
  const url = new URL('../src/data/funding-index.json', import.meta.url);
  const merged = JSON.parse(readFinancingFixesBaselineFileSync(url, 'utf8'));
  const preBoth = JSON.parse(readHistoricalFileSync(url, 'utf8'));
  assert.deepEqual(beforeParadromicsFunding(merged), preBoth, 'new reversal → merge compatibility → Paradromics gives the identical frozen payload');
});

test('actual reviewed financing operations reject changed, missing, duplicate and extra-field values', () => {
  let reviewedOperations = 0;
  for (const entry of FINANCING_COPY_COMPOSITE.files) {
    const text = readFileSync(new URL('../' + entry.path, import.meta.url), 'utf8');
    const current = entry.encoding === 'json' ? JSON.parse(text) : text.split('\n');
    const encode = value => entry.encoding === 'json' ? JSON.stringify(value) : value.join('\n');
    const at = (value, keys) => keys.reduce((parent, key) => parent[key], value);
    const rejects = mutate => {
      const changed = structuredClone(current); mutate(changed);
      assert.throws(() => beforeFinancingFixesFile(encode(changed), entry.path), assert.AssertionError, entry.path);
      reviewedOperations++;
    };
    for (const change of entry.delta.changes) {
      if (change.edits) {
        for (const edit of change.edits) {
          if (!edit.after.length) {
            rejects(value => at(value, change.path).splice(edit.afterIndex, 0, structuredClone(edit.before[0])));
            continue;
          }
          rejects(value => at(value, change.path).splice(edit.afterIndex, 1));
          rejects(value => at(value, change.path).splice(edit.afterIndex, 0, structuredClone(edit.after[0])));
          for (let offset = 0; offset < edit.after.length; offset++) {
            const index = edit.afterIndex + offset, row = edit.after[offset];
            rejects(value => { at(value, change.path)[index] = 'UNREVIEWED'; });
            if (row && typeof row === 'object' && !Array.isArray(row)) {
              for (const field of Object.keys(row)) {
                rejects(value => { at(value, change.path)[index][field] = 'UNREVIEWED'; });
                rejects(value => { delete at(value, change.path)[index][field]; });
              }
              rejects(value => { at(value, change.path)[index].unreviewedExtraField = true; });
            }
          }
        }
      } else {
        assert.ok(change.path.length > 0, 'Whole-file/root exemptions are not allowed for JSON financing files');
        rejects(value => {
          const target = at(value, change.path.slice(0, -1)), key = change.path.at(-1);
          if (change.after.exists) delete target[key];
          else target[key] = 'UNREVIEWED';
        });
      }
    }
  }
  assert.ok(reviewedOperations > 0, 'The actual reviewed fixture must expose guarded operations');
});
