import test from 'node:test';
import assert from 'node:assert/strict';
import * as imported from '../src/data/bci-bitrate.ts';
const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_ROWS } = imported.default ?? imported;
const plot = BCI_BITRATE_EVIDENCE.plots[0];

test('PL R&D owns all nine uniform text estimates, including handwriting and selected spelling papers', () => {
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

test('only the upper-2015 unresolved active dot retains assignment-unconfirmed candidate links', () => {
  const unknown = plot.points.filter(p => p.candidateSources);
  assert.equal(unknown.length, 1);
  const point = unknown[0];
  assert.equal(point.id, 'bci-slide-unlabeled-cursor-2015-upper');
  assert.match(point.label, /^Cursor control A · source unconfirmed$/);
  assert.ok(point.annotation.startsWith(point.label));
  assert.equal(point.sourceUrl, undefined);
  assert.match(point.note, /not confirmed assignments/);
});
