import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { normalizeSourceContextUrl } from '../src/lib/source-context-url.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { sourceContextsForUrl } from '../src/lib/source-context.ts';
import { mount, settle } from './modal-helpers.mjs';

const plot = METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
const doi = 'https://doi.org/10.7554/eLife.91979';
globalThis.React = React;

test('ExA-SPIM keeps the Table A1 estimate and year, with Glaser as the separate method reference', () => {
  const point = plot.points.find(p => p.id === 'exaspim2024');
  assert.equal(point.x, 2024);
  assert.equal(point.y, 100_000_000_000);
  assert.equal(point.qualifier, '≈');
  assert.match(point.sourceUrl, /arxiv\.org\/pdf\/2603\.25713v1/);
  assert.match(point.sourceRole, /efficiency estimate/i);
  assert.deepEqual(point.supportingReferences, [{
    role: 'ExA-SPIM method',
    title: 'Glaser et al. (2025) · Expansion-assisted selective plane illumination microscopy for nanoscale imaging of centimeter-scale tissues',
    url: doi,
  }]);
  assert.match(point.note, /author estimate.*Glaser.*2025/is);
  assert.match(point.note, /throughput\/cost assumptions.*unverified/i);
  assert.doesNotMatch(JSON.stringify(plot), /citation mismatch|HiExM/i);
  assert.ok(sourceContextsForUrl(doi).some(c => c.href.endsWith('#estimated-acquisition-efficiency-voxels-per-dollar')));
  const catalog = JSON.parse(readFileSync('src/data/methodology-sources.json', 'utf8'));
  assert.ok(catalog.studies.some(([url, label]) => url === normalizeSourceContextUrl(doi) && /Glaser.*ExA-SPIM/.test(label)), 'The Sources directory inventories the method reference');
});

test('the corrected method link survives source inspection, selected JSON and the actual image export callback', async () => {
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: 'metric-panel-acquisition-economics' }), '#metric-panel-acquisition-economics');
  try {
    assert.doesNotMatch(document.querySelector('dialog').textContent, /citation mismatch|HiExM/i);
    const table = document.querySelector('dialog table');
    assert.ok(table.querySelector(`a[href="${doi}"]`), 'Source table links the corrected method paper');
    await act(async () => document.querySelector('[data-source-observation="exaspim2024"][tabindex]').focus());
    await settle();
    const popup = document.querySelector('[role="tooltip"]');
    assert.ok(popup.querySelector(`a[href="${doi}"]`), 'Inspection links Glaser separately from the numerical source');
    assert.match(popup.textContent, /Glaser.*2025/);
    assert.doesNotMatch(popup.textContent, /citation mismatch|HiExM/i);
    const payload = JSON.parse(decodeURIComponent(document.querySelector('[data-selected-plot-json]').href.split(',')[1]));
    assert.equal(payload.points.find(p => p.id === 'exaspim2024').supportingReferences[0].url, doi);
    const spec = (await whenChartRegistered('metric-panel-acquisition-economics')).getChart();
    const image = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' }).window.document;
    const painted = [...image.querySelectorAll('text')].map(n => n.textContent).join(' ');
    assert.match(painted, /ExA-SPIM 2024.*author estimate/);
    assert.doesNotMatch(image.documentElement.textContent, /citation mismatch|HiExM/i);
    assert.ok(image.documentElement.textContent.includes(doi), 'Export evidence retains the method URL');
    assert.equal(image.querySelectorAll('[data-source-observation]').length, 10);
    image.defaultView.close();
  } finally { await cleanup(); }
});
