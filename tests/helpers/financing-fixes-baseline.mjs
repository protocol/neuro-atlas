import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../scripts/qa/build-reviewed-delta.mjs';
import { createFinancingFixesReader, validateFinancingFixesFixture, FINANCING_FIXES_REVIEWABLE_PATHS } from './financing-fixes-reader.mjs';
import { restoreMerged151Copy } from './sitewide-copy-baseline.mjs';

// Preserve the original A allowance as audit evidence. Active archived reads
// traverse the explicitly named integrated M→F composite instead.
export const FINANCING_FIXES_DELTA = validateFinancingFixesFixture(JSON.parse(readFileSync(new URL('../fixtures/financing-fixes-20261125.json', import.meta.url), 'utf8')));
const lock = JSON.parse(readFileSync(new URL('../fixtures/financing-copy-current-revision-20261125.json', import.meta.url), 'utf8'));
const text = readFileSync(new URL('../fixtures/financing-copy-composite-20261125.json', import.meta.url), 'utf8');
assert.equal(sha256(text), lock.artifacts['tests/fixtures/financing-copy-composite-20261125.json']);
export const FINANCING_COPY_COMPOSITE = validateFinancingFixesFixture(JSON.parse(text));
assert.deepEqual(FINANCING_COPY_COMPOSITE.files.map(f => f.path).sort(), [...FINANCING_FIXES_REVIEWABLE_PATHS].sort());
for (const file of FINANCING_COPY_COMPOSITE.files) assert.equal(file.afterSha256, lock.files[file.path], file.path + ': M endpoint');
export const COPY_ONLY_LEGACY_CSV_PATHS = Object.freeze(['data/funding-index/foundings.csv', 'data/funding-index/milestones.csv']);
const fallback = (value, file) => COPY_ONLY_LEGACY_CSV_PATHS.includes(file) ? restoreMerged151Copy(value, file) : value;
const reader = createFinancingFixesReader(FINANCING_COPY_COMPOSITE, fileURLToPath(new URL('../../', import.meta.url)), fallback);
export const beforeFinancingFixesFile = reader.beforeFile;
export const readFinancingFixesBaselineFileSync = reader.readFileSync;
export const readFinancingFixesBaselineFile = reader.readFile;
