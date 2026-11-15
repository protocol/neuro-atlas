import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as imported from '../src/data/bci-bitrate.ts';

const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_ROWS } = imported.default ?? imported;
const plot = BCI_BITRATE_EVIDENCE.plots[0];
const original = JSON.parse(readFileSync(new URL('../src/data/bci-bitrate.source.json', import.meta.url), 'utf8'));

test('every chart coordinate has an explicit evidence basis rather than calling paper and inferred values the same thing', () => {
  assert.ok(BCI_BITRATE_ROWS, 'Expose the selected source/derivation behind every rendered coordinate');
  assert.equal(BCI_BITRATE_ROWS.length, 14);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'paper').length, 2);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'derived').length, 6);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'company').length, 1);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'image').length, 5);
  for (const row of BCI_BITRATE_ROWS) {
    const point = plot.points.find(p => p.id === row.id);
    assert.equal(point.y, row.bps);
    assert.ok(point.annotation.includes(row.basisLabel), row.id);
    assert.ok(point.note.includes(row.basisLabel), row.id);
    if (row.basis === 'derived') assert.ok(row.calculation && row.reportedResult && point.qualifier === '≈', row.id);
    if (row.basis === 'image') assert.equal(row.bps, original.observations.find(p => p.id === row.id).approximateBps);
  }
  assert.equal(plot.points.find(p=>p.id==='bci-slide-pandarinath').y,4.16);
  assert.equal(plot.points.find(p=>p.id==='bci-slide-stentrode').y,0.46);
  assert.equal(plot.points.find(p=>p.id==='bci-slide-neuralink').y,8);
  assert.match(plot.scope, /2 paper.*6.*(calculated|derived).*1 company.*5 image/i);
  assert.match(plot.seriesNote, /not.*(measured neural|common.*benchmark)/i);
  for (const point of plot.points) assert.doesNotMatch(point.note, /in this worker|Do not|6-bits\/word/, 'Reader-facing notes must not repeat archived research instructions');
});


test('all four anonymous marks show named candidate papers without claiming confirmed attributions', () => {
  const expected = [
    ['2015-upper', /Gilja/, /Jarosiewicz/],
    ['2015-lower', /Bacher/],
    ['2016', /Vansteensel/],
    ['2018', /Milekovic/, /Nuyujukian/],
  ];
  for (const [suffix, ...names] of expected) {
    const point = plot.points.find(p => p.id.endsWith('cursor-'+suffix));
    assert.equal(point.sourceUrl, undefined);
    assert.ok(point.candidateSources?.length, 'Provide useful leads for '+point.id);
    for (const name of names) assert.ok(point.candidateSources.some(c => name.test(c.title)));
    assert.ok(point.candidateSources.every(c=>/^https:\/\//.test(c.url) && c.note));
    assert.match(point.annotation, /Image estimate/);
    assert.ok(point.note.length < 300, 'Put useful candidate links before an unnecessarily long unresolved-source explanation');
    assert.equal(point.y, original.observations.find(p => p.id === point.id).approximateBps);
  }
});

test('speech calculations replay from original reported WPM and a declared five-bit convention', () => {
  for (const row of BCI_BITRATE_ROWS.filter(r=>r.basis==='derived' && r.id!=='bci-slide-handwriting')) {
    const native = original.observations.find(p=>p.id===row.id).nativeSource;
    assert.equal(row.bps, native.rate.value * 5 / 60);
    assert.match(row.calculation, /5 assumed information bits\/word/);
    assert.match(row.calculation, /No error adjustment/);
  }
  const hand = BCI_BITRATE_ROWS.find(r=>r.id==='bci-slide-handwriting');
  assert.equal(hand.bps, 16.06/2.6);
  assert.match(hand.calculation, /authors.*technical report/);
  assert.ok(plot.points.find(p=>p.id===hand.id).calculationSource.url.includes('stacks.stanford.edu'));
  assert.match(plot.points.find(p=>p.id==='bci-slide-willett-speech').annotation, /5 assumed bits\/word/);
  assert.match(plot.points.find(p=>p.id==='bci-slide-pandarinath').annotation, /T5.*9×9/);
  assert.match(plot.points.find(p=>p.id==='bci-slide-stentrode').annotation, /P2 isolated/);
});
