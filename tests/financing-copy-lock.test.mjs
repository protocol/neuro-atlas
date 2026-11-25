import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256 } from '../scripts/qa/build-reviewed-delta.mjs';
const contract = await import('./helpers/financing-copy-contract.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root));
const lock = JSON.parse(read('tests/fixtures/financing-copy-current-revision-20261125.json'));

test('frozen M current contract has exact schemas, original inventories, edge bindings and independent A projections', () => {
  assert.equal(typeof contract.validateCurrentContract, 'function', 'A raw-only integrated lock validator is required');
  contract.validateCurrentContract(lock, read);
});

test('current lock rejects wrong checkpoints, missing/extra paths, endpoint and artifact binding attacks', () => {
  assert.equal(typeof contract.validateCurrentContract, 'function');
  const attacks = [
    ...['financeParentSha', 'financeDataCheckpointSha', 'copyParentSha', 'financingBaselineSha', 'copyBaselineSha', 'candidateSha'].map(key => value => { value[key] = 'a'.repeat(40); }),
    value => { value.version = 2; },
    value => { value.extra = true; },
    value => { delete value.files['src/data/milestones.json']; },
    value => { value.files['src/unreviewed.ts'] = 'a'.repeat(64); },
    value => { value.files['src/data/funding-index.json'] = 'a'.repeat(64); },
    value => { delete value.artifacts['tests/fixtures/sitewide-copy-delta-20261125.json']; },
    value => { value.artifacts['tests/fixtures/unreviewed.json'] = 'a'.repeat(64); },
    value => { value.artifacts['tests/fixtures/financing-copy-composite-20261125.json'] = 'a'.repeat(64); },
  ];
  for (const mutate of attacks) {
    const bad = structuredClone(lock); mutate(bad);
    assert.throws(() => contract.validateCurrentContract(bad, read), assert.AssertionError, mutate.toString());
  }
  for (const name of ['financing-copy-composite-20261125.json', 'merge-financing-over-copy-20261125.json']) {
    const file = 'tests/fixtures/' + name;
    for (const mutate of [
      value => { value.baselineSha = 'a'.repeat(40); },
      value => { value.files = []; },
      value => { value.files.pop(); },
      value => { value.files.push(structuredClone(value.files[0])); },
      value => { value.files[0].path = '../bad.json'; },
      value => { value.files[0].beforeSha256 = 'a'.repeat(64); },
      value => { value.files[0].afterSha256 = 'a'.repeat(64); },
      value => { value.files[0].path = 'src/lib/unreviewed.ts'; },
      value => { const entry = value.files.find(e => e.encoding === 'json'); entry.delta.changes = [{ path: [], before: { exists: true, value: {} }, after: { exists: true, value: { unreviewed: true } } }]; },
    ]) {
      const bad = JSON.parse(read(file)); mutate(bad); const bytes = Buffer.from(JSON.stringify(bad));
      const forged = structuredClone(lock); forged.artifacts[file] = sha256(bytes);
      // Even coordinated artifact digest edits do not widen endpoints/inventory.
      assert.throws(() => contract.validateCurrentContract(forged, p => p === file ? bytes : read(p)), assert.AssertionError, name + ': ' + mutate.toString());
    }
    const other = 'tests/fixtures/' + (name.startsWith('financing-copy') ? 'merge-financing-over-copy-20261125.json' : 'financing-copy-composite-20261125.json');
    const bytes = read(other), forged = structuredClone(lock); forged.artifacts[file] = sha256(bytes);
    assert.throws(() => contract.validateCurrentContract(forged, p => p === file ? bytes : read(p)), assert.AssertionError, 'swapped edge');
    assert.throws(() => contract.validateCurrentContract(lock, p => p === file ? Buffer.from('{}') : read(p)), assert.AssertionError, 'artifact edit without lock');
  }
});

test('coordinated allowance regeneration cannot authorize economics or widen the independently frozen prose schema', () => {
  assert.equal(typeof contract.validateCurrentContract, 'function');
  for (const name of ['financing-copy-parent-nonprose-20261125.json', 'financing-copy-immutable-manifest-20261125.json', 'financing-copy-current-assertions-20261125.json']) {
    const file = 'tests/fixtures/' + name, value = JSON.parse(read(file));
    if (name.includes('parent-nonprose')) value.prosePaths['src/data/funding-index.json'].push(['summary', '*']);
    else if (name.includes('immutable-manifest')) delete value.files['tests/fixtures/bci-sensory-default-svg.json'];
    else value.files[0].changes[0].after.amount_usd_m = 'UNREVIEWED';
    const bytes = Buffer.from(JSON.stringify(value)), forged = structuredClone(lock); forged.artifacts[file] = sha256(bytes);
    assert.throws(() => contract.validateCurrentContract(forged, p => p === file ? bytes : read(p)), assert.AssertionError, name);
  }
  const file = 'src/data/funding-index.json';
  const current = JSON.parse(read(file)); current.rounds[0].amountUsdM += 1;
  const bytes = Buffer.from(JSON.stringify(current)), forged = structuredClone(lock), replacements = new Map([[file, bytes]]);
  forged.files[file] = sha256(bytes);
  for (const name of ['financing-copy-composite-20261125.json', 'merge-financing-over-copy-20261125.json']) {
    const p = 'tests/fixtures/' + name, value = JSON.parse(read(p));
    value.files.find(entry => entry.path === file).afterSha256 = sha256(bytes);
    const artifact = Buffer.from(JSON.stringify(value)); replacements.set(p, artifact); forged.artifacts[p] = sha256(artifact);
  }
  assert.throws(() => contract.validateCurrentContract(forged, p => replacements.get(p) ?? read(p)), /raw current economics\/source identity\/order equals A/, 'independent parent check, not regenerated edge/hash permission');
});

test('all 53 raw byte locks reject mutations, including scientific source formatters and geometry', () => {
  assert.equal(typeof contract.validateCurrentContract, 'function');
  for (const file of Object.keys(lock.files)) {
    const changed = Buffer.concat([read(file), Buffer.from('\nUNREVIEWED')]);
    assert.throws(() => contract.validateCurrentContract(lock, p => p === file ? changed : read(p)), assert.AssertionError, file + ': raw source/generated lock');
  }
});

test('independently pinned nonprose projection preserves types, presence, all unlisted keys and order', () => {
  assert.equal(typeof contract.projectNonprose, 'function');
  const file = 'src/data/funding-index.json', raw = JSON.parse(read(file));
  const project = value => contract.projectNonprose(JSON.stringify(value), file);
  const original = project(raw);
  const prose = structuredClone(raw); prose.rounds[0].note += ' edited';
  assert.equal(project(prose), original, 'only exact approved string note location is masked');
  for (const mutate of [
    value => { value.rounds[0].amountUsdM += 1; },
    value => { value.rounds[0].sourceUrl += '?unreviewed'; },
    value => { value.rounds[0].datePrecision = 'year'; },
    value => { delete value.rounds[0].note; },
    value => { value.rounds[0].note = 123; },
    value => { value.rounds[0].unlisted = { note: 'must survive' }; },
    value => { value.methodology.note = 'must survive'; },
    value => { value.summary.unlisted = true; },
    value => { value.rounds.reverse(); },
    value => { value.rounds.pop(); },
  ]) {
    const bad = structuredClone(raw); mutate(bad);
    assert.notEqual(project(bad), original, mutate.toString());
  }
  assert.deepEqual(raw, JSON.parse(read(file)), 'projection does not mutate raw input');
  const csv = 'data/funding-index/rounds.csv';
  const canonical = read(csv).toString();
  assert.notEqual(contract.projectNonprose(canonical.replace('amount_usd_m', 'unlisted_amount'), csv), contract.projectNonprose(canonical, csv), 'CSV column identity is not prose');
});
