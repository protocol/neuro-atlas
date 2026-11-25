import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';

// Raw current-contract acceptance, not a historical reader. Existing financing
// locks stay immutable; only these independently checked source deltas may extend them.
const deltaText = readFileSync(new URL('../fixtures/neuron-reference-current-main-file-delta.json', import.meta.url), 'utf8');
assert.equal(sha256(deltaText), 'e3b0d161c729aded58358b93f90248a406ce20cc86d876071a791185d1a74cb6', 'Exact approved neuron feature edge, not a regenerated allowance');
export const NEURON_CURRENT_DELTA = validateReviewedFilesFixture(JSON.parse(deltaText));
assert.equal(NEURON_CURRENT_DELTA.baselineSha, '866ce97f950042470bd42d6ce729efa3dcb2d3f6');
assert.deepEqual(NEURON_CURRENT_DELTA.files.map(f => f.path), [
  'src/components/draft-chart-plot.tsx', 'src/components/draft-chart-plot.css',
  'src/lib/field-velocity/navigation.ts', 'src/lib/chart-export.ts',
  'src/data/metric-chart-visibility.ts', 'src/data/methodology-sources.json',
]);
const singleToggleText = readFileSync(new URL('../fixtures/neuron-single-toggle-file-delta.json', import.meta.url), 'utf8');
assert.equal(sha256(singleToggleText), '001cbdc73e7c0413327f104ed30aa75862f4552a8f67acae8fe8cc7dd51375ee', 'Exact owner-requested single-switch correction; older feature edges remain frozen');
export const NEURON_SINGLE_TOGGLE_DELTA = validateReviewedFilesFixture(JSON.parse(singleToggleText));
assert.equal(NEURON_SINGLE_TOGGLE_DELTA.baselineSha, '102e4bdd324d2e9070f57a9c52e0faad94960559');
assert.deepEqual(NEURON_SINGLE_TOGGLE_DELTA.files.map(f => f.path), [
  'src/components/draft-chart-plot.tsx', 'src/components/draft-chart-plot.css',
  'src/lib/field-velocity/navigation.ts', 'src/lib/neuron-reference-url.ts',
]);
export function currentNeuronFileHash(file, originalHash) {
  const delta = NEURON_CURRENT_DELTA.files.find(entry => entry.path === file);
  if (delta?.beforeSha256 !== originalHash) return originalHash;
  const correction = NEURON_SINGLE_TOGGLE_DELTA.files.find(entry => entry.path === file);
  return correction?.beforeSha256 === delta.afterSha256 ? correction.afterSha256 : delta.afterSha256;
}
const addedStudies = [
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC1567708/', 'Herculano-Houzel et al. (2006) — rodent brain cellular scaling, mouse anatomical neuron estimate (Table 1)'],
  ['https://pmc.ncbi.nlm.nih.gov/articles/PMC1805542/', 'Herculano-Houzel et al. (2007) — primate brain cellular scaling, rhesus macaque anatomical neuron estimate (Table 1)'],
];
/** Accept these exact additive scientific definitions before comparing finance identity. */
export function withoutCurrentNeuronStudies(catalog) {
  const result = structuredClone(catalog);
  const matches = result.studies.filter(row => addedStudies.some(([url]) => row[0] === url));
  assert.deepEqual(matches, addedStudies, 'Exact two approved anatomical-study definitions, once each');
  assert.deepEqual(result.studies.slice(0, 2), addedStudies, 'Only the two prepended studies are projected');
  result.studies.splice(0, 2);
  return result;
}
