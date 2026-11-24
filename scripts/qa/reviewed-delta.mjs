import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const state = (parent, key) => Object.hasOwn(parent, key) ? { exists: true, value: clone(parent[key]) } : { exists: false };

function exactKeys(value, keys, label) {
  assert.ok(object(value), label + ': expected an object');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label + ': missing or unlisted fields');
}

function jsonValue(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') { assert.ok(Number.isFinite(value) && !Object.is(value, -0), 'Expected a finite JSON number'); return; }
  assert.ok(Array.isArray(value) || object(value), 'Expected a JSON value');
  assert.ok(!ancestors.has(value), 'Cyclic JSON is not supported');
  assert.ok(Array.isArray(value) || [null, Object.prototype].includes(Object.getPrototypeOf(value)), 'Expected a plain JSON object');
  ancestors.add(value);
  if (Array.isArray(value)) {
    assert.equal(Object.keys(value).length, value.length, 'Sparse arrays or unlisted array properties are not JSON');
    for (let i = 0; i < value.length; i++) { assert.ok(Object.hasOwn(value, i), 'Sparse arrays are not JSON'); jsonValue(value[i], ancestors); }
  } else for (const [key, child] of Object.entries(value)) {
    assert.ok(!['__proto__', 'constructor', 'prototype'].includes(key), 'Unsafe JSON key');
    jsonValue(child, ancestors);
  }
  ancestors.delete(value);
}

function validateState(value) {
  assert.ok(object(value) && typeof value.exists === 'boolean', 'Expected explicit value presence');
  exactKeys(value, value.exists ? ['exists', 'value'] : ['exists'], 'Reviewed state');
  if (value.exists) jsonValue(value.value);
}

export function validateReviewedDelta(fixture) {
  exactKeys(fixture, ['version', 'changes'], 'Reviewed delta');
  assert.equal(fixture.version, 1, 'Unsupported reviewed delta');
  assert.ok(Array.isArray(fixture.changes), 'Missing reviewed changes');
  const paths = [];
  for (const change of fixture.changes) {
    assert.ok(object(change) && Array.isArray(change.path), 'Missing reviewed path');
    for (const key of change.path) assert.ok((typeof key === 'string' && !['__proto__', 'constructor', 'prototype'].includes(key)) || (Number.isSafeInteger(key) && key >= 0), 'Invalid or unsafe path segment');
    for (const path of paths) {
      const common = Math.min(path.length, change.path.length);
      assert.ok(!path.slice(0, common).every((key, i) => key === change.path[i]), 'Duplicate or overlapping reviewed paths');
    }
    paths.push(change.path);
    if (Object.hasOwn(change, 'edits')) {
      exactKeys(change, ['path', 'beforeLength', 'afterLength', 'edits'], 'Reviewed array change');
      assert.ok(Number.isSafeInteger(change.beforeLength) && change.beforeLength >= 0 && Number.isSafeInteger(change.afterLength) && change.afterLength >= 0, 'Invalid reviewed array lengths');
      assert.ok(Array.isArray(change.edits) && change.edits.length > 0, 'Empty reviewed array edits');
      let beforeEnd = 0, afterEnd = 0;
      for (const edit of change.edits) {
        exactKeys(edit, ['beforeIndex', 'afterIndex', 'before', 'after'], 'Reviewed array edit');
        assert.ok(Number.isSafeInteger(edit.beforeIndex) && edit.beforeIndex >= beforeEnd && Number.isSafeInteger(edit.afterIndex) && edit.afterIndex >= afterEnd, 'Duplicate, overlapping or invalid reviewed array edits');
        assert.equal(edit.beforeIndex - beforeEnd, edit.afterIndex - afterEnd, 'Unlisted array movement');
        assert.ok(Array.isArray(edit.before) && Array.isArray(edit.after), 'Expected explicit reviewed slices');
        jsonValue(edit.before); jsonValue(edit.after);
        assert.ok(!isDeepStrictEqual(edit.before, edit.after), 'No-op reviewed edit');
        beforeEnd = edit.beforeIndex + edit.before.length;
        afterEnd = edit.afterIndex + edit.after.length;
        assert.ok(beforeEnd <= change.beforeLength && afterEnd <= change.afterLength, 'Reviewed slice outside array');
      }
      assert.equal(change.beforeLength - beforeEnd, change.afterLength - afterEnd, 'Unlisted trailing array movement');
    } else {
      exactKeys(change, ['path', 'before', 'after'], 'Reviewed value change');
      validateState(change.before); validateState(change.after);
      assert.ok(change.path.length || (change.before.exists && change.after.exists), 'The JSON root cannot be absent');
      assert.ok(!isDeepStrictEqual(change.before, change.after), 'No-op reviewed change');
    }
  }
  return fixture;
}

// Keep unchanged array entries as LCS anchors. Only the intervening exact slices
// enter the allowance; their lengths and every changed row/field remain strict.
function arrayChanges(before, after) {
  const table = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      table[i][j] = isDeepStrictEqual(before[i], after[j]) ? 1 + table[i + 1][j + 1] : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const anchors = [];
  let i = 0, j = 0;
  while (i < before.length && j < after.length) {
    if (isDeepStrictEqual(before[i], after[j])) { anchors.push([i++, j++]); }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  anchors.push([before.length, after.length]);
  const edits = [];
  let left = 0, right = 0;
  for (const [i, j] of anchors) {
    if (i !== left || j !== right) edits.push({ beforeIndex: left, afterIndex: right, before: clone(before.slice(left, i)), after: clone(after.slice(right, j)) });
    left = i + 1; right = j + 1;
  }
  return { beforeLength: before.length, afterLength: after.length, edits };
}

// JSON values only. Paths are arrays, not executable expressions or lossy dotted keys.
export function createReviewedDelta(before, after) {
  jsonValue(before); jsonValue(after);
  const changes = [];
  function visit(left, right, path) {
    if (isDeepStrictEqual(left, right)) return;
    if (object(left) && object(right)) {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
        if (Object.hasOwn(left, key) && Object.hasOwn(right, key)) visit(left[key], right[key], [...path, key]);
        else changes.push({ path: [...path, key], before: state(left, key), after: state(right, key) });
      }
    } else if (Array.isArray(left) && Array.isArray(right)) changes.push({ path, ...arrayChanges(left, right) });
    else changes.push({ path, before: { exists: true, value: clone(left) }, after: { exists: true, value: clone(right) } });
  }
  visit(before, after, []);
  return { version: 1, changes };
}

function project(input, fixture, reverse) {
  validateReviewedDelta(fixture);
  jsonValue(input);
  let result = clone(input);
  const changes = reverse ? [...fixture.changes].reverse() : fixture.changes;
  for (const change of changes) {
    if (change.edits) {
      let array = result;
      for (const key of change.path) {
        assert.ok(array !== null && typeof array === 'object' && Object.hasOwn(array, key), 'Missing reviewed array path');
        array = array[key];
      }
      assert.ok(Array.isArray(array), 'Reviewed array is missing');
      assert.equal(array.length, reverse ? change.afterLength : change.beforeLength, 'Reviewed array length: missing, duplicate or unlisted entries');
      for (const edit of [...change.edits].reverse()) {
        const index = reverse ? edit.afterIndex : edit.beforeIndex;
        const expected = reverse ? edit.after : edit.before;
        const replacement = reverse ? edit.before : edit.after;
        assert.deepEqual(array.slice(index, index + expected.length), expected, JSON.stringify(change.path) + ': reviewed slice must match exactly');
        array.splice(index, expected.length, ...clone(replacement));
      }
      assert.equal(array.length, reverse ? change.beforeLength : change.afterLength);
      continue;
    }
    const expected = reverse ? change.after : change.before;
    const replacement = reverse ? change.before : change.after;
    if (!change.path.length) {
      assert.deepEqual({ exists: true, value: result }, expected, 'Reviewed root must match exactly');
      assert.equal(replacement.exists, true);
      result = clone(replacement.value);
      continue;
    }
    let parent = result;
    for (const key of change.path.slice(0, -1)) {
      assert.ok(parent !== null && typeof parent === 'object' && Object.hasOwn(parent, key), 'Missing reviewed path');
      parent = parent[key];
    }
    const key = change.path.at(-1);
    assert.ok(parent !== null && typeof parent === 'object', 'Missing reviewed parent');
    assert.deepEqual(state(parent, key), expected, JSON.stringify(change.path) + ': reviewed value must match exactly');
    if (replacement.exists) parent[key] = clone(replacement.value);
    else delete parent[key];
  }
  return result;
}

export const applyReviewedDelta = (before, fixture) => project(before, fixture, false);
export const restoreReviewedDelta = (after, fixture) => project(after, fixture, true);
