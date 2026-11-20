import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Enumerated field-only delta from b6f99ef; never rebaseline historical scientific hashes.
const bytes = readFileSync(new URL('../fixtures/recording-hours-coverage-delta.json', import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'f32924bd84a45f4d15c0b9da920b8abeeac978c604b7908e8569457893d47a7b');
const delta = JSON.parse(bytes);
const title = 'Neural recording hours collected over time';
const one = (items, id) => {
  const matches = items.filter(item => item.id === id);
  assert.equal(matches.length, 1, `${id}: exactly one recording observation`);
  return matches[0];
};
function restore(target, change) {
  for (const [field, after] of Object.entries(change.after)) {
    assert.deepEqual(target[field], after, `${target.id}.${field}: exact recording coverage/access delta`);
    if (Object.hasOwn(change.before, field)) target[field] = structuredClone(change.before[field]);
    else delete target[field];
  }
}
export function beforeRecordingCoverage(evidence) {
  const restored = structuredClone(evidence);
  const plots = restored[title].plots;
  const metric = plots.some(plot => plot.id === 'recording-hours');
  const points = plots.flatMap(plot => plot.points);
  for (const change of delta.points) restore(one(points, change.id), change);
  if (metric) for (const change of delta.metricPoints) restore(one(points, change.id), change);
  for (const change of metric ? delta.metricPlots : delta.draftPlots) restore(one(plots, change.id), change);
  return restored;
}
