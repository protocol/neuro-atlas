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
