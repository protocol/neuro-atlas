import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Exact, enumerated deltas from the runtime projections at the three immutable
// commits recorded in the fixture. Original historical hashes are never updated.
// FAFB canonical notes and reader-projected notes deliberately have separate
// before/after values: raw archive prose is not a projected-note baseline.
const bytes = readFileSync(new URL('../fixtures/connectomics-provenance-merge-delta.json', import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'), '6d8ad5f4adb19699894aff3b38abcd602a6cf90537169284874974e39be2db84');
const delta = JSON.parse(bytes);

function one(items, id) {
  const matches = items.filter(item => item.id === id);
  assert.equal(matches.length, 1, `${id}: exactly one preserved identity`);
  return matches[0];
}

function restoreFields(target, change) {
  for (const [field, value] of Object.entries(change.after)) {
    assert.deepEqual(target[field], value, `${target.id}.${field}: exact approved provenance delta`);
    if (Object.hasOwn(change.before, field)) target[field] = structuredClone(change.before[field]);
    else delete target[field];
  }
}

export function reverseFafbAttribution(evidence, mode) {
  const restored = structuredClone(evidence);
  const plots = Object.values(restored).flatMap(entry => entry.plots);
  for (const change of delta.fafb[mode].plots) restoreFields(one(plots, change.id), change);
  for (const change of delta.fafb[mode].points) restoreFields(one(one(plots, change.plotId).points, change.id), change);
  return restored;
}

// Assert every field of all six upstream observations and all changed plot
// metadata before removing only those exact additions. Unlisted source, numeric,
// date, note and presentation fields still reach the original full goldens.
export function withoutConnectomicsBackfill(evidence) {
  const restored = structuredClone(evidence);
  const plots = Object.values(restored).flatMap(entry => entry.plots);
  for (const change of delta.backfill.points) {
    const plot = one(plots, change.plotId);
    assert.deepEqual(one(plot.points, change.point.id), change.point, `${change.point.id}: exact PR129 checkpoint`);
    plot.points = plot.points.filter(point => point.id !== change.point.id);
  }
  for (const change of delta.backfill.plots) restoreFields(one(plots, change.id), change);
  return restored;
}
