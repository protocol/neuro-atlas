import { readFileSync } from 'node:fs';
import { restoreReviewedFile, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';

// Composition only: both original reviewed fixtures and every older golden stay
// frozen. Exact parent-to-merge deltas separate concurrent approved changes;
// unmatched historical edits survive projection and reach the original goldens.
export const PARADROMICS_OVER_CHINA = validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/merge-paradromics-over-china-20261125.json', import.meta.url), 'utf8')));
export const CHINA_OVER_PARADROMICS = validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/merge-china-over-paradromics-20261125.json', import.meta.url), 'utf8')));
export const beforeMergeParadromicsFile = (text, file) => restoreReviewedFile(text, PARADROMICS_OVER_CHINA, file);
export const beforeMergeChinaFile = (text, file) => restoreReviewedFile(text, CHINA_OVER_PARADROMICS, file);
export const beforeMergeChinaFunding = funding => JSON.parse(beforeMergeChinaFile(JSON.stringify(funding), 'src/data/funding-index.json'));
export const beforeMergeChinaCatalog = catalog => JSON.parse(beforeMergeChinaFile(JSON.stringify(catalog), 'src/data/methodology-sources.json'));
