import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { mount } from './modal-helpers.mjs';
import * as imported from '../src/data/bci-bitrate.ts';

const { BCI_BITRATE_CHART, BCI_BITRATE_EVIDENCE, BCI_BITRATE_ROWS } = imported.default ?? imported;
const plot = BCI_BITRATE_EVIDENCE.plots[0];
globalThis.React = React;

// Internal IDs and the compatible reference_year CSV column are not public prose.
const originHistory = /\boriginal\b|reference[- ](?:figure|image|year)|\banonymous\b|\breconstruct\w*|\bdigitiz\w*|\barchiv\w*|\bcandidate\w*|\bphoto\w*|\bassignment\w*|earlier models|preceding .*revision|speech-only revision|\bPR112\b|surface and authority|no outreach|production publication/i;
const assertCurrentCopy = (copy, surface) => assert.doesNotMatch(copy, originHistory, surface);

test('current BCI runtime, inspection, export and methods explain the chart rather than its origin', async () => {
  const pointCopy = plot.points.flatMap(point => [point.label, point.sourceTitle, point.dateLabel, point.note, point.annotation, point.exportAnnotation, point.exportNote, ...(point.candidateSources ?? []).flatMap(source => [source.title, source.note])]);
  const runtimeCopy = [BCI_BITRATE_CHART.axes, BCI_BITRATE_CHART.definition, BCI_BITRATE_CHART.constraint, BCI_BITRATE_EVIDENCE.summary, BCI_BITRATE_EVIDENCE.gapReason, plot.xLabel, plot.yLabel, plot.observationBasis, plot.scope, plot.seriesNote, plot.referenceTrendline.label, plot.referenceTrendline.note, plot.exportPointKeyNote, ...pointCopy].join('\n');
  assertCurrentCopy(runtimeCopy, 'Public chart model');
  assert.equal(BCI_BITRATE_EVIDENCE.gapReason, undefined, 'Remove the obsolete Context paragraph entirely');
  assert.equal(plot.xLabel, 'Year');
  assert.match(plot.seriesNote, /publication|disclosure/i);
  assert.match(plot.seriesNote, /2015.*2014/);
  assert.match(plot.seriesNote, /2021.*2020/);
  assert.match(plot.seriesNote, /2025.*2026/);
  assert.match(plot.referenceTrendline.note, /R² in log10 space/);
  assert.match(plot.referenceTrendline.note, /summarizes heterogeneous model-derived text-output rates across the observed years/);
  assert.match(plot.exportPointKeyNote, /speech 1 bit\/char × 5 char\/word; other text 28-symbol/);

  for (const row of BCI_BITRATE_ROWS) {
    const point = plot.points.find(point => point.id === row.id);
    assert.equal(point.y, row.bps);
    assert.match(point.note, row.fitIncluded ? /fit included/i : /excluded from fit/i);
    if (row.basis === 'image') {
      assert.equal(point.qualifier, '≈');
      assert.match(point.note, /unverified/i);
      assert.match(point.exportAnnotation, /≈.*unverified/i);
      assert.match(point.sourceTitle, /unverified/i);
      assert.equal(row.fitIncluded, false);
      assert.equal(point.candidateSources, undefined, 'Speculative sources stay outside current observations');
    }
    if (row.fitIncluded) {
      assert.equal(point.qualifier, '≈');
      assert.match(point.note, /PL R&D estimate/);
      assert.ok(point.sourceUrl && point.quote && row.nativeRateValue && row.calculation);
    }
  }

  for (const path of ['docs/bci-bitrate.md', 'docs/bci-study-data/README.md', 'docs/bci-study-data/reproduce_fit.py']) {
    const copy = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assertCurrentCopy(copy, path);
    if (path.endsWith('.md')) {
      assert.match(copy, /source.*unverified|numerical.*unverified/i);
      assert.match(copy, /1 assumed bit\/character/);
      assert.match(copy, /log2\(28\)/);
      assert.match(copy, /context-dependent/);
      assert.match(copy, /No (extra|additional) WER\/CER/i);
      assert.ok(copy.includes('https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html'));
    }
  }
  const csv = JSON.parse(execFileSync('python3', ['-c', 'import csv,json; print(json.dumps(list(csv.DictReader(open("docs/bci-study-data/chart-provenance.csv", newline="", encoding="utf-8")))))'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }));
  assert.equal(csv.length, 14);
  for (const row of csv) {
    assert.equal(Object.hasOwn(row, 'original_photo_bps'), false);
    assert.equal(Object.hasOwn(row, 'candidate_sources_unconfirmed'), false);
    assertCurrentCopy(Object.entries(row).filter(([key]) => key !== 'id').map(([,value]) => value).join('\n'), row.id);
    if (row.id === 'bci-slide-kennedy-bakay' || row.id.endsWith('2015-upper')) assert.match(row.value_basis, /unverified/i);
  }

  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: 'metric-panel-bci-bitrate' }), '#bci-information-transfer-over-time');
  let output;
  try {
    const dialog = document.querySelector('dialog[open]');
    assert.equal(dialog.querySelector('h2').textContent, plot.title);
    const table = dialog.querySelector('.draft-plot-data');
    assertCurrentCopy(table.textContent, 'Native point table');
    assert.equal(table.querySelectorAll('tbody tr').length, 14);
    for (const point of plot.points) {
      await act(async () => dialog.querySelector(`[data-source-observation="${point.id}"]`).focus());
      const tooltip = dialog.querySelector('[role=tooltip]');
      assert.ok(tooltip, point.id);
      assertCurrentCopy(tooltip.textContent, 'Native tooltip: ' + point.id);
      if (point.sourceUrl) assert.equal(tooltip.querySelector('a').href, point.sourceUrl);
    }
    const spec = (await whenChartRegistered('metric-panel-bci-bitrate')).getChart();
    output = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' });
    assertCurrentCopy(output.window.document.documentElement.textContent, 'Native export, including source description');
    assert.equal(output.window.document.querySelectorAll('[data-export-point-key-entry]').length, 14);
    const visible = [...output.window.document.querySelectorAll('text')].map(node => node.textContent).join(' ');
    assert.match(visible, /Kennedy.*≈0\.24.*unverified/);
    assert.match(visible, /Cursor.*≈0\.9.*unverified/);
    assert.match(visible, /R²\(log10\) = 0\.658/);
  } finally { output?.window.close(); await cleanup(); }
});
