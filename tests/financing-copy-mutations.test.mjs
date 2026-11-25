import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyReviewedDelta } from '../scripts/qa/reviewed-delta.mjs';
import { restoreReviewedFile, sha256 } from '../scripts/qa/build-reviewed-delta.mjs';
import { FINANCING_COPY_COMPOSITE, beforeFinancingFixesFile } from './helpers/financing-fixes-baseline.mjs';
import { FINANCING_OVER_COPY, SITEWIDE_COPY_DELTA, restoreCopyMainFile, restoreMerged151Copy } from './helpers/sitewide-copy-baseline.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const at = (value, keys) => keys.reduce((parent, key) => parent[key], value);
const encode = (entry, value, format = entry.afterFormat) => entry.encoding === 'json'
  ? JSON.stringify(value, null, format.space) + (format.finalNewline ? '\n' : '') : value.join('\n');
const parse = (entry, text) => entry.encoding === 'json' ? JSON.parse(text) : text.split('\n');

for (const [name, edge] of [['composite M→F', FINANCING_COPY_COMPOSITE], ['bridge M→B', FINANCING_OVER_COPY]]) {
  test(name + ': complete inverse and deterministic forward bytes, never a root-value replacement', () => {
    for (const entry of edge.files) {
      const current = read(entry.path), original = restoreReviewedFile(current, edge, entry.path);
      assert.equal(sha256(original), entry.beforeSha256, entry.path + ': exact before bytes');
      assert.equal(sha256(current), entry.afterSha256, entry.path + ': exact frozen M bytes');
      const forward = encode(entry, applyReviewedDelta(parse(entry, original), entry.delta));
      assert.equal(forward, current, entry.path + ': exact deterministic forward bytes');
      if (entry.encoding === 'json') for (const change of entry.delta.changes) assert.ok(change.path.length || change.edits);
      assert.throws(() => restoreReviewedFile(original, edge, entry.path), assert.AssertionError, entry.path + ': second inverse rejects');
    }
  });

  test(name + ': every actual scalar/slice/row field rejects mutation, deletion, extra field and structural movement', t => {
    let controls = 0, operations = 0;
    const fields = new Set();
    for (const entry of edge.files) {
      const current = parse(entry, read(entry.path));
      const rejects = (mutate, label) => {
        const changed = structuredClone(current); mutate(changed);
        assert.throws(() => restoreReviewedFile(encode(entry, changed), edge, entry.path), assert.AssertionError, entry.path + ': ' + label);
        controls++;
      };
      for (const change of entry.delta.changes) {
        operations++;
        if (!change.edits) {
          const set = (value, remove) => {
            const parent = at(value, change.path.slice(0, -1)), key = change.path.at(-1);
            if (remove) delete parent[key]; else parent[key] = 'UNREVIEWED';
          };
          rejects(value => set(value, !change.after.exists), 'scalar value');
          if (change.after.exists) rejects(value => set(value, true), 'scalar deletion');
          continue;
        }
        for (const edit of change.edits) {
          if (!edit.after.length) {
            rejects(value => at(value, change.path).splice(edit.afterIndex, 0, structuredClone(edit.before[0])), 'deletion-side insertion');
            continue;
          }
          rejects(value => at(value, change.path).splice(edit.afterIndex, 1), 'row deletion');
          rejects(value => at(value, change.path).splice(edit.afterIndex, 0, structuredClone(edit.after[0])), 'row duplication');
          const array = at(current, change.path), first = edit.afterIndex;
          const other = array.findIndex((row, i) => i !== first && JSON.stringify(row) !== JSON.stringify(array[first]));
          if (other >= 0) rejects(value => { const rows = at(value, change.path); [rows[first], rows[other]] = [rows[other], rows[first]]; }, 'row reorder');
          for (const [offset, row] of edit.after.entries()) {
            const index = edit.afterIndex + offset;
            rejects(value => { at(value, change.path)[index] = 'UNREVIEWED'; }, 'whole guarded row');
            if (row && typeof row === 'object' && !Array.isArray(row)) {
              for (const field of Object.keys(row)) {
                fields.add(field);
                rejects(value => { at(value, change.path)[index][field] = 'UNREVIEWED'; }, 'row field ' + field);
                rejects(value => { delete at(value, change.path)[index][field]; }, 'delete row field ' + field);
              }
              rejects(value => { at(value, change.path)[index].unreviewedExtraField = true; }, 'extra row field');
            } else if (entry.path.endsWith('.csv') && typeof row === 'string' && row.length) {
              // Preserve every other literal cell/quote byte while changing each
              // guarded CSV cell individually (including FX, source and dates).
              let start = 0, quoted = false; const cells = [];
              for (let i = 0; i <= row.length; i++) {
                if (row[i] === '"') { if (quoted && row[i + 1] === '"') i++; else quoted = !quoted; }
                if (i === row.length || (!quoted && row[i] === ',')) { cells.push([start, i]); start = i + 1; }
              }
              for (const [start, end] of cells) rejects(value => { at(value, change.path)[index] = row.slice(0, start) + 'UNREVIEWED' + row.slice(end); }, 'each literal CSV cell');
              rejects(value => { at(value, change.path)[index] += ',UNREVIEWED'; }, 'extra CSV field');
            }
          }
        }
      }
    }
    assert.ok(controls > 0 && operations > 0);
    t.diagnostic(JSON.stringify({ edge: name, operations, controls, guardedFields: [...fields].sort() }));
  });
}

test('wrong-checkpoint order cannot pass: original copy on M, composite on B/C, double copy and legacy CSV double inverses', () => {
  for (const file of ['data/funding-index/rounds.csv', 'data/market-memo-q1-2026/milestones.csv', 'src/data/funding-index.json', 'src/data/milestones.json']) {
    const raw = read(file);
    assert.throws(() => restoreReviewedFile(raw, SITEWIDE_COPY_DELTA, file), assert.AssertionError, file + ': original copy requires B, not M');
    const b = restoreCopyMainFile(raw, file), c = restoreMerged151Copy(raw, file);
    for (const historic of [b, c]) assert.throws(() => beforeFinancingFixesFile(historic, file), assert.AssertionError, file + ': composite requires M, not B/C');
  }
  for (const file of ['data/funding-index/foundings.csv', 'data/funding-index/milestones.csv']) {
    const raw = read(file), historic = beforeFinancingFixesFile(raw, file);
    assert.throws(() => beforeFinancingFixesFile(historic, file), assert.AssertionError, file + ': no second legacy inverse');
    const entry = SITEWIDE_COPY_DELTA.files.find(e => e.path === file);
    const edit = entry.delta.changes[0].edits.find(e => e.after.length > 0);
    const lines = raw.split('\n'); lines[edit.afterIndex] += ',UNREVIEWED';
    assert.throws(() => beforeFinancingFixesFile(lines.join('\n'), file), assert.AssertionError, file + ': exact reviewed legacy row, not an untouched anchor');
  }
});

test('unlisted mutations reject or survive exactly to fail the original complete-file golden, never disappear', () => {
  for (const [edge, file, mutate] of [
    [FINANCING_COPY_COMPOSITE, 'src/data/funding-index.json', value => { value.unreviewed = { note: 'must survive' }; }],
    [FINANCING_COPY_COMPOSITE, 'data/funding-index/investor-evidence.json', value => { value[0].unrelatedSource = 'https://unreviewed.invalid'; }],
    [FINANCING_OVER_COPY, 'src/data/funding-index.json', value => { value.unreviewed = { note: 'must survive or reject literal bridge' }; }],
  ]) {
    const entry = edge.files.find(e => e.path === file), value = JSON.parse(read(file)); mutate(value);
    const changed = JSON.stringify(value);
    let restored;
    try { restored = restoreReviewedFile(changed, edge, file); }
    catch (error) { assert.ok(error instanceof assert.AssertionError); continue; }
    assert.notEqual(sha256(restored), entry.beforeSha256, file + ': untouched original full-file golden rejects');
    if (value.unreviewed) assert.deepEqual(JSON.parse(restored).unreviewed, value.unreviewed, 'unknown root key cannot disappear');
    else assert.equal(JSON.parse(restored)[0].unrelatedSource, value[0].unrelatedSource, 'unrelated source survives');
  }
  for (const edge of [FINANCING_COPY_COMPOSITE, FINANCING_OVER_COPY]) {
    const entry = edge.files.find(e => e.path === 'data/funding-index/rounds.csv');
    const raw = read(entry.path), mutated = raw.replace('company_slug', 'unreviewed_header');
    let restored;
    try { restored = restoreReviewedFile(mutated, edge, entry.path); }
    catch (error) { assert.ok(error instanceof assert.AssertionError); continue; }
    assert.match(restored, /^unreviewed_header,/);
    assert.notEqual(sha256(restored), entry.beforeSha256, 'untouched CSV cell cannot disappear');
  }
});
