import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const approved = JSON.parse(readFileSync(new URL('../fixtures/whole-brain-neuron-references.json', import.meta.url), 'utf8'));

/** Reconstruct older independent goldens by removing only the exact approved context field. */
export function beforeNeuronReferences(evidence) {
  const original = structuredClone(evidence);
  const neurons = Object.values(original).flatMap(e => e.plots ?? []).find(p => p.id === 'largest-connectome-neurons');
  assert.deepEqual(neurons.horizontalReferences, approved, 'Only the exact reviewed anatomical context is normalized');
  delete neurons.horizontalReferences;
  return original;
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreReviewedFile, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';
import { NEURON_SINGLE_TOGGLE_DELTA } from './neuron-reference-current.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const fileDelta = validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/neuron-reference-file-delta.json', import.meta.url), 'utf8')));
const toggleDelta = validateReviewedFilesFixture(JSON.parse(readFileSync(new URL('../fixtures/neuron-toggle-file-delta.json', import.meta.url), 'utf8')));
assert.equal(toggleDelta.baselineSha, '8393a96823aeb4dfb43894392c78940da812949c');
assert.deepEqual(toggleDelta.files.map(file => file.path), ['src/components/draft-chart-plot.tsx', 'src/components/draft-chart-plot.css', 'src/lib/field-velocity/navigation.ts', 'src/lib/chart-export.ts']);
assert.equal(fileDelta.baselineSha, 'df97d0d70736465657ac50bc9569bbc1b60e6095');
assert.deepEqual(fileDelta.files.map(file => file.path), ['src/components/draft-chart-plot.tsx', 'src/data/metric-chart-visibility.ts', 'src/data/methodology-sources.json']);

/** Exact additive code/catalog reversal for opt-in historical byte goldens only. */
export const restoreBeforeNeuronTogglesFile = (text, file) => restoreReviewedFile(restoreReviewedFile(text, NEURON_SINGLE_TOGGLE_DELTA, file), toggleDelta, file);
export const restoreBeforeNeuronLinesFile = (text, file) => restoreReviewedFile(restoreBeforeNeuronTogglesFile(text, file), fileDelta, file);

export function readBeforeNeuronLinesFileSync(file, options) {
  const resolved = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const relative = path.relative(root, resolved).split(path.sep).join('/');
  const bytes = Buffer.from(restoreBeforeNeuronLinesFile(readFileSync(file, 'utf8'), relative));
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}
