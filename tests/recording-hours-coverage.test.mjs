import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';

import * as coverageMetrics from '../src/data/recording-hours-coverage.ts';

const title = 'Neural recording hours collected over time';
const plot = METRIC_CHART_EVIDENCE[title].plots[0];
export const expectedCoverage = [
  ['neuralink-reported-hours-2026-10-01', null, 'participants', undefined],
  ['tusz-scalp-eeg-2017-04-17', 114, 'patients', 510],
  ['tusz-scalp-eeg-2017-08-04', 246, 'patients', 686],
  ['tusz-scalp-eeg-2018-04-15', 315, 'patients', 822],
  ['tusz-scalp-eeg-2018-08-16', 364, 'patients', 970],
  ['tusz-scalp-eeg-2018-11-14', 364, 'patients', 969],
  ['tusz-scalp-eeg-2019-07-22', 692, 'patients', 1661],
  ['tusz-scalp-eeg-2020-04-23', 692, 'patients', 1575],
  ['tusz-scalp-eeg-2020-05-09', 692, 'patients', 2608],
  ['ajile12-intracranial-2022-01-27', 12, 'participants', undefined],
  ['poyo-primate-training-2023-10-24', 7, 'nonhuman primates', 158],
  ['japaneeg-scalp-eeg-2026-05-31', 3, 'participants', undefined],
  ['braingate-t15-independent-use-2026-06-15', 1, 'participants', undefined],
];

test('each duration has its own matched participant/animal denominator and release-specific sessions', () => {
  assert.equal(plot.points.length, expectedCoverage.length);
  for (const [id, count, unit, sessions] of expectedCoverage) {
    const coverage = plot.points.find(point => point.id === id).recordingCoverage;
    assert.ok(coverage, `${id}: matched recording coverage is missing`);
    assert.deepEqual([coverage.count, coverage.unit, coverage.sessions], [count, unit, sessions], id);
    assert.ok(coverage.detail, `${id}: denominator scope must be inspectable`);
  }
  assert.equal(plot.points.find(point => point.id.startsWith('poyo-')).recordingCoverage.sessionsQualifier, '>');
  const archive = JSON.parse(readFileSync(new URL('../src/data/draft-chart-evidence.json', import.meta.url)))[title];
  for (const original of archive.plots.flatMap(p => p.points)) {
    const current = plot.points.find(point => point.id === original.id);
    for (const key of ['x', 'y', 'id', 'dateLabel', 'qualifier', 'quote', 'sourceUrl']) assert.deepEqual(current[key], original[key], `${original.id}: ${key} preserved`);
  }
  assert.equal(plot.scale, 'log');
  for (const [otherTitle, evidence] of Object.entries(METRIC_CHART_EVIDENCE)) {
    if (otherTitle !== title) assert.ok(evidence.plots.every(p => p.points.every(point => !point.recordingCoverage)), 'other charts unchanged');
  }
});

test('coverage calculations fail closed on invalid denominators or hours; qualified hours are never rounded up', () => {
  const { recordingAverages, recordingBar, recordingReferences } = coverageMetrics;
  assert.equal(typeof recordingAverages, 'function', 'Provide shared coverage derivations');
  const exact = plot.points.find(point => point.id === 'tusz-scalp-eeg-2020-05-09');
  const poyo = plot.points.find(point => point.id.startsWith('poyo-'));
  assert.match(recordingAverages(poyo), /^Calculated average: >14\.2 h\/animal · — h\/session \(both values are lower bounds\)$/);
  for (const value of [undefined, null, 0, -1, 1.5, NaN, Infinity]) {
    if (value !== 1.5) assert.equal(recordingBar(value, 692), null);
    assert.match(recordingAverages({ ...exact, recordingCoverage: { ...exact.recordingCoverage, count: value, sessions: value } }), /— h\/patient.*— h\/session/);
  }
  for (const y of [undefined, null, 0, -1, NaN, Infinity]) {
    const point = { ...exact, y };
    assert.match(recordingAverages(point), /— h\/patient.*— h\/session/);
    assert.deepEqual(recordingReferences([point]), { hours: 0, contributors: 692, hoursLowerBound: false });
  }
  assert.equal(recordingBar(7, 0), null);
  assert.equal(recordingBar(7, Infinity), null);
  assert.match(recordingAverages({ ...poyo, y: 100.05 }), />100\.05 ÷ 7 h\/animal/);
});

test('JapanEEG uses dated v2 controlled-access evidence and a qualified calculated per-person range without redating the checkpoint', () => {
  const point = plot.points.find(point => point.id === 'japaneeg-scalp-eeg-2026-05-31');
  const series = plot.seriesNote;
  assert.match(series, /JapanEEG.*controlled access through Harvard Dataverse/);
  assert.doesNotMatch(series, /JapanEEG[^\n]*(?:open release|OpenNeuro|CC0)/i);
  assert.doesNotMatch(point.note, /OpenNeuro|CC0|open release/i);
  assert.match(point.note, /authors report controlled access through Harvard Dataverse/);
  assert.ok(point.supportingReferences.some(ref => ref.url === 'https://arxiv.org/html/2606.01264v2' && ref.title.includes('November 17, 2026')));
  assert.ok(point.supportingReferences.some(ref => ref.url === 'https://doi.org/10.7910/DVN/5RM3OT'));
  assert.equal(point.dateLabel, '2026-05-31 · publication');
  assert.equal(point.y, 1020);
  assert.equal(point.recordingCoverage.durationSummary, '≈60–814 h per participant (calculated from Table 4)');
  assert.match(point.recordingCoverage.detail, /P01.*813\.8.*P02.*146\.2.*P03.*60\.3/);
  assert.match(point.recordingCoverage.detail, /shared.*once/);
  assert.match(point.recordingCoverage.detail, /not.*continuous session/);
});


test('historical-golden normalization checks the exact coverage delta and rejects mutated or missing recording evidence', async () => {
  const { beforeRecordingCoverage } = await import('./helpers/recording-hours-coverage-baseline.mjs');
  const original = structuredClone(METRIC_CHART_EVIDENCE);
  const restored = beforeRecordingCoverage(METRIC_CHART_EVIDENCE);
  assert.deepEqual(METRIC_CHART_EVIDENCE, original, 'Normalization is non-mutating');
  assert.ok(restored[title].plots[0].points.every(point => !point.recordingCoverage));
  for (const [id] of expectedCoverage) {
    for (const mutate of [point => { point.recordingCoverage.count = 999; }, point => { delete point.recordingCoverage; }]) {
      const changed = structuredClone(METRIC_CHART_EVIDENCE);
      mutate(changed[title].plots[0].points.find(point => point.id === id));
      assert.throws(() => beforeRecordingCoverage(changed), undefined, `${id}: do not mask unexpected changes`);
    }
  }
  const id = 'braingate-t15-independent-use-2026-06-15';
  for (const evidence of [DRAFT_CHART_EVIDENCE, METRIC_CHART_EVIDENCE]) {
    const points = evidence[title].plots.flatMap(plot => plot.points);
    for (const field of Object.keys(points.find(point => point.id === id))) {
      const changed = structuredClone(evidence);
      const point = changed[title].plots.flatMap(plot => plot.points).find(point => point.id === id);
      point[field] = typeof point[field] === 'number' ? point[field] + 1 : `${point[field]} MUTATED`;
      assert.throws(() => beforeRecordingCoverage(changed), undefined, `${id}.${field}: exact addition, not an unchecked exclusion`);
    }
    for (const action of ['remove', 'duplicate']) {
      const changed = structuredClone(evidence);
      const plot = changed[title].plots.find(plot => plot.points.some(point => point.id === id));
      if (action === 'remove') plot.points = plot.points.filter(point => point.id !== id);
      else plot.points.push(structuredClone(plot.points.find(point => point.id === id)));
      assert.throws(() => beforeRecordingCoverage(changed), undefined, `${id}: ${action}`);
    }
  }
  for (const field of ['legend', 'seriesNote']) {
    const changed = structuredClone(METRIC_CHART_EVIDENCE);
    changed[title].plots[0][field] = field === 'legend' ? [] : 'MUTATED';
    assert.throws(() => beforeRecordingCoverage(changed), undefined, `BrainGate ${field}`);
  }
});
