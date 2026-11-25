import assert from 'node:assert/strict';
import { sha256, validateReviewedFilesFixture } from '../../scripts/qa/build-reviewed-delta.mjs';
import { parseCsv } from '../../scripts/lib/funding-index.mjs';
import { currentNeuronFileHash, withoutCurrentNeuronStudies } from './neuron-reference-current.mjs';

// Raw-only contract. No historical reader imports, including transitively.
// Checkpoints and the independent parent projection are pinned separately from
// the generated allowances: a newly generated allowance cannot approve data.
export const CHECKPOINTS = Object.freeze({
  financeParentSha: 'ba3a4dfa5769f7837a03bbf506cb6f11b1200def',
  financeDataCheckpointSha: '43ffb9cdd85cf329a93b0391efeaf586ea1775c6',
  copyParentSha: 'df97d0d70736465657ac50bc9569bbc1b60e6095',
  financingBaselineSha: 'b3b901831da6ed7e50cd0dee15d636e4cdbbe4fc',
  copyBaselineSha: '9c1ddcca0bb49daf1c825d9b3b6e318fd870ac3b',
  candidateSha: '7144407300995d61cf7c971c9d8405c6efab16aa',
});
export const FINANCE_PATHS = Object.freeze([
  'data/funding-index/rounds.csv', 'data/market-memo-q1-2026/milestones.csv',
  'data/funding-index/fx-conversions.json', 'data/funding-index/reported-totals.json',
  'data/funding-index/investor-evidence.json', 'src/data/funding-index.json',
  'src/data/milestones.json', 'src/data/methodology-sources.json',
]);
export const BRIDGE_PATHS = Object.freeze([
  'data/funding-index/rounds.csv', 'data/market-memo-q1-2026/milestones.csv',
  'src/app/funding/page.tsx', 'src/app/milestones/page.tsx',
  'src/components/funding-index-dashboard.tsx', 'src/components/funding-source-context.tsx',
  'src/components/milestone-source-context.tsx', 'src/components/milestone-timeline.tsx',
  'src/data/funding-index.json', 'src/data/milestones.json',
]);
const fixture = name => 'tests/fixtures/' + name + '-20261125.json';
const ARTIFACTS = [
  'financing-copy-composite', 'merge-financing-over-copy', 'sitewide-copy-delta',
  'financing-fixes', 'financing-fixes-merged-baseline', 'financing-fixes-reviewed-revision',
  'financing-fixes-20261125-assertions', 'financing-copy-current-assertions',
  'financing-copy-parent-nonprose', 'financing-copy-immutable-manifest',
].map(name => name === 'financing-fixes-20261125-assertions' ? 'tests/fixtures/' + name + '.json' : fixture(name));
const PROSE_PATHS = Object.freeze({
  'data/funding-index/rounds.csv': [['*', 'note']],
  'data/market-memo-q1-2026/milestones.csv': [['*', 'note']],
  'data/funding-index/foundings.csv': [['*', 'note']],
  'data/funding-index/milestones.csv': [['*', 'note']],
  'src/data/funding-index.json': [['rounds', '*', 'note'], ['milestones', '*', 'note'], ['companies', '*', 'founding', 'note']],
  'src/data/milestones.json': [['*', 'note']],
});
const MARKER = '<reviewed-row-prose>';
const exact = (value, keys) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Expected a contract object');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Exact contract fields/inventory');
};
const inventory = (actual, expected) => assert.deepEqual([...actual].sort(), [...expected].sort(), 'Exact reviewed inventory');
const digest = value => assert.match(value, /^[a-f0-9]{64}$/);

export function projectNonprose(text, file) {
  // Only these ten explicitly reviewed canonical/generated schemas participate.
  assert.ok([...FINANCE_PATHS, 'data/funding-index/foundings.csv', 'data/funding-index/milestones.csv'].includes(file));
  const parsed = file.endsWith('.csv') ? parseCsv(text.toString()) : JSON.parse(text);
  const value = file === 'src/data/methodology-sources.json' ? withoutCurrentNeuronStudies(parsed) : parsed;
  for (const route of PROSE_PATHS[file] ?? []) {
    const visit = (parent, offset) => {
      if (parent === null || typeof parent !== 'object') return;
      const key = route[offset];
      if (key === '*') {
        assert.ok(Array.isArray(parent), 'Expected the explicitly reviewed row array');
        for (const row of parent) visit(row, offset + 1);
      } else if (Object.hasOwn(parent, key)) {
        if (offset === route.length - 1) {
          if (typeof parent[key] === 'string') parent[key] = MARKER;
        } else visit(parent[key], offset + 1);
      }
    };
    visit(value, 0);
  }
  return JSON.stringify(value);
}

export function validateCurrentContract(lock, read) {
  exact(lock, ['version', ...Object.keys(CHECKPOINTS), 'files', 'artifacts']);
  assert.equal(lock.version, 1);
  for (const [key, value] of Object.entries(CHECKPOINTS)) assert.equal(lock[key], value, key + ': pinned checkpoint');
  inventory(Object.keys(lock.artifacts), ARTIFACTS);
  for (const [file, hash] of Object.entries(lock.artifacts)) {
    digest(hash); assert.equal(sha256(read(file)), hash, file + ': artifact binding');
  }
  const manifestText = read(fixture('financing-copy-immutable-manifest'));
  assert.equal(sha256(manifestText), '7e1480c9067935b280858aa8a8b77e2e3373e7291cf90479b8aaeb6f5390f57b', 'Exact independent immutable inventory, never a caller subset');
  const manifest = JSON.parse(manifestText);
  exact(manifest, ['version', 'financeBaselineSha', 'financeParentSha', 'copyParentSha', 'files']);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.financeBaselineSha, CHECKPOINTS.financingBaselineSha);
  assert.equal(manifest.financeParentSha, CHECKPOINTS.financeParentSha);
  assert.equal(manifest.copyParentSha, CHECKPOINTS.copyParentSha);
  for (const [file, hash] of Object.entries(manifest.files)) assert.equal(sha256(read(file)), hash, file + ': immutable original');
  const load = name => JSON.parse(read(fixture(name)));
  const copy = validateReviewedFilesFixture(load('sitewide-copy-delta'));
  assert.equal(copy.baselineSha, CHECKPOINTS.copyBaselineSha);
  const baseline = load('financing-fixes-merged-baseline');
  assert.equal(baseline.sha, CHECKPOINTS.financingBaselineSha);
  inventory(Object.keys(baseline.files), FINANCE_PATHS);
  const union = [...new Set([...FINANCE_PATHS, ...copy.files.map(f => f.path)])];
  assert.equal(union.length, 53); assert.equal(copy.files.length, 49);
  inventory(Object.keys(lock.files), union);
  for (const [file, hash] of Object.entries(lock.files)) {
    digest(hash); assert.equal(sha256(read(file)), currentNeuronFileHash(file, hash), file + ': raw frozen M bytes plus exact approved neuron feature');
  }
  const composite = validateReviewedFilesFixture(load('financing-copy-composite'));
  const bridge = validateReviewedFilesFixture(load('merge-financing-over-copy'));
  for (const [edge, sha, paths, before] of [
    [composite, CHECKPOINTS.financingBaselineSha, FINANCE_PATHS, baseline.files],
    [bridge, CHECKPOINTS.copyParentSha, BRIDGE_PATHS, Object.fromEntries(copy.files.map(f => [f.path, f.afterSha256]))],
  ]) {
    assert.equal(edge.baselineSha, sha);
    inventory(edge.files.map(f => f.path), paths);
    inventory(edge.files.map(f => f.path), paths.filter(file => before[file] !== lock.files[file]));
    for (const entry of edge.files) {
      assert.equal(entry.beforeSha256, before[entry.path], entry.path + ': exact before endpoint');
      assert.equal(entry.afterSha256, lock.files[entry.path], entry.path + ': exact M endpoint');
      if (entry.encoding === 'json') for (const change of entry.delta.changes) {
        assert.ok(change.path.length || change.edits, 'No JSON root-value replacement');
      }
    }
  }
  for (const file of copy.files) if (!BRIDGE_PATHS.includes(file.path)) assert.equal(lock.files[file.path], file.afterSha256, file.path + ': unaffected B copy/source bytes');
  const snapshotText = read(fixture('financing-copy-parent-nonprose'));
  assert.equal(sha256(snapshotText), '490f555e59d1db7b7a38aabde9ed8762cb6a25ff15e78aabb4b41926479c17b7', 'Independent A nonprose snapshot');
  const snapshot = JSON.parse(snapshotText);
  exact(snapshot, ['version', 'financeParentSha', 'financeDataCheckpointSha', 'marker', 'prosePaths', 'files']);
  assert.equal(snapshot.version, 1); assert.equal(snapshot.financeParentSha, CHECKPOINTS.financeParentSha);
  assert.equal(snapshot.financeDataCheckpointSha, CHECKPOINTS.financeDataCheckpointSha);
  assert.equal(snapshot.marker, MARKER); assert.deepEqual(snapshot.prosePaths, PROSE_PATHS);
  inventory(Object.keys(snapshot.files), [...FINANCE_PATHS, 'data/funding-index/foundings.csv', 'data/funding-index/milestones.csv']);
  const oldLock = load('financing-fixes-reviewed-revision');
  assert.equal(oldLock.candidateSha, CHECKPOINTS.financeDataCheckpointSha);
  for (const [file, record] of Object.entries(snapshot.files)) {
    exact(record, ['sourceSha256', 'projectionSha256']);
    assert.equal(record.sourceSha256, oldLock.files[file] ?? copy.files.find(f => f.path === file).beforeSha256, file + ': A source hash');
    assert.equal(sha256(projectNonprose(read(file), file)), record.projectionSha256, file + ': raw current economics/source identity/order equals A');
  }
  const original = JSON.parse(read('tests/fixtures/financing-fixes-20261125-assertions.json'));
  const current = load('financing-copy-current-assertions');
  exact(current, ['baselineSha', 'files']); assert.equal(current.baselineSha, CHECKPOINTS.financingBaselineSha);
  inventory(current.files.map(f => f.path), original.files.map(f => f.path));
  const nonnote = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'note'));
  for (const file of current.files) {
    exact(file, ['path', 'recordCount', 'changes']);
    const old = original.files.find(f => f.path === file.path);
    assert.equal(file.recordCount, old.recordCount);
    assert.deepEqual(file.changes.map(c => c.id), old.changes.map(c => c.id), 'Original 68/53 correction identities and order');
    assert.equal(file.changes.length, file.path.includes('funding-index') ? 68 : 53);
    const rows = parseCsv(read(file.path).toString()); assert.equal(rows.length, file.recordCount);
    const keys = file.path.includes('funding-index') ? ['company_slug', 'announced_on', 'stage', 'source_url'] : ['company', 'date', 'activity', 'source_url'];
    for (const [i, change] of file.changes.entries()) {
      exact(change, ['id', 'before', 'after']);
      assert.deepEqual(change.before, old.changes[i].before, 'Immutable F before record: ' + change.id);
      assert.deepEqual(nonnote(change.after), nonnote(old.changes[i].after), 'Immutable A non-note after fields: ' + change.id);
      const found = rows.filter(row => keys.every(key => row[key] === change.after[key]));
      assert.equal(found.length, 1, change.id + ': stable identity');
      assert.deepEqual(nonnote(found[0]), nonnote(change.after));
      assert.equal(found[0].note, change.after.note, change.id + ': exact final approved note');
    }
  }
  return lock;
}
