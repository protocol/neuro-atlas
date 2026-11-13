import test from 'node:test';
import assert from 'node:assert/strict';
import { brainBenchmarkContext, brainImageVoxels, BRAIN_IMAGE_MODEL } from '../src/lib/connectomics-brain-benchmarks.ts';

test('whole-brain benchmarks use source-qualified volumes and demonstrated 4×4×40 nm EM sampling', () => {
  const context = brainBenchmarkContext('public-data-size');
  assert.deepEqual(BRAIN_IMAGE_MODEL.voxelDimensionsNm, [4, 4, 40]);
  assert.equal(BRAIN_IMAGE_MODEL.bytesPerVoxel, 1);
  assert.deepEqual(context.references.map(ref => [ref.id, ref.volumeMm3, ref.value]), [
    ['mouse', 450, 703.125], ['macaque', 78_550, 122_734.375], ['human', 1_200_000, 1_875_000],
  ]);
  for (const ref of context.references) {
    assert.equal(brainImageVoxels(ref.volumeMm3), ref.volumeMm3 * 1e18 / (4 * 4 * 40));
    assert.equal(ref.value, ref.volumeMm3 * 1e18 / (4 * 4 * 40) / 1e15);
    assert.match(ref.label, /PB/);
  }
  assert.equal(context.toggleLabel, 'Whole-brain scale');
  assert.deepEqual(context.references.map(ref => ref.label), ['Mouse ≈700 PB', 'Macaque ≈120K PB', 'Human ≈1.9M PB']);
  assert.match(context.scopeLabel, /^Model:.*8-bit raw/);
  assert.match(context.disclosure, /image-equivalent/i);
  assert.match(context.disclosure, /compressed/i);
  assert.match(context.disclosure, /Rhesus macaque/);
  assert.match(context.disclosure, /10 postmortem.*78.55/);
  assert.match(context.disclosure, /extraction.*fixation/);
  assert.deepEqual(context.sources.map(source => source.url), [
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC4927572/',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC11955263/',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC11981939/',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC4512905/',
  ]);
  assert.match(context.sources[3].title, /§4.1/);
});

test('human acquisition budgets use the same whole-brain voxel denominator and displayed $/10M units', () => {
  const context = brainBenchmarkContext('acquisition-economics');
  assert.equal(context.toggleLabel, 'Human-brain cost targets');
  assert.deepEqual(context.references.map(ref => ref.budget), [1e9, 1e8, 1e7, 1e6, 1e5]);
  for (const ref of context.references) {
    assert.equal(ref.value, ref.budget / (1_200_000 * 1e18 / (4 * 4 * 40) / 10_000_000));
    assert.match(ref.label, /^\$/);
  }
  assert.match(context.disclosure, /image-acquisition-only/i);
  assert.match(context.scopeLabel, /Human.*cost scenario/);
  assert.match(context.disclosure, /reconstruction/);
  assert.equal(context.sources.length, 2);
  assert.equal(brainBenchmarkContext('tissue-cm3'), undefined);
  assert.equal(brainBenchmarkContext('largest-connectome-neurons'), undefined);
});
