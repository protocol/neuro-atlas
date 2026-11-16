import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { mount } from './modal-helpers.mjs';
import * as imported from '../src/data/bci-bitrate.ts';

globalThis.React = React;

const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_ROWS } = imported.default ?? imported;
const plot = BCI_BITRATE_EVIDENCE.plots[0];
const original = JSON.parse(readFileSync(new URL('../src/data/bci-bitrate.source.json', import.meta.url), 'utf8'));

const englishEntropyUrl = 'https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html';
test('speech inspection links the exact English-entropy conversion reference separately from each study', async () => {
  const speech = BCI_BITRATE_ROWS.filter(row => row.nativeRateUnit === 'words/minute');
  for (const row of BCI_BITRATE_ROWS) {
    const point = plot.points.find(point => point.id === row.id);
    if (!speech.includes(row)) {
      assert.equal(point.calculationSource, undefined);
      continue;
    }
    assert.equal(row.calculationSource?.url, englishEntropyUrl);
    assert.equal(point.calculationSource?.url, englishEntropyUrl);
    assert.match(point.calculationSource?.title ?? '', /Entropy and Redundancy in English/);
    assert.equal(point.sourceUrl, original.observations.find(p => p.id === row.id).nativeSource.url);
    assert.notEqual(point.sourceUrl, point.calculationSource.url);
  }
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: 'metric-panel-bci-bitrate' }), '#bci-information-transfer-over-time');
  try {
    const dialog = document.querySelector('dialog[open]');
    assert.equal(dialog.querySelector('h2').textContent, plot.title);
    const rows = [...dialog.querySelectorAll('.draft-plot-data tbody tr')];
    assert.equal(dialog.querySelectorAll('.draft-plot-data [data-calculation-source] a').length, 5);
    for (const row of speech) {
      const index = plot.points.findIndex(point => point.id === row.id);
      assert.equal(rows[index].querySelector('a').href, row.sourceUrl);
      assert.equal(rows[index].querySelector('[data-calculation-source] a').href, englishEntropyUrl);
      await act(async () => dialog.querySelector(`[data-source-observation="${row.id}"]`).focus());
      const tooltip = dialog.querySelector('[role=tooltip]');
      assert.equal(tooltip.querySelector('a').href, row.sourceUrl);
      assert.equal(tooltip.querySelector('[data-calculation-source] a').href, englishEntropyUrl);
    }
  } finally { await cleanup(); }
});


test('every chart coordinate has an explicit evidence basis rather than calling paper and inferred values the same thing', () => {
  assert.ok(BCI_BITRATE_ROWS, 'Expose the selected source/derivation behind every rendered coordinate');
  assert.equal(BCI_BITRATE_ROWS.length, 14);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'paper').length, 2);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'derived').length, 9);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'company').length, 1);
  assert.equal(BCI_BITRATE_ROWS.filter(p => p.basis === 'image').length, 2);
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
  assert.match(plot.scope, /9.*text-equivalent.*5 context.*2 paper.*1 company.*2 unresolved image/i);
  assert.match(plot.seriesNote, /not.*(measured neural|common.*benchmark)/i);
  for (const point of plot.points) assert.doesNotMatch(point.note, /in this worker|Do not|6-bits\/word/, 'Reader-facing notes must not repeat archived research instructions');
});


test('the unresolved upper-2015 mark retains useful candidate papers without claiming an attribution', () => {
  const expected = [
    ['2015-upper', /Gilja/, /Jarosiewicz/],
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

test('speech and handwriting conversions replay source-native inputs with their distinct declared models', () => {
  const speech = BCI_BITRATE_ROWS.filter(r => r.nativeRateUnit === 'words/minute');
  assert.equal(speech.length, 5);
  for (const row of speech) {
    const native = original.observations.find(p=>p.id===row.id).nativeSource;
    assert.equal(row.bps, native.rate.value * 5 / 60);
    assert.match(row.calculation, /5 assumed characters\/word × 1 assumed bit\/character/);
    assert.match(row.calculation, /No error penalty/);
  }
  const hand = BCI_BITRATE_ROWS.find(r=>r.id==='bci-slide-handwriting');
  assert.equal(hand.bps, 90 * Math.log2(28) / 60);
  assert.match(hand.calculation, /gross decoding pace/);
  assert.equal(plot.points.find(p=>p.id===hand.id).calculationSource, undefined);
  assert.match(plot.points.find(p=>p.id==='bci-slide-willett-speech').annotation, /gross WPM × 5 × 1 bit\/char/);
  assert.match(plot.points.find(p=>p.id==='bci-slide-pandarinath').annotation, /T5.*9×9/);
  assert.match(plot.points.find(p=>p.id==='bci-slide-stentrode').annotation, /P2 isolated/);
});
