import test from 'node:test';
import assert from 'node:assert/strict';

// A missing implementation produces the same explicit RED assertion as a missing export.
const delta = await import('../scripts/qa/reviewed-delta.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('reviewed JSON deltas reverse exact scalar, null, added and removed fields without mutating inputs', () => {
  assert.equal(typeof delta.createReviewedDelta, 'function', 'The reviewed-delta generator must exist');
  const before = { summary: { count: 25, reviewed: null, removed: 'original' }, untouched: { note: 'golden' } };
  const after = { summary: { count: 28, reviewed: '2026-11-24', added: { note: 'reviewed' } }, untouched: { note: 'golden' } };
  const original = structuredClone(after);
  const fixture = delta.createReviewedDelta(before, after);
  assert.deepEqual(delta.applyReviewedDelta(before, fixture), after);
  assert.deepEqual(delta.restoreReviewedDelta(after, fixture), before);
  assert.deepEqual(after, original);
  const unlisted = structuredClone(after);
  unlisted.untouched.unreviewed = true;
  assert.deepEqual(delta.restoreReviewedDelta(unlisted, fixture).untouched, unlisted.untouched,
    'An unrelated mutation must survive to the original historical assertion, not be hidden');
  const wrong = structuredClone(after); wrong.summary.count = 99;
  assert.throws(() => delta.restoreReviewedDelta(wrong, fixture), assert.AssertionError);
});

test('array deltas list only exact reviewed slices and reverse multiple sorted insertions', () => {
  const oldRow = { slug: 'original', amount: 5, note: 'unchanged' };
  const before = { rows: [oldRow, { slug: 'last', amount: 7 }], labels: ['a', 'b'] };
  const after = { rows: [{ slug: 'first', amount: 3 }, oldRow, { slug: 'middle', amount: 4 }, { slug: 'last', amount: 7 }], labels: ['a', 'revised', 'b'] };
  const fixture = delta.createReviewedDelta(before, after);
  const array = fixture.changes.find(change => change.path[0] === 'rows');
  assert.deepEqual(array.edits?.map(edit => edit.after), [[after.rows[0]], [after.rows[2]]], 'No unchanged historical row belongs in the reviewed allowance');
  assert.deepEqual(delta.applyReviewedDelta(before, fixture), after);
  assert.deepEqual(delta.restoreReviewedDelta(after, fixture), before);
  const unlisted = structuredClone(after); unlisted.rows[1].unreviewed = 'must reach original golden';
  assert.equal(delta.restoreReviewedDelta(unlisted, fixture).rows[0].unreviewed, unlisted.rows[1].unreviewed);
  for (const mutate of [
    rows => { rows[0].amount = 999; },
    rows => { rows[0].unreviewed = true; },
    rows => { delete rows[0].amount; },
    rows => { rows.splice(0, 1); },
    rows => { rows.push(structuredClone(rows[0])); },
  ]) {
    const wrong = structuredClone(after); mutate(wrong.rows);
    assert.throws(() => delta.restoreReviewedDelta(wrong, fixture), assert.AssertionError);
  }
});

test('reviewed fixtures reject missing, duplicate, overlapping and unlisted instructions', () => {
  const before = { nested: { value: 'old' }, rows: ['old', 'same'] };
  const after = { nested: { value: 'new' }, rows: ['new', 'same', 'added'] };
  const valid = delta.createReviewedDelta(before, after);
  const cases = [
    f => { f.extra = true; },
    f => { delete f.version; },
    f => { f.version = 2; },
    f => { delete f.changes; },
    f => { f.changes.push(structuredClone(f.changes[0])); },
    f => { f.changes[0].extra = true; },
    f => { delete f.changes[0].before; },
    f => { f.changes[0].path = ['__proto__', 'polluted']; },
    f => { f.changes[0].after.extra = true; },
    f => { f.changes.push({ path: ['nested'], before: { exists: true, value: before.nested }, after: { exists: true, value: after.nested } }); },
    f => { const c = f.changes.find(c => c.edits); c.edits.push(structuredClone(c.edits[0])); },
    f => { const c = f.changes.find(c => c.edits); c.edits[0].extra = true; },
    f => { const c = f.changes.find(c => c.edits); c.edits[0].beforeIndex = -1; },
    f => { const c = f.changes.find(c => c.edits); c.afterLength += 1; },
  ];
  for (const mutate of cases) {
    const invalid = structuredClone(valid); mutate(invalid);
    assert.throws(() => delta.restoreReviewedDelta(after, invalid), assert.AssertionError, mutate.toString());
  }
  const added = delta.createReviewedDelta({}, { record: { amount: 5 } });
  assert.throws(() => delta.restoreReviewedDelta({ record: { amount: 5, extra: true } }, added), assert.AssertionError);
  const removed = delta.createReviewedDelta({ deleted: 'reviewed' }, {});
  assert.throws(() => delta.restoreReviewedDelta({ deleted: 'unreviewed' }, removed), assert.AssertionError);
});

test('fixture builder round-trips reviewed JSON and exact raw CSV bytes through the CLI without git', async t => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const builder = await import('../scripts/qa/build-reviewed-delta.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  });
  assert.equal(typeof builder.buildReviewedFilesFixture, 'function', 'The real file-fixture builder must exist');
  const cwd = await mkdtemp(join(tmpdir(), 'neuro-reviewed-delta-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const base = join(cwd, 'base'), candidate = join(cwd, 'candidate');
  await mkdir(base); await mkdir(candidate);
  const before = { 'companies.csv': 'slug,note\r\nold,"comma, kept"\r\n', 'catalog.json': '{\n  "datasets": [["https://old.example/", "Original"]]\n}\n' };
  const after = { 'companies.csv': before['companies.csv'] + 'new,"quoted ""source"""\r\n', 'catalog.json': '{\n  "datasets": [["https://old.example/", "Original"], ["https://new.example/", "Reviewed"]]\n}\n' };
  for (const file of Object.keys(before)) { await writeFile(join(base, file), before[file]); await writeFile(join(candidate, file), after[file]); }
  const output = join(cwd, 'fixture.json');
  const cli = new URL('../scripts/qa/build-reviewed-delta.mjs', import.meta.url);
  const run = spawnSync(process.execPath, [cli.pathname, '--base-dir', base, '--candidate-dir', candidate, '--output', output, '--baseline-sha', 'a'.repeat(40), ...Object.keys(before)], { cwd, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const fixture = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(fixture.baselineSha, 'a'.repeat(40));
  assert.equal(fixture.files.length, 2);
  for (const entry of fixture.files) {
    assert.equal(entry.beforeSha256, createHash('sha256').update(before[entry.path]).digest('hex'));
    assert.equal(entry.afterSha256, createHash('sha256').update(after[entry.path]).digest('hex'));
    assert.equal(builder.restoreReviewedFile(after[entry.path], fixture, entry.path), before[entry.path]);
    assert.equal(delta.applyReviewedDelta(before[entry.path].split('\n'), entry.delta).join('\n'), after[entry.path]);
    assert.throws(() => builder.restoreReviewedFile(after[entry.path] + 'unlisted\n', fixture, entry.path), assert.AssertionError);
  }
  assert.equal(builder.restoreReviewedFile('untouched bytes', fixture, 'unlisted.csv'), 'untouched bytes');
  for (const mutate of [f => f.files.push(f.files[0]), f => { f.files[0].extra = true; }, f => { f.files[0].path = '../escape.csv'; }, f => { delete f.files[0].delta; }]) {
    const invalid = structuredClone(fixture); mutate(invalid);
    assert.throws(() => builder.restoreReviewedFile(after['companies.csv'], invalid, 'companies.csv'), assert.AssertionError);
  }
  await assert.rejects(builder.buildReviewedFilesFixture({ baseDir: base, candidateDir: candidate, baselineSha: 'a'.repeat(40), files: ['companies.csv', 'companies.csv'] }), assert.AssertionError);
});

test('compact generated JSON fixtures contain only reviewed rows rather than an entire one-line file', async t => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { buildReviewedFilesFixture, restoreReviewedFile } = await import('../scripts/qa/build-reviewed-delta.mjs');
  const cwd = await mkdtemp(join(tmpdir(), 'neuro-compact-fixture-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const base = join(cwd, 'base'), candidate = join(cwd, 'candidate'); await mkdir(base); await mkdir(candidate);
  const oldRow = { slug: 'old', amount: 4, note: 'original golden row must not enter the allowance' };
  const before = { companies: [oldRow], summary: { selected: 1 } };
  const after = { companies: [oldRow, { slug: 'new', amount: 5 }], summary: { selected: 2 } };
  await writeFile(join(base, 'funding.json'), JSON.stringify(before));
  await writeFile(join(candidate, 'funding.json'), JSON.stringify(after));
  const fixture = await buildReviewedFilesFixture({ baseDir: base, candidateDir: candidate, baselineSha: 'a'.repeat(40), files: ['funding.json'] });
  assert.equal(fixture.files[0].encoding, 'json');
  assert.ok(!JSON.stringify(fixture).includes(oldRow.note), 'An unchanged row is not a reviewed exemption');
  assert.equal(restoreReviewedFile(JSON.stringify(after), fixture, 'funding.json'), JSON.stringify(before));
  const wrong = structuredClone(after); wrong.companies[1].extra = true;
  assert.throws(() => restoreReviewedFile(JSON.stringify(wrong), fixture, 'funding.json'), assert.AssertionError);
  for (const mutate of [rows => { rows.pop(); }, rows => { rows.push(rows[1]); }]) {
    const invalid = structuredClone(after); mutate(invalid.companies);
    assert.throws(() => restoreReviewedFile(JSON.stringify(invalid), fixture, 'funding.json'), assert.AssertionError);
  }
});
