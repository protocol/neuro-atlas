import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFinancingFixesReader } from './helpers/financing-fixes-reader.mjs';
import { sha256 } from '../scripts/qa/build-reviewed-delta.mjs';
import * as copy from './helpers/sitewide-copy-baseline.mjs';
import * as finance from './helpers/financing-fixes-baseline.mjs';

const root = new URL('../', import.meta.url);
const legacy = ['data/funding-index/foundings.csv', 'data/funding-index/milestones.csv'];

test('pure fallback dispatch applies once to inside-root non-finance paths with identical read signatures', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'financing-copy-dispatch-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/financing-fixes-20261125.json', import.meta.url)));
  const calls = [];
  const fallback = (text, file) => { calls.push(file); return text + '\nHISTORY'; };
  const reader = createFinancingFixesReader(fixture, directory, fallback);
  const file = join(directory, 'legacy.csv');
  await writeFile(file, 'raw');
  assert.equal(reader.beforeFile('raw', 'legacy.csv'), 'raw\nHISTORY');
  for (const input of [file, pathToFileURL(file)]) {
    for (const options of [undefined, 'utf8', { encoding: 'utf8' }]) {
      assert.equal((await reader.readFile(input, options)).toString(), 'raw\nHISTORY');
      assert.equal(reader.readFileSync(input, options).toString(), 'raw\nHISTORY');
    }
  }
  assert.equal(reader.beforeFile('raw', '../outside.csv'), 'raw');
  assert.equal(reader.beforeFile('raw', file + '/outside'), 'raw', 'absolute paths are not relative API inputs');
  const outside = join(directory, '../outside-' + directory.split('/').at(-1) + '.csv');
  await writeFile(outside, 'outside'); t.after(() => rm(outside, { force: true }));
  assert.equal(reader.readFileSync(outside, 'utf8'), 'outside');
  const reviewed = fixture.files.find(e => e.path === 'data/funding-index/rounds.csv');
  const candidate = readFileSync(new URL('../' + reviewed.path, import.meta.url), 'utf8');
  // Use the old delta's exact endpoint, not actual integrated data.
  const { restoreCopyMainFile } = copy;
  assert.equal(typeof restoreCopyMainFile, 'function');
  // Finance dispatch must not even call the fallback when a finance inverse rejects.
  const count = calls.length;
  assert.throws(() => reader.beforeFile('invalid', reviewed.path));
  assert.equal(calls.length, count);
  assert.equal(readFileSync(file, 'utf8'), 'raw');
});

test('historical endpoints are named and disjoint: M→F and M→B→C', () => {
  assert.equal(typeof copy.restoreCopyMainFile, 'function');
  assert.ok(finance.FINANCING_COPY_COMPOSITE, 'explicit composite export');
  for (const entry of copy.SITEWIDE_COPY_DELTA.files) {
    const text = readFileSync(new URL(entry.path, root), 'utf8');
    assert.equal(sha256(copy.restoreCopyMainFile(text, entry.path)), entry.afterSha256, entry.path + ': B');
    assert.equal(sha256(copy.restoreMerged151Copy(text, entry.path)), entry.beforeSha256, entry.path + ': C');
  }
  for (const file of legacy) {
    const text = readFileSync(new URL(file, root), 'utf8');
    assert.equal(finance.beforeFinancingFixesFile(text, file), copy.restoreMerged151Copy(text, file));
  }
  for (const file of ['data/glossary/acronyms.csv', 'src/lib/neuroai-energy-axis.ts']) {
    const text = readFileSync(new URL(file, root), 'utf8');
    assert.equal(finance.beforeFinancingFixesFile(text, file), text, 'only two legacy CSVs may fall back');
  }
});
