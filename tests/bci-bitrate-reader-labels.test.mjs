import test from 'node:test';
import assert from 'node:assert/strict';
import * as imported from '../src/data/bci-bitrate.ts';
const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_ROWS } = imported.default ?? imported;
const plot = BCI_BITRATE_EVIDENCE.plots[0];
test('PL R&D owns the five speech estimates while authors retain their own estimate attribution', () => {
  const speech = BCI_BITRATE_ROWS.filter(p => p.basis === 'derived' && p.id !== 'bci-slide-handwriting');
  assert.equal(speech.length, 5);
  for (const row of speech) {
    assert.equal(row.basisLabel, 'PL R&D estimate');
    const point = plot.points.find(p => p.id === row.id);
    assert.match(point.annotation, /PL R&D estimate/);
    assert.match(point.note, /PL R&D estimate/);
    assert.doesNotMatch(point.note, /Atlas (illustration|assumption)|Atlas-calculated/);
  }
  assert.equal(BCI_BITRATE_ROWS.find(p => p.id === 'bci-slide-handwriting').basisLabel, 'Author estimate');
  assert.doesNotMatch(plot.seriesNote, /Atlas-calculated/);
});
test('the four unnamed original dots explicitly say source unconfirmed rather than pretending to be reports', () => {
  const unknown = plot.points.filter(p => p.candidateSources);
  assert.equal(unknown.length, 4);
  for (const point of unknown) {
    assert.match(point.label, /^Cursor control [A-D] · source unconfirmed$/);
    assert.ok(point.annotation.startsWith(point.label));
    assert.equal(point.sourceUrl, undefined);
    assert.match(point.note, /not confirmed assignments/);
  }
});
