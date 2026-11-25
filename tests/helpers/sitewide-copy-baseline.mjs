import {readFileSync} from 'node:fs';
import {restoreBeforeNeuronLinesFile} from './neuron-reference-baseline.mjs';
import {restoreReviewedFile,validateReviewedFilesFixture} from '../../scripts/qa/build-reviewed-delta.mjs';
export const SITEWIDE_COPY_DELTA=validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/sitewide-copy-delta-20261125.json',import.meta.url),'utf8')));
// Historical-only, fail-closed reversal of explicitly reviewed editorial fields.
// Current-data, scientific invariance and actual application readers never use it.
export const restoreMerged151Copy=(text,path)=>restoreReviewedFile(restoreBeforeNeuronLinesFile(text,path),SITEWIDE_COPY_DELTA,path);
