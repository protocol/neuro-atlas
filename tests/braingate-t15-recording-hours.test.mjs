import test from 'node:test';
import { beforeScientificCopy } from './helpers/sitewide-copy-scientific.mjs';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { recordingAverages } from '../src/data/recording-hours-coverage.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { readFileSync } from 'node:fs';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const title = 'Neural recording hours collected over time';
const id = 'braingate-t15-independent-use-2026-06-15';
const paper = 'https://www.nature.com/articles/s41591-026-04414-6';
const pair = '≈3,800 h · 1 participant';
const average = 'Calculated average: ≈3,800.0 h/participant · — h/session (count not reported)';

test('BrainGate T15 is one qualified non-public recording observation throughout the existing chart and native export path', async () => {
  const evidence = METRIC_CHART_EVIDENCE[title];
  assert.equal(evidence.plots.length, 1, 'Extend the existing consolidated chart');
  const plot = evidence.plots[0];
  const matches = plot.points.filter(point => point.id === id);
  assert.equal(matches.length, 1, 'Include the source-qualified BrainGate T15 observation');
  const point = matches[0];
  assert.deepEqual([point.y, point.qualifier, point.dateLabel], [3800, '≈', '2026-06-15 · publication']);
  const publication = Date.UTC(2026, 5, 15);
  assert.equal(point.x, 2026 + (publication - Date.UTC(2026, 0, 1)) / (Date.UTC(2027, 0, 1) - Date.UTC(2026, 0, 1)));
  assert.deepEqual([point.recordingCoverage.count, point.recordingCoverage.unit, point.recordingCoverage.sessions], [1, 'participants', undefined]);
  assert.equal(recordingAverages(point), average);
  assert.equal(point.sourceUrl, paper);
  assert.match(point.sourceTitle, /Card et al\..*2026/);
  assert.match(point.quote, /more than 3,800\s*h of BCI use/);
  assert.match(point.note, /approximate recording-duration basis across speech and cursor operation/);
  assert.match(point.note, /session data were saved except during privacy mode/);
  assert.match(point.note, /exact retained recording duration is unspecified/);
  assert.match(point.note, /neural data and speech transcripts.*participant privacy/);
  assert.ok(point.supportingReferences.some(ref => ref.url === 'https://github.com/Neuroprosthetics-Lab/NatMed_independent_personal_use' && /figure.*statistical summaries/i.test(ref.role)));
  assert.equal(new Set(plot.legend.map(entry => entry.color)).size, plot.legend.length);
  assert.equal(plot.referenceTrendline, undefined);
  assert.equal(plot.referenceTrendlines, undefined);
  assert.ok(plot.connections.every(connection => !connection.pointIds.includes(id)), 'Keep this singleton outside the overlapping TUSZ path');
  const sourcePlot = DRAFT_CHART_EVIDENCE[title].plots.find(source => source.points.some(p => p.id === id));
  assert.match(sourcePlot.scope, /One human participant.*intracortical speech and cursor/);
  assert.match(sourcePlot.scope, /neural data and transcripts are non-public; figure and statistical summaries are public/);
  assert.doesNotMatch(JSON.stringify(sourcePlot), /largest|personal correspondence|author email|privacy-mode subtraction/i);

  const cleanup = await mount(React.createElement(DraftChartsSection));
  let imageDom;
  try {
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const dialog = document.querySelector('dialog[open]');
    const mark = dialog.querySelector(`[data-source-observation="${id}"]`);
    assert.ok(mark, 'The real consolidated chart renders the new observation');
    assert.ok(mark.getAttribute('aria-label').includes(pair));
    assert.ok(mark.getAttribute('aria-label').includes(average));
    const coverageRow = dialog.querySelector(`[data-recording-coverage-row="${id}"]`);
    assert.ok(coverageRow.textContent.includes(pair));
    assert.ok(coverageRow.textContent.includes(average));
    assert.match(coverageRow.textContent, /Duration basis: reported BCI-use time/);
    const sourceRow = [...dialog.querySelectorAll('tbody tr')].find(row => row.querySelector(`a[href="${paper}"]`));
    assert.ok(sourceRow.textContent.includes(pair));
    assert.ok(sourceRow.textContent.includes(point.note));
    await act(async () => mark.dispatchEvent(new Event('focusin', { bubbles: true })));
    assert.ok(dialog.querySelector('[role=tooltip]').textContent.includes(pair));
    assert.ok(dialog.querySelector('[role=tooltip]').textContent.includes(point.note));

    const download = dialog.querySelector('[data-selected-plot-json]');
    assert.ok(download, 'The existing selected-data download must include the recording chart');
    assert.equal(download.download, 'neuro-atlas-recording-hours.json');
    const downloaded = JSON.parse(decodeURIComponent(download.getAttribute('href').split(',')[1]));
    assert.deepEqual(downloaded.points.find(p => p.id === id), point, 'Download all scientific qualifiers and source fields');
    assert.deepEqual(downloaded.points.map(p => p.id), plot.points.map(p => p.id));

    const spec = (await whenChartRegistered('metric-recording-hours')).getChart();
    assert.equal(spec.svg, dialog.querySelector('svg.draft-plot-svg'), 'Exercise the actual mounted export callback');
    const key = spec.pointKey.find(entry => entry.pointId === id);
    assert.equal(key.label, `BrainGate T15 · ${pair} · Duration basis: reported BCI-use time`);
    assert.deepEqual(key.details, [point.dateLabel, average]);
    assert.deepEqual(key.bars.map(bar => bar.fraction), [3800 / 50000, 1 / 692]);
    assert.ok(key.bars.every(bar => !bar.lowerBound), 'Approximation is distinct from a strict retained-duration lower bound');
    const image = buildChartImage(spec, window.location.href);
    assert.equal(image.url, new URL('/field-velocity/neural-recording-hours-selected-datasets', window.location.href).href);
    imageDom = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = imageDom.window.document;
    const painted = doc.querySelector(`[data-export-point-id="${id}"]`);
    const paintedText = [...painted.querySelectorAll(':scope > text')].map(text => text.textContent).join(' ');
    assert.ok(paintedText.includes(pair), 'The raster input visibly preserves approximation and the matched count');
    assert.match(paintedText, /Duration basis: reported BCI-use time/);
    assert.ok(paintedText.includes(average));
    const metadata = doc.querySelector('desc').textContent;
    assert.ok(metadata.includes(paper));
    assert.match(metadata, /session data were saved except during privacy mode/);
    assert.match(metadata, /neural data and transcripts are non-public/);
    assert.doesNotMatch(metadata, /personal correspondence|author email|largest single/i);
  } finally { imageDom?.window.close(); await cleanup(); }
});

test('BrainGate compatibility normalization removes only the exact additive checkpoint without mutating scientific data', async () => {
  const helpers = await import('./helpers/recording-hours-coverage-baseline.mjs');
  assert.equal(typeof helpers.beforeBrainGateAddition, 'function');
  const original = structuredClone(METRIC_CHART_EVIDENCE);
  const normalized = helpers.beforeBrainGateAddition(METRIC_CHART_EVIDENCE);
  const before = beforeScientificCopy(original)[title].plots[0];
  const after = normalized[title].plots[0];
  assert.deepEqual(after.points, before.points.slice(0, -1));
  assert.deepEqual(after.legend, before.legend.slice(0, -1));
  assert.deepEqual(METRIC_CHART_EVIDENCE, original, 'Normalization must not change the live chart');
  const altered = structuredClone(original);
  altered[title].plots[0].points.find(point => point.id === id).y += 1;
  assert.throws(() => helpers.beforeBrainGateAddition(altered), /Exact BrainGate T15 metric addition/);
});

test('BrainGate public figure summaries appear in the classified source directory', () => {
  const catalog = JSON.parse(readFileSync(new URL('../src/data/methodology-sources.json', import.meta.url), 'utf8'));
  const point = METRIC_CHART_EVIDENCE[title].plots[0].points.find(point => point.id === id);
  for (const ref of point.supportingReferences) {
    const entries = catalog.reference.filter(([url]) => url === ref.url);
    assert.equal(entries.length, 1, `Classify the exact public summary source: ${ref.url}`);
    assert.match(entries[0][1], /figure.*statistical.*summar/i);
  }
});
