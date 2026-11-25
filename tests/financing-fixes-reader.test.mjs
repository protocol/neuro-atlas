import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReviewedFilesFixture, sha256 } from '../scripts/qa/build-reviewed-delta.mjs';
const adapter = await import('./helpers/financing-fixes-reader.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

// Pure synthetic edit of a real pinned baseline. This is not source approval or
// a fixture for the forthcoming financing changes.
test('financing layer restores only the exact reviewed delta and leaves every unreviewed value visible', async t => {
  assert.equal(typeof adapter.createFinancingFixesReader, 'function', 'The bounded financing-only reader must exist');
  const directory = await mkdtemp(join(tmpdir(), 'financing-fixes-reader-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = 'src/data/funding-index.json';
  const base = join(directory, 'base'), current = join(directory, 'current');
  await mkdir(join(base, 'src/data'), { recursive: true });
  await mkdir(join(current, 'src/data'), { recursive: true });
  // Opt in to an already reconstructed merged baseline; never treat live data
  // as the baseline from which future exemptions may be generated.
  const lock = JSON.parse(readFileSync(new URL('./fixtures/financing-fixes-merged-baseline-20261125.json', import.meta.url), 'utf8'));
  const { readFinancingFixesBaselineFileSync } = await import('./helpers/financing-fixes-baseline.mjs');
  const before = readFinancingFixesBaselineFileSync(new URL('../' + file, import.meta.url), 'utf8');
  assert.equal(sha256(before), lock.files[file]);
  const original = JSON.parse(before), after = structuredClone(original);
  after.rounds[1].note += ' SYNTHETIC REVIEWED DELTA';
  after.summary.indexedRounds += 1;
  const candidate = JSON.stringify(after);
  await writeFile(join(base, file), before); await writeFile(join(current, file), candidate);
  const fixture = await buildReviewedFilesFixture({ baseDir: base, candidateDir: current, baselineSha: lock.sha, files: [file] });
  const reader = adapter.createFinancingFixesReader(fixture, current);
  assert.equal(reader.readFileSync(join(current, file), 'utf8'), before);
  assert.equal(reader.readFileSync(new URL('file://' + join(current, file)), { encoding: 'utf8' }), before);
  assert.equal(reader.readFileSync(join(current, file)).toString(), before);
  assert.equal(readFileSync(join(current, file), 'utf8'), candidate, 'Reading history must not write current data');
  assert.equal(reader.readFileSync(join(base, file), 'utf8'), before, 'Outside paths are not matched by basename');
  await writeFile(join(current, 'untouched.json'), '{"unreviewed":true}');
  assert.equal(reader.readFileSync(join(current, 'untouched.json'), 'utf8'), '{"unreviewed":true}');
  assert.equal(reader.beforeFile('{"unreviewed":true}', 'unlisted.json'), '{"unreviewed":true}');
  const rejected = [
    value => { value.rounds[1].note += ' unreviewed'; },
    value => { value.rounds[1].extra = true; },
    value => { delete value.rounds[1].note; },
    value => { value.rounds.splice(1, 1); },
    value => { value.rounds.push(structuredClone(value.rounds[1])); },
    value => { [value.rounds[1], value.rounds[2]] = [value.rounds[2], value.rounds[1]]; },
    value => { value.summary.indexedRounds += 1; },
  ];
  for (const mutate of rejected) {
    const changed = structuredClone(after); mutate(changed);
    assert.throws(() => reader.beforeFile(JSON.stringify(changed), file), assert.AssertionError, mutate.toString());
  }
  // Unchanged rows are LCS anchors, not broad snapshot replacements. A mutation
  // there must survive the reversal and fail the original complete-file golden.
  const unlisted = structuredClone(after); unlisted.rounds[0].note += ' UNREVIEWED';
  const restored = reader.beforeFile(JSON.stringify(unlisted), file);
  assert.notEqual(sha256(restored), lock.files[file]);
  assert.equal(JSON.parse(restored).rounds[0].note, unlisted.rounds[0].note);
  const extra = structuredClone(after); extra.unreviewed = { mustSurvive: true };
  assert.deepEqual(JSON.parse(reader.beforeFile(JSON.stringify(extra), file)).unreviewed, extra.unreviewed);
  assert.deepEqual(after, JSON.parse(candidate), 'Projection must not mutate its input');
  for (const mutate of [
    f => { f.baselineSha = 'a'.repeat(40); },
    f => { f.files[0].beforeSha256 = 'a'.repeat(64); },
    f => { f.files[0].path = 'src/lib/funding-capital.mjs'; },
    f => { f.files[0].path = '../src/data/funding-index.json'; },
    f => { f.files.push(structuredClone(f.files[0])); },
    f => { f.extra = 'not reviewed'; },
    f => { f.files = []; },
    f => { f.files[0].delta = { version: 1, changes: [{ path: [], before: { exists: true, value: {} }, after: { exists: true, value: { unreviewedWholeFile: true } } }] }; },
  ]) {
    const invalid = structuredClone(fixture); mutate(invalid);
    assert.throws(() => adapter.createFinancingFixesReader(invalid, current), assert.AssertionError, mutate.toString());
  }
});
