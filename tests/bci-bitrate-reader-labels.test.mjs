import test from 'node:test';
import assert from 'node:assert/strict';
import * as imported from '../src/data/bci-bitrate.ts';
const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_ROWS } = imported.default ?? imported;
const plot = BCI_BITRATE_EVIDENCE.plots[0];

test('PL R&D owns all nine mixed-convention text estimates, including handwriting and selected spelling papers', () => {
  const converted = BCI_BITRATE_ROWS.filter(p => p.basis === 'derived');
  assert.equal(converted.length, 9);
  for (const row of converted) {
    assert.equal(row.basisLabel, 'PL R&D estimate');
    const point = plot.points.find(p => p.id === row.id);
    assert.match(point.annotation, /PL R&D estimate/);
    assert.match(point.note, /PL R&D estimate/);
    assert.doesNotMatch(point.note, /Atlas (illustration|assumption)|Atlas-calculated|Author estimate/);
  }
  assert.doesNotMatch(plot.seriesNote, /Atlas-calculated|author.*approximation/);
});

test('only the upper-2015 point lacks a source link and speculative sources are not rendered', () => {
  const unknown = plot.points.filter(p => !p.sourceUrl);
  assert.equal(unknown.length, 1);
  assert.ok(plot.points.every(p => p.candidateSources === undefined));
  const point = unknown[0];
  assert.equal(point.id, 'bci-slide-unlabeled-cursor-2015-upper');
  assert.match(point.label, /^Cursor control A · source unverified$/);
  assert.ok(point.annotation.startsWith(point.label));
  assert.equal(point.sourceUrl, undefined);
  assert.match(point.note, /source-native numerical rate unverified/);
});
