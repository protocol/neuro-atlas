import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { applyReviewedDelta, createReviewedDelta, restoreReviewedDelta, validateReviewedDelta } from './reviewed-delta.mjs';

export const sha256 = text => createHash('sha256').update(text).digest('hex');
const exact = (value, keys) => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected fixture object');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Missing or unlisted file-fixture fields');
};
const relativeFile = file => {
  assert.ok(typeof file === 'string' && file.length > 0 && !file.includes('\\') && !path.isAbsolute(file) && file.split('/').every(part => part && !['.', '..'].includes(part)), 'Expected a literal relative file path');
};

export function validateReviewedFilesFixture(fixture) {
  exact(fixture, ['version', 'baselineSha', 'files']);
  assert.equal(fixture.version, 1);
  assert.match(fixture.baselineSha, /^[a-f0-9]{40}$/, 'Expected an exact baseline commit SHA');
  assert.ok(Array.isArray(fixture.files), 'Missing reviewed files');
  const seen = new Set();
  for (const file of fixture.files) {
    exact(file, file.encoding === 'json' ? ['path', 'encoding', 'beforeSha256', 'afterSha256', 'delta', 'beforeFormat', 'afterFormat'] : ['path', 'encoding', 'beforeSha256', 'afterSha256', 'delta']);
    assert.ok(['json', 'lines'].includes(file.encoding), 'Unknown reviewed file encoding');
    relativeFile(file.path);
    assert.ok(!seen.has(file.path), 'Duplicate reviewed file: ' + file.path);
    seen.add(file.path);
    assert.match(file.beforeSha256, /^[a-f0-9]{64}$/);
    assert.match(file.afterSha256, /^[a-f0-9]{64}$/);
    assert.notEqual(file.beforeSha256, file.afterSha256, 'Unchanged files do not belong in the allowance');
    validateReviewedDelta(file.delta);
    assert.ok(file.delta.changes.length > 0, 'Missing exact file changes');
    if (file.encoding === 'lines') {
      // Raw UTF-8 lines retain CRLF, quoting and final-newline bytes exactly.
      assert.equal(file.delta.changes.length, 1, 'Expected one exact line-array delta');
      assert.deepEqual(file.delta.changes[0].path, []);
      assert.ok(file.delta.changes[0].edits, 'Expected exact reviewed line edits');
      for (const edit of file.delta.changes[0].edits) {
        assert.ok([...edit.before, ...edit.after].every(line => typeof line === 'string'), 'Expected literal file lines');
      }
    } else for (const format of [file.beforeFormat, file.afterFormat]) {
      exact(format, ['space', 'finalNewline']);
      assert.ok([0, 2, 4, '\t'].includes(format.space) && typeof format.finalNewline === 'boolean', 'Unsupported exact JSON formatting');
    }
  }
  return fixture;
}

// No global current-file hash gate here: unlisted mutations in untouched lines
// must survive reconstruction and reach the original historical goldens. The
// separate fixture regression also checks each complete reviewed file hash.
export function restoreReviewedFile(text, fixture, filePath) {
  validateReviewedFilesFixture(fixture);
  const reviewed = fixture.files.find(file => file.path === filePath);
  if (!reviewed) return text;
  return reviewed.encoding === 'json'
    ? formatJson(restoreReviewedDelta(JSON.parse(text), reviewed.delta), reviewed.beforeFormat)
    : restoreReviewedDelta(text.split('\n'), reviewed.delta).join('\n');
}

const formatJson = (value, format) => JSON.stringify(value, null, format.space) + (format.finalNewline ? '\n' : '');
function detectFormat(text, value) {
  for (const space of [0, 2, 4, '\t']) {
    const format = { space, finalNewline: text.endsWith('\n') };
    if (formatJson(value, format) === text) return format;
  }
  return null;
}

export async function buildReviewedFilesFixture({ baseDir, candidateDir, baselineSha, files }) {
  assert.ok(Array.isArray(files) && files.length > 0, 'Name every reviewed candidate file explicitly');
  assert.equal(new Set(files).size, files.length, 'Duplicate reviewed file input');
  const fixture = { version: 1, baselineSha, files: [] };
  for (const file of files) {
    relativeFile(file);
    const [before, after] = await Promise.all([readFile(path.join(baseDir, file), 'utf8'), readFile(path.join(candidateDir, file), 'utf8')]);
    if (before === after) continue;
    let entry;
    if (file.endsWith('.json')) {
      const left = JSON.parse(before), right = JSON.parse(after);
      const beforeFormat = detectFormat(before, left), afterFormat = detectFormat(after, right);
      if (beforeFormat && afterFormat) {
        const delta = createReviewedDelta(left, right);
        if (delta.changes.length && formatJson(applyReviewedDelta(left, delta), afterFormat) === after && formatJson(restoreReviewedDelta(right, delta), beforeFormat) === before) {
          entry = { encoding: 'json', beforeFormat, afterFormat, delta };
        }
      }
    }
    if (!entry) {
      const delta = createReviewedDelta(before.split('\n'), after.split('\n'));
      assert.equal(applyReviewedDelta(before.split('\n'), delta).join('\n'), after, file + ': forward byte reconstruction');
      assert.equal(restoreReviewedDelta(after.split('\n'), delta).join('\n'), before, file + ': historical byte reconstruction');
      entry = { encoding: 'lines', delta };
    }
    fixture.files.push({ path: file, beforeSha256: sha256(before), afterSha256: sha256(after), ...entry });
  }
  return validateReviewedFilesFixture(fixture);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ options: {
    'base-dir': { type: 'string' }, 'candidate-dir': { type: 'string' },
    output: { type: 'string' }, 'baseline-sha': { type: 'string' },
  }, allowPositionals: true, strict: true });
  for (const key of ['base-dir', 'candidate-dir', 'output', 'baseline-sha']) assert.ok(values[key], 'Missing --' + key);
  const fixture = await buildReviewedFilesFixture({ baseDir: values['base-dir'], candidateDir: values['candidate-dir'], baselineSha: values['baseline-sha'], files: positionals });
  await writeFile(values.output, JSON.stringify(fixture, null, 2) + '\n', { flag: 'wx' });
  console.log(`Wrote ${fixture.files.length} exact reviewed file deltas to ${values.output}. Review before committing; generation is not source approval.`);
}
