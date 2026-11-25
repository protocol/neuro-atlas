import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256, restoreReviewedFile } from '../scripts/qa/build-reviewed-delta.mjs';
import { applyReviewedDelta } from '../scripts/qa/reviewed-delta.mjs';
import { NEURON_CURRENT_DELTA, currentNeuronFileHash, withoutCurrentNeuronStudies } from './helpers/neuron-reference-current.mjs';
import { restoreBeforeNeuronTogglesFile } from './helpers/neuron-reference-baseline.mjs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const fixture = name => JSON.parse(read('tests/fixtures/' + name));

test('exact neuron delta edges reconstruct frozen main and PR154 source bytes while rejecting unlisted mutations', () => {
  for (const [name, hash] of [
    ['neuron-reference-current-main-file-delta.json', 'e3b0d161c729aded58358b93f90248a406ce20cc86d876071a791185d1a74cb6'],
    ['neuron-toggle-file-delta.json', 'dc47147e9d1a25ab35a27b5c229241b0c15240117f6e3f219d6f86c2aa1332fe'],
    ['neuron-financing-catalog-delta.json', '463f2c1650465559d8f85f34d294eebb27eedaabb966e0acd0726c96ace4fb6c'],
  ]) assert.equal(sha256(read('tests/fixtures/' + name)), hash, name + ': exact reviewed edge');
  for (const delta of [NEURON_CURRENT_DELTA, fixture('neuron-toggle-file-delta.json')]) for (const file of delta.files) {
    const current = read(file.path);
    assert.equal(sha256(current), file.afterSha256, file.path + ': exact candidate bytes');
    const original = restoreReviewedFile(current, delta, file.path);
    assert.equal(sha256(original), file.beforeSha256, file.path + ': independent exact baseline bytes');
    const value = file.encoding === 'json' ? JSON.parse(original) : original.split('\n');
    const forward = applyReviewedDelta(value, file.delta);
    const encoded = file.encoding === 'json' ? JSON.stringify(forward, null, file.afterFormat.space) + (file.afterFormat.finalNewline ? '\n' : '') : forward.join('\n');
    assert.equal(encoded, current);
    let altered;
    const mutated = file.encoding === 'json' ? JSON.stringify({ ...JSON.parse(current), UNREVIEWED: true }) : '// UNREVIEWED\n' + current;
    try { altered = restoreReviewedFile(mutated, delta, file.path); } catch { continue; }
    assert.notEqual(sha256(altered), file.beforeSha256, 'Unlisted changes are not normalized');
  }
  const catalog = 'src/data/methodology-sources.json';
  const main = restoreReviewedFile(read(catalog), NEURON_CURRENT_DELTA, catalog);
  const finance = fixture('neuron-financing-catalog-delta.json');
  assert.equal(sha256(main), finance.files[0].afterSha256, 'Owner-approved finance current-main endpoint');
  assert.equal(sha256(restoreReviewedFile(main, finance, catalog)), finance.files[0].beforeSha256, 'Immutable pre-finance copy endpoint');
  assert.equal(restoreBeforeNeuronTogglesFile('unrelated', 'src/data/draft-chart-evidence.json'), 'unrelated');
});

test('raw financing acceptance binds both immutable old hashes and exact new bytes; catalog projection removes only two approved studies', () => {
  for (const file of NEURON_CURRENT_DELTA.files) {
    assert.equal(currentNeuronFileHash(file.path, file.beforeSha256), file.afterSha256);
    assert.equal(currentNeuronFileHash(file.path, 'a'.repeat(64)), 'a'.repeat(64), 'A forged baseline hash cannot enter the allowance');
  }
  const file = 'src/data/methodology-sources.json';
  const raw = JSON.parse(read(file));
  const copy = structuredClone(raw);
  const main = JSON.parse(restoreReviewedFile(read(file), NEURON_CURRENT_DELTA, file));
  assert.deepEqual(withoutCurrentNeuronStudies(raw), main, 'Full owner-approved current-main source catalog remains');
  assert.deepEqual(raw, copy, 'Non-mutating projection');
  for (const mutate of [
    value => { value.studies[0][1] += ' UNREVIEWED'; },
    value => { value.studies.shift(); },
    value => { value.studies.push(value.studies[0]); },
    value => { value.studies.reverse(); },
  ]) { const value = structuredClone(raw); mutate(value); assert.throws(() => withoutCurrentNeuronStudies(value)); }
  const value = structuredClone(raw); value.disclosures[0][1] += ' UNREVIEWED';
  assert.notDeepEqual(withoutCurrentNeuronStudies(value), main, 'Unrelated source changes survive');
});
