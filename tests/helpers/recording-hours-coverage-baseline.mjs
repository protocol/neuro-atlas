import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Enumerated field-only delta from b6f99ef; never rebaseline historical scientific hashes.
const bytes = readFileSync(new URL('../fixtures/recording-hours-coverage-delta.json', import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'f32924bd84a45f4d15c0b9da920b8abeeac978c604b7908e8569457893d47a7b');
const delta = JSON.parse(bytes);
// An additive checkpoint has its own exact fixture; old delta bytes/hashes stay fixed.
const additionBytes = readFileSync(new URL('../fixtures/braingate-t15-recording-hours-addition.json', import.meta.url));
assert.equal(createHash('sha256').update(additionBytes).digest('hex'), '85add1b501172963d291bf49f8fab17465a2bd8a5e0030b5140adc3e02e55b06');
const addition = JSON.parse(additionBytes);
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
  const addedPlot = addition.draftPlot;
  const addedPoint = addedPlot.points[0];
  if (metric) {
    const plot = one(plots, 'recording-hours');
    assert.deepEqual(one(plot.points, addedPoint.id), { ...addedPoint, group: addedPlot.title, color: addition.color }, 'Exact BrainGate T15 metric addition');
    assert.equal(plot.points.at(-1).id, addedPoint.id, 'Only the appended observation is removed');
    plot.points.pop();
    const legend = { label: addedPlot.title, color: addition.color };
    assert.equal(plot.legend.filter(entry => entry.label === legend.label).length, 1);
    assert.deepEqual(plot.legend.at(-1), legend, 'Exact appended BrainGate legend entry');
    plot.legend.pop();
    const suffix = `\n\n${addedPlot.title}: ${addedPlot.scope}`;
    assert.ok(plot.seriesNote.endsWith(suffix), 'Exact appended BrainGate source note');
    plot.seriesNote = plot.seriesNote.slice(0, -suffix.length);
  } else {
    assert.deepEqual(one(plots, addedPlot.id), addedPlot, 'Exact BrainGate T15 source plot addition');
    assert.equal(plots.at(-1).id, addedPlot.id, 'Only the appended source plot is removed');
    plots.pop();
  }
  const points = plots.flatMap(plot => plot.points);
  for (const change of delta.points) restore(one(points, change.id), change);
  if (metric) for (const change of delta.metricPoints) restore(one(points, change.id), change);
  for (const change of metric ? delta.metricPlots : delta.draftPlots) restore(one(plots, change.id), change);
  return restored;
}
