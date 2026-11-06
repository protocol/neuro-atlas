import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, RETIRED_METRIC_PLOT_IDS, isVisibleMetric } from '../src/data/metric-chart-visibility.ts';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
const bytes = readFileSync('src/data/draft-chart-evidence.json');
const raw = JSON.parse(bytes);
const charts = METRIC_CHARTS.filter(isVisibleMetric);
const plots = charts.flatMap(chart => METRIC_CHART_EVIDENCE[chart.title].plots);
const plot = id => plots.find(item => item.id === id);
const point = id => plots.flatMap(item => item.points).find(item => item.id === id);
const omit = (object, fields) => Object.fromEntries(Object.entries(object).filter(([key]) => !fields.includes(key)));
const digest = value => createHash('sha256').update(value).digest('hex');
// Pin the actual pre-edit scientific contract, independently of the rewritten prose.
function scientificFields(evidence) {
  return Object.fromEntries(Object.entries(evidence).map(([title, item]) => [title, {
    ...omit(item, ['summary', 'gapReason', 'plots', 'timeline']),
    plots: item.plots.map(item => ({ ...omit(item, ['scope', 'seriesNote', 'points']), points: item.points.map(item => omit(item, ['note', 'exportNote'])) })),
    ...(item.timeline ? { timeline: { events: item.timeline.events.map(item => omit(item, ['note'])) } } : {}),
  }]));
}

test('curated copy preserves raw evidence bytes, coordinates, dates, units, source quotations and presentation identities', () => {
  assert.equal(digest(bytes), 'cd4673696ac960651b2ffd01fe11f080e6d15ef60a700e0fff3ed7f88c6a1ecd');
  assert.equal(digest(JSON.stringify(scientificFields(DRAFT_CHART_EVIDENCE))), 'd476c922ad89dd80af8a7a34e2a45471e9fb53bf0431cc086c6640656523a3e9');
  assert.equal(digest(JSON.stringify(scientificFields(METRIC_CHART_EVIDENCE))), '47b2ad7f80c7ef07d95a82df0c17b712890007cb0a7f343872d861134dd0951b');
  assert.deepEqual(plots.map(item => [item.id, item.points.length]), [
    ['tissue-cm3', 7], ['largest-connectome-neurons', 5], ['largest-connectome-synapses', 4], ['acquisition-rates', 2],
    ['pathfinder-nerl', 1], ['connectomics-roboem-human-split-merge', 12], ['proofreading-effort', 2], ['neuralink-cumulative', 7],
    ['recording-hours', 12], ['paired-manual', 3], ['public-data-size', 6], ['flyvis-contrast', 2], ['neuroai-imagenet', 6], ['acquisition-economics', 9],
  ]);
  assert.equal(charts.length, 13);
  assert.equal(plots.reduce((sum, item) => sum + item.points.length, 0), 78);
  assert.deepEqual(METRIC_CHART_EVIDENCE['Demonstrated applications enabled by connectomics over time'].timeline.events.map(item => item.id), ['application-0', 'application-2']);
});

test('unsupported and retired evidence remains archived verbatim and unrendered', () => {
  for (const [title, item] of Object.entries(raw)) {
    if (item.status === 'gap') assert.deepEqual(DRAFT_CHART_EVIDENCE[title], item);
    for (const archived of item.plots.filter(item => RETIRED_METRIC_PLOT_IDS.has(item.id))) {
      assert.deepEqual(DRAFT_CHART_EVIDENCE[title].plots.find(item => item.id === archived.id), archived);
      assert.equal(plots.some(item => item.id === archived.id), false);
    }
  }
});

test('all visible curated descriptions state the measure positively and impersonally', () => {
  const fields = [];
  for (const chart of charts) {
    const evidence = METRIC_CHART_EVIDENCE[chart.title];
    for (const key of ['definition', 'constraint', 'metricsNote']) if (chart[key]) fields.push([`${chart.title}.${key}`, chart[key]]);
    for (const key of ['summary', 'gapReason']) if (evidence[key]) fields.push([`${chart.title}.${key}`, evidence[key]]);
    for (const item of evidence.plots) {
      for (const key of ['scope', 'seriesNote']) if (item[key]) fields.push([`${item.id}.${key}`, item[key]]);
      for (const point of item.points) for (const key of ['note', 'exportNote']) if (point[key]) fields.push([`${point.id}.${key}`, point[key]]);
    }
    if (evidence.timeline) {
      fields.push(['timeline.scope', evidence.timeline.scope]);
      for (const event of evidence.timeline.events) fields.push([`${event.id}.note`, event.note]);
    }
  }
  for (const [name, text] of fields) {
    // Verbatim source quotations can retain first person and negative phrasing.
    const editorial = text.replace(/“[^”]*”/g, '');
    assert.doesNotMatch(editorial, /\b(?:we|our|not|neither|no)\b|do not|freshness rules|unwired|backfill|recommended principal|source audit|unresolved.*citation/i, name);
  }
  for (const chart of charts) assert.ok(METRIC_CHART_EVIDENCE[chart.title].summary.length <= 240, chart.title);
});

test('mapping descriptions retain specimen, completeness, release timing and contact-count scope', () => {
  assert.match(plot('tissue-cm3').scope, /sample bounds.*imaged.*neuropil/i);
  assert.match(point('bock-mouse-imaged-2011-01-01').note, /450 × 350 × 52.*0\.00819 mm³/);
  assert.match(point('h01-human-imaged-2021-06-01').note, /selected cells proofread.*1\.05-mm³.*same specimen/i);
  assert.match(point('flywire-fly-neuropil-2024-01-01').note, /FAFB/);
  assert.match(point('lee-reid-2016-neuronal-targets').note, /boundary-truncated.*450 × 450 × 50.*450 × 450 × 150/);
  assert.match(point('flywire-neurons').note, /44\.7%.*postsynapse attachment/i);
  assert.match(plot('largest-connectome-synapses').scope, /paired.*contacts.*automatically.*clefts/i);
  assert.match(point('microns-synapses').note, /35 and 65.*524.*186.*337/);
});

test('cost and throughput retain acquisition boundaries, estimates, resolution and prospective scope', () => {
  assert.match(plot('acquisition-rates').scope, /acquisition.*resolution.*lower bound/i);
  assert.match(point('fib-sem-2017').note, /100-day.*interruptions.*8×8×8 nm/);
  assert.match(point('autotem-2020').note, />70.*40 nm/);
  assert.match(plot('acquisition-economics').scope, /acquisition.*resolution.*PEEM.*prospective/i);
  assert.match(plot('acquisition-economics').seriesNote, /10,000,000.*Table A1.*Voxels\/\$.*Figure 2/);
  assert.match(point('exllsm2019').note, /1,000,000,000/);
  assert.match(point('peem2024').note, /2024.*2025/);
  assert.match(point('peem2024').note, /8x8x30 nm.*prospective/);
  assert.match(point('bdtem2024').note, /0\.3 Gpixel\/s.*projection/);
  assert.match(charts.find(item => item.title === 'Connectomics imaging cost efficiency').constraint, /preparation.*reconstruction.*storage.*proofreading/i);
});

test('benchmark and effort descriptions keep fixed evaluations, test subsets and version-specific labor', () => {
  assert.match(plot('connectomics-roboem-human-split-merge').scope, /2024.*H01.*Si150L4.*SBEM/);
  assert.match(plot('connectomics-roboem-human-split-merge').seriesNote, /acquisition.*segmentation.*test axons.*correction/i);
  assert.match(point('roboem-2024-human-multisem-1').note, /A2:C2.*5.*1\.4 mm.*150 µm/);
  assert.match(plot('connectomics-roboem-human-split-merge').seriesNote, />2\.2 µm.*0\.5.*1.*≤2\.5 µm.*90%/);
  assert.match(point('pathfinder-nerl-2025').note, /nERL = ERL.*maximum ERL.*4,284 mm/);
  const effort = METRIC_CHART_EVIDENCE['Human proofreading burden over time'];
  assert.match(effort.summary, /1,433.*84,035.*1\.7%.*varying/);
  assert.match(effort.gapReason, /2,451.*3,740.*3,600.*versions/i);
  assert.match(plot('proofreading-effort').scope, /person-years.*completeness/i);
});

test('cohort and recording descriptions retain overlapping samples, source dates and duration definitions', () => {
  assert.match(point('braingate-documented-cohort-2023-01-13').note, /2004–December 2021.*2023.*overlap/i);
  assert.match(point('neuralink-cumulative-2026-01-28').note, /18 of the subsequent 20.*Jan 28.*Feb 2/);
  assert.match(point('paradromics-connect-one-2026-06-17').note, /disclosure.*surgery.*2025/i);
  assert.match(plot('recording-hours').scope, /release.*publication.*disclosure.*acquisition.*overlap/i);
  assert.match(point('neuralink-reported-hours-2026-10-01').note, /participant-specific.*session.*quality.*9,000/i);
  assert.match(point('tusz-scalp-eeg-2020-05-09').note, /held-out.*overlap/i);
  assert.match(point('ajile12-intracranial-2022-01-27').note, /500 Hz.*64 electrodes.*quality/i);
  assert.match(point('poyo-primate-training-2023-10-24').note, /seven.*158.*reused/i);
  assert.match(point('japaneeg-scalp-eeg-2026-05-31').note, /submission.*upload.*once/i);
});

test('paired datasets, storage footprints, model validation and application events retain comparison conditions', () => {
  assert.match(point('microns2025-manual').note, /37,364.*83%.*overlap/i);
  assert.match(point('malecns-jpeg-inventory-2026').note, /50,910,260,068,834.*27,594.*633-byte.*11 resolution.*44,428,865,656,516/);
  assert.match(plot('public-data-size').scope, /sample size, resolution, encoding and included products/);
  assert.match(plot('flyvis-contrast').scope, /32\/32.*100%.*30\/32.*93\.75%/);
  assert.match(METRIC_CHART_EVIDENCE['Simulation/emulation fidelity over time'].summary, /held-out.*contrast/i);
  assert.match(plot('neuroai-imagenet').scope, /224×224.*32-bit.*45 nm.*5.*1/);
  assert.match(METRIC_CHART_EVIDENCE['NeuroAI performance–cost frontier over time'].gapReason, /cross-sectional.*operation/i);
  assert.match(METRIC_CHART_EVIDENCE['Demonstrated applications enabled by connectomics over time'].timeline.scope, /publication.*first-use.*uncertain/i);
});

test('detail/source-table rendering consumes the concise projection and preserves exact source quotations', () => {
  for (const item of plots) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: item })));
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelector('.draft-plot-scope').textContent, item.scope, item.id);
      const rows = [...doc.querySelectorAll('tbody tr')];
      assert.equal(rows.length, item.points.length);
      rows.forEach((row, index) => {
        assert.equal(row.querySelector('blockquote').textContent, item.points[index].quote);
        assert.equal(row.querySelector('td:last-child > p')?.textContent, item.points[index].note);
      });
    } finally { dom.window.close(); }
  }
  const timeline = METRIC_CHART_EVIDENCE['Demonstrated applications enabled by connectomics over time'].timeline;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftEventTimeline, { timeline })));
  try {
    assert.equal(dom.window.document.querySelector('.draft-plot-scope').textContent, timeline.scope);
    assert.deepEqual([...dom.window.document.querySelectorAll('[data-draft-event] > p:not(.draft-event-date)')].map(item => item.textContent), timeline.events.map(item => item.note));
  } finally { dom.window.close(); }
});
