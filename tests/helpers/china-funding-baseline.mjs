import assert from 'node:assert/strict';
import { beforeMergeParadromicsFile } from './financing-merge-baseline.mjs';
import { beforeFinancingFixesFile } from './financing-fixes-baseline.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../../scripts/lib/funding-index.mjs';
import { restoreReviewedFile, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const CHINA_FUNDING_BASELINE_SHA = '023598e99d14b799b536df680e07f9d30e83b649';
export const CHINA_FUNDING_DELTA = validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/china-funding-20261124.json', import.meta.url), 'utf8')));
assert.equal(CHINA_FUNDING_DELTA.baselineSha, CHINA_FUNDING_BASELINE_SHA);

export const CHINA_FUNDING_REVIEWABLE_PATHS = [
  'data/funding-index/companies.csv',
  'data/funding-index/rounds.csv',
  'data/funding-index/milestones.csv',
  'data/funding-index/foundings.csv',
  'data/funding-index/fx-conversions.json',
  'data/market-memo-q1-2026/milestones.csv',
  'src/data/funding-index.json',
  'src/data/milestones.json',
  'src/data/methodology-sources.json',
];
for (const file of CHINA_FUNDING_DELTA.files) assert.ok(CHINA_FUNDING_REVIEWABLE_PATHS.includes(file.path), 'Out-of-scope reviewed file: ' + file.path);

// Historical tests opt in explicitly. This reader never writes data and is not
// imported by application code or current-data/source-parity regressions.
export function createHistoricalFileReader(fixture, directory, beforeReviewed = text => text) {
  validateReviewedFilesFixture(fixture);
  const base = path.resolve(directory);
  return (file, options) => {
    const resolved = path.resolve(file instanceof URL ? fileURLToPath(file) : file);
    const relative = path.relative(base, resolved).split(path.sep).join('/');
    const inside = relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative);
    const rawBytes = readFileSync(file);
    const bytes = rawBytes;
    const reviewed = inside && fixture.files.some(entry => entry.path === relative);
    const projected = inside ? beforeReviewed(bytes.toString('utf8'), relative) : bytes.toString('utf8');
    const result = Buffer.from(reviewed ? restoreReviewedFile(projected, fixture, relative) : projected);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? result.toString(encoding) : result;
  };
}

const readChinaHistoricalFileSync = createHistoricalFileReader(CHINA_FUNDING_DELTA, root, (text, file) => beforeMergeParadromicsFile(beforeFinancingFixesFile(text, file), file));
export const readHistoricalFileSync = readChinaHistoricalFileSync;
export const readHistoricalFile = async (file, options) => readHistoricalFileSync(file, options);

// The original loader's exact files and parsing, but with only reviewed later
// changes reversed. Synthetic/current-data tests continue to use the real loader.
export async function loadHistoricalFundingSources(directory = path.join(root, 'data/funding-index')) {
  const read = file => readHistoricalFileSync(path.join(directory, file), 'utf8');
  return {
    companies: parseCsv(read('companies.csv')),
    rounds: parseCsv(read('rounds.csv')),
    milestones: parseCsv(read('milestones.csv')),
    foundings: parseCsv(read('foundings.csv')),
    fxConversions: JSON.parse(read('fx-conversions.json')),
    portfolioDisclosures: JSON.parse(read('portfolio-disclosures.json')),
    investorGroups: JSON.parse(read('investor-groups.json')),
    investorEvidence: JSON.parse(read('investor-evidence.json')),
  };
}
