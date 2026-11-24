import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const pairedKeys = [
  'Neuralink · >50,000 h · participants not disclosed',
  'TUSZ v1.0.0 · 170 h · 114 patients · 510 sessions',
  'TUSZ v1.1.0 · 425 h · 246 patients · 686 sessions',
  'TUSZ v1.2.0 · 504 h · 315 patients · 822 sessions',
  'TUSZ v1.3.0 · 651 h · 364 patients · 970 sessions',
  'TUSZ v1.4.0 · 651 h · 364 patients · 969 sessions',
  'TUSZ v1.5.0 · 1,074 h · 692 patients · 1,661 sessions',
  'TUSZ v1.5.1 · 1,074 h · 692 patients · 1,575 sessions',
  'TUSZ v1.5.2 · 1,074 h · 692 patients · 2,608 sessions',
  'AJILE12 frozen release · 1,280 h · 12 participants',
  'POYO-1 training corpus · >100 h · 7 nonhuman primates · >158 sessions',
  'JapanEEG descriptor · 1,020 h · 3 participants · ≈60–814 h per participant (calculated from Table 4)',
  'BrainGate T15 · ≈3,800 h · 1 participant · Duration basis: reported BCI-use time',
];

test('the actual recording-hours export callback retains every paired value and strict bound in the visible PNG key and full metadata', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection));
  let output;
  try {
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const dialog = document.querySelector('dialog[open]');
    const spec = (await whenChartRegistered('metric-recording-hours')).getChart();
    assert.equal(spec.svg, dialog.querySelector('svg.draft-plot-svg'), 'Use the real open chart, not a hand-built specification');
    assert.equal(spec.pointKey?.length, 13, 'Every original observation and the BrainGate addition need a visible paired key');
    assert.deepEqual(spec.pointKey.map(entry => entry.label), pairedKeys);
    const before = [...spec.svg.querySelectorAll('[data-source-observation]')].map(mark => [mark.dataset.sourceObservation, mark.getAttribute('cx'), mark.getAttribute('cy')]);
    const image = buildChartImage(spec, window.location.href);
    output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    const keys = [...doc.querySelectorAll('[data-export-point-key-entry]')].map(entry => [...entry.querySelectorAll(':scope > text:not([data-export-point-key-detail])')].map(text => text.textContent).join(' '));
    assert.deepEqual(keys, pairedKeys, 'These are rendered SVG text nodes consumed by the real PNG rasterizer');
    assert.match(doc.querySelector('[data-export-point-key]').textContent, /Recording coverage/);
    const metadata = doc.querySelector('desc').textContent;
    for (const key of pairedKeys) assert.ok(metadata.includes(key), key);
    assert.match(metadata, /P01 ≈813\.8 h, P02 ≈146\.2 h, P03 ≈60\.3 h/);
    assert.match(metadata, /participant-specific.*pretrain/);
    assert.match(metadata, /held-out evaluation/);
    assert.match(metadata, /reused training data/);
    assert.match(metadata, /controlled access through Harvard Dataverse/);
    assert.match(metadata, /https:\/\/arxiv.org\/html\/2606.01264v2/);
    assert.doesNotMatch(metadata, /OpenNeuro|CC0|open release claim/);
    assert.deepEqual([...spec.svg.querySelectorAll('[data-source-observation]')].map(mark => [mark.dataset.sourceObservation, mark.getAttribute('cx'), mark.getAttribute('cy')]), before);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 13);
    assert.ok(image.height < 2600, 'Keep a compact export, not a source-note dump');
    assert.ok(image.url.endsWith('#neural-recording-hours-selected-datasets'), 'Retain the current canonical shared chart URL');
  } finally { output?.window.close(); await cleanup(); }
});

test('the raster input paints proportionate bars, calculated averages and the exact overlap badge key at desktop and phone plot widths', async () => {
  const observers = [];
  const previous = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.target = null; }
  };
  let cleanup;
  try {
    cleanup = await mount(React.createElement(DraftChartsSection));
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const dialog = document.querySelector('dialog[open]');
    const figure = dialog.querySelector('figure.draft-plot');
    const observer = observers.find(o => o.target === figure);
    assert.ok(observer, 'Resize the mounted export plot, not an export-only fixture');
    const counts = [];
    for (const width of [1100, 322]) {
      await act(async () => observer.callback([{ contentRect: { width } }]));
      const spec = (await whenChartRegistered('metric-recording-hours')).getChart();
      assert.equal(Number(spec.svg.getAttribute('viewBox').split(' ')[2]), width);
      const badgeMap = new Map([...spec.svg.querySelectorAll('[data-annotation-key]')].map(badge => [badge.dataset.annotationKey, badge.textContent]));
      counts.push(badgeMap.size);
      const image = buildChartImage(spec, window.location.href);
      const output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
      try {
        const doc = output.window.document;
        const keys = [...doc.querySelectorAll('[data-export-point-key-entry]')];
        const renderedIds = keys.map(key => key.getAttribute('data-export-point-id'));
        const originalIds = [...spec.svg.querySelectorAll('[data-source-observation]')].map(mark => mark.dataset.sourceObservation);
        assert.deepEqual(renderedIds, originalIds, `same point IDs at ${width}px`);
        const visibleBadges = keys.flatMap((key, index) => {
          const badge = key.querySelector('[data-export-point-key-badge] text');
          return badge ? [[renderedIds[index], badge.textContent]] : [];
        });
        assert.deepEqual(visibleBadges, [...badgeMap], `painted numbers match their original plot badge at ${width}px`);
        assert.equal(new Set(visibleBadges.map(([, number]) => number)).size, badgeMap.size);
        const scaleText = [...doc.querySelectorAll('[data-export-point-key] > text')].map(text => text.textContent).join(' ');
        assert.match(scaleText, /50,000 h \(lower bound\).*692 individuals/);
        assert.equal(doc.querySelectorAll('[data-export-point-key-bar] rect[data-export-bar-fill]').length, 25);
        assert.equal(doc.querySelectorAll('path[data-export-bar-lower-bound]').length, 2);
        const checkBar = (index, lane, fraction, lowerBound = false) => {
          const bar = keys[index].querySelectorAll('[data-export-point-key-bar]')[lane];
          const track = bar.querySelector('rect[data-export-bar-track]');
          const fill = bar.querySelector('rect[data-export-bar-fill]');
          assert.ok(track && fill && fill.getAttribute('fill') !== 'none', 'The rasterizer receives painted geometry, not just measurement attributes');
          assert.ok(Math.abs(Number(fill.getAttribute('width')) / Number(track.getAttribute('width')) - fraction) < 1e-10);
          assert.equal(bar.querySelectorAll('path[data-export-bar-lower-bound]').length, Number(lowerBound));
        };
        checkBar(0, 0, 1, true);
        assert.equal(keys[0].querySelectorAll('[data-export-bar-fill]').length, 1);
        checkBar(1, 0, 170 / 50000);
        checkBar(8, 1, 1);
        checkBar(10, 0, 100 / 50000, true);
        checkBar(10, 1, 7 / 692);
        const visibleText = key => [...key.querySelectorAll(':scope > text')].map(text => text.textContent).join(' ');
        assert.match(visibleText(keys[8]), /2020-05-09 · release.*Calculated average: ≈1\.6 h\/patient · ≈24\.7 min\/session/s);
        assert.match(visibleText(keys[10]), /Calculated average: >14\.2 h\/animal · — h\/session \(both values are lower bounds\)/s);
        assert.match(visibleText(keys[11]), /≈60–814 h per participant.*≈340\.0 h\/participant/s);
      } finally { output.window.close(); }
    }
    assert.ok(counts[0] > 0 && counts[1] > counts[0], 'Exercise two different dynamic badge maps');
  } finally {
    await cleanup?.();
    if (previous === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = previous;
  }
});


test('fractional contributor and session counts never become numerical labels or contributor bars in UI or PNG', async () => {
  const { METRIC_CHART_EVIDENCE } = await import('../src/data/metric-chart-visibility.ts');
  const point = METRIC_CHART_EVIDENCE['Neural recording hours collected over time'].plots[0].points.find(p => p.id === 'tusz-scalp-eeg-2017-04-17');
  const original = point.recordingCoverage;
  point.recordingCoverage = { ...original, count: 1.5, sessions: 2.5 };
  let cleanup, output;
  try {
    cleanup = await mount(React.createElement(DraftChartsSection));
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const row = document.querySelector('[data-recording-coverage-row="tusz-scalp-eeg-2017-04-17"]');
    assert.doesNotMatch(row.querySelector('strong').textContent, /1\.5|2\.5/, 'Invalid individuals/sessions must not be presented as source counts');
    assert.equal(row.querySelectorAll('[data-recording-bar="contributors"] [data-recording-bar-fill]').length, 0);
    assert.match(row.textContent, /invalid count/);
    const spec = (await whenChartRegistered('metric-recording-hours')).getChart();
    const key = spec.pointKey.find(k => k.pointId === point.id);
    assert.doesNotMatch(key.label, /1\.5|2\.5/);
    assert.equal(key.bars[1], null);
    const image = buildChartImage(spec, window.location.href);
    output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const painted = output.window.document.querySelector('[data-export-point-id="tusz-scalp-eeg-2017-04-17"]');
    assert.doesNotMatch(painted.textContent, /1\.5|2\.5/);
    assert.equal(painted.querySelectorAll('[data-export-point-key-bar="2"] [data-export-bar-fill]').length, 0);
  } finally {
    output?.window.close();
    await cleanup?.();
    point.recordingCoverage = original;
  }
});
