import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
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
];

test('the actual recording-hours export callback retains every paired value and strict bound in the visible PNG key and full metadata', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection));
  let output;
  try {
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const dialog = document.querySelector('dialog[open]');
    const spec = (await whenChartRegistered('metric-recording-hours')).getChart();
    assert.equal(spec.svg, dialog.querySelector('svg.draft-plot-svg'), 'Use the real open chart, not a hand-built specification');
    assert.equal(spec.pointKey?.length, 12, 'Every original observation needs a visible paired key');
    assert.deepEqual(spec.pointKey.map(entry => entry.label), pairedKeys);
    const before = [...spec.svg.querySelectorAll('[data-source-observation]')].map(mark => [mark.dataset.sourceObservation, mark.getAttribute('cx'), mark.getAttribute('cy')]);
    const image = buildChartImage(spec, window.location.href);
    output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    const keys = [...doc.querySelectorAll('[data-export-point-key-entry]')].map(entry => [...entry.querySelectorAll('text')].map(text => text.textContent).join(' '));
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
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 12);
    assert.ok(image.height < 2600, 'Keep a compact export, not a source-note dump');
    assert.ok(image.url.endsWith('#neural-recording-hours-selected-datasets'), 'Retain the current canonical shared chart URL');
  } finally { output?.window.close(); await cleanup(); }
});
