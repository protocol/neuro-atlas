import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_CHART_LINKS, isDraftAnchor } from '../src/data/draft-chart-links.ts';
import { canonicalPerformanceAnchor, fieldVelocityLink, performanceTarget } from '../src/data/field-velocity-links.ts';
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, isVisibleMetric, metricCategoryFor } from '../src/data/metric-chart-visibility.ts';
import React from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import { mount, settle } from './modal-helpers.mjs';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { JSDOM } from 'jsdom';

globalThis.React = React;

const title = 'BCI communication rates over time';
const slug = 'bci-information-transfer-over-time';
const panel = 'metric-panel-bci-bitrate';

test('BCI information transfer has one explicit public URL and a native plot-panel identity', () => {
  const link = fieldVelocityLink(slug);
  assert.ok(link, 'The new chart is registered without deriving a slug from display text');
  assert.equal(link.title, title);
  assert.equal(link.target, panel);
  assert.equal(link.kind, 'chart');
  const chart = DRAFT_CHART_LINKS.find(candidate => candidate.title === title);
  assert.ok(chart, 'The generic metric renderer can resolve the new definition');
  assert.deepEqual(chart.panels, [{ id: 'draft-panel-bci-bitrate', plotId: 'bci-bitrate' }]);
  for (const anchor of [chart.id, chart.id.replace(/^draft-/, 'metric-'), chart.panels[0].id, panel]) {
    assert.equal(isDraftAnchor(anchor), true, anchor);
    assert.equal(canonicalPerformanceAnchor(anchor), slug, anchor);
    assert.equal(performanceTarget(anchor), panel, anchor);
    assert.equal(fieldVelocityLink(anchor), link, anchor);
  }
});

test('BCI source evidence mounts unchanged through the generic Metrics panel and canonical URL', async () => {
  const chart = METRIC_CHARTS.find(candidate => candidate.title === title);
  assert.ok(chart, 'The source-backed chart is included in the current Metrics catalog');
  const sourceModule = await import('../src/data/bci-bitrate.ts');
  const source = sourceModule.default ?? sourceModule;
  assert.equal(chart, source.BCI_BITRATE_CHART, 'Do not copy or alter the parent-owned definition');
  assert.equal(METRIC_CHART_EVIDENCE[title], source.BCI_BITRATE_EVIDENCE, 'Do not transform source evidence');
  assert.equal(isVisibleMetric(chart), true);
  assert.equal(metricCategoryFor(chart), 'Human interfaces and recordings');
  const evidence = METRIC_CHART_EVIDENCE[title];
  assert.equal(evidence.plots.length, 1);
  const plot = evidence.plots[0];
  assert.equal(plot.id, 'bci-bitrate');
  assert.equal(plot.scale, 'log');
  assert.equal(plot.xKind, 'year');
  assert.match(plot.observationBasis, /Paper-reported.*calculated.*company.*source-unverified approximate rate/);
  const before = JSON.stringify(evidence);
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(VelocityTabs, { performance: null })), `#${slug}`);
  try {
    for (let i = 0; i < 30 && !document.querySelector('dialog[open]'); i++) await settle();
    const dialog = document.querySelector('dialog[open]');
    assert.ok(dialog, 'Canonical chart entry opens its native detail panel');
    assert.equal(dialog.querySelector('h2').textContent, title);
    assert.equal(window.location.hash, `#${slug}`);
    const card = dialog.closest('[data-draft-chart-card]');
    assert.equal(card.closest('[data-metrics-category]').dataset.metricsCategory, chart.category);
    assert.equal(card.querySelectorAll('[data-draft-panel]').length, 1);
    assert.equal(card.querySelector('[data-draft-popout]').dataset.draftPopout, panel);
    assert.equal(dialog.querySelectorAll('svg.draft-plot-svg').length, 1);
    assert.deepEqual([...dialog.querySelectorAll('[data-source-observation]')].map(mark => mark.dataset.sourceObservation), plot.points.map(point => point.id));
    assert.equal(dialog.querySelectorAll('[data-observation-series], [data-extrapolation-line]').length, 0);
    assert.ok(dialog.querySelector('.draft-plot-legend').textContent.includes(plot.observationBasis));
    assert.equal(dialog.querySelector('[role=tooltip]'), null, 'Source popovers are empty at rest');
    assert.equal(dialog.querySelectorAll('[data-download-chart]').length, 1, 'Reuse the native PNG export action');
    const rows = [...dialog.querySelectorAll('.draft-plot-data tbody tr')];
    assert.equal(rows.length, plot.points.length);
    for (const [i, point] of plot.points.entries()) {
      if (point.sourceUrl) assert.equal(rows[i].querySelector('a').href, point.sourceUrl);
      else {
        assert.equal(rows[i].querySelectorAll('a').length, point.candidateSources?.length ?? 0, 'Only explicitly labeled candidate links, never a primary attribution');
        assert.ok(rows[i].textContent.includes(point.sourceTitle));
      }
      assert.equal(rows[i].querySelector('blockquote').textContent, point.quote);
      assert.ok(rows[i].textContent.includes(point.dateLabel));
    }
    assert.equal(JSON.stringify(evidence), before, 'Rendering preserves every source value and qualifier');
  } finally { await cleanup(); }
});

test('BCI uses five-year labels in the rail preview, opened modal and native export SVG', async () => {
  const plot = METRIC_CHART_EVIDENCE[title].plots[0];
  const before = JSON.stringify(plot);
  const expected = ['2000', '2005', '2010', '2015', '2020', '2025'];
  const xTickLabels = (svg, bottom = Number(svg.querySelector('.draft-plot-axis').getAttribute('y1'))) => [...svg.querySelectorAll('text')]
    .filter(tick => Number(tick.getAttribute('y')) === bottom + 22 && tick.getAttribute('text-anchor') === 'middle')
    .map(tick => tick.textContent);
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: panel }), `#${slug}`);
  let output;
  try {
    const preview = document.querySelector('.draft-popout-preview .draft-plot-svg');
    assert.ok(preview, 'Read the real panel rail preview');
    assert.deepEqual(xTickLabels(preview), expected, 'Rail preview labels every five years');
    const dialog = document.querySelector('dialog[open]');
    assert.equal(dialog?.querySelector('h2').textContent, title, 'Inspect the opened BCI modal');
    assert.deepEqual(xTickLabels(dialog.querySelector('.draft-plot-svg')), expected, 'Opened modal uses the same calendar ticks');
    const registration = await whenChartRegistered(panel);
    const specification = registration.getChart();
    assert.equal(specification.svg, dialog.querySelector('.draft-plot-svg'), 'Export reads the actual expanded SVG');
    const exportBottom = Number(specification.svg.querySelector('.draft-plot-axis').getAttribute('y1'));
    output = new JSDOM(buildChartImage(specification, window.location.href).svg, { contentType: 'image/svg+xml' });
    // The native serializer deliberately drops CSS classes; quantitative tick coordinates survive.
    assert.deepEqual(xTickLabels(output.window.document.querySelector('svg'), exportBottom), expected, 'Native export serializer retains all six year labels');
    assert.equal(output.window.document.querySelectorAll('[data-source-observation]').length, plot.points.length);
    assert.equal(JSON.stringify(plot), before, 'All source dates, values, fit and notes survive unchanged');
    const optedIn = [...new Set(Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots)
      .filter(candidate => candidate.yearTickStep !== undefined).map(candidate => candidate.id))];
    assert.deepEqual(optedIn, ['bci-bitrate'], 'Only BCI opts into explicit calendar spacing');
  } finally { output?.window.close(); await cleanup(); }
});

test('the actual BCI export callback separates compact study keys from task groups and places them below branding', async () => {
  const plot = METRIC_CHART_EVIDENCE[title].plots[0];
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor: panel }), `#${slug}`);
  let output;
  try {
    const registration = await whenChartRegistered(panel);
    assert.ok(registration, 'Use the native ChartShare export callback');
    const specification = registration.getChart();
    assert.equal(specification.legend.filter(entry => /^\d+\. /.test(entry.label)).length, 0, 'Study notes cannot masquerade as the series legend');
    assert.equal(specification.legend.length, plot.legend.length + 1, 'Only task groups and the fitted line precede branding');
    const keys = specification.pointKey;
    assert.equal(keys.length, 14, 'Every numbered badge needs a readable observation identity in the PNG');
    assert.deepEqual(keys.map(entry => entry.label), plot.points.map((point, index) => `${index + 1}. ${point.exportAnnotation}`));
    assert.equal(specification.pointKeyNote, plot.exportPointKeyNote);
    assert.deepEqual(keys.map(({ color, marker }) => ({ color, marker })), plot.points.map(({ color, marker }) => ({ color, marker })));
    assert.equal(document.querySelectorAll('dialog[open] [data-draft-group-legend] li').length, 5, 'Do not append point keys to the on-site group legend');
    const image = buildChartImage(specification, window.location.href);
    output = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    const visible = [...doc.querySelectorAll('text')].map(node => node.textContent).join(' ').replace(/\s+/g, ' ');
    for (const key of keys) assert.ok(visible.includes(key.label), `Readable exported key: ${key.label}`);
    assert.ok(visible.includes('More information on Neuro Atlas.'));
    assert.equal(visible.includes(plot.seriesNote), false, 'Point keys are not a restored long scientific footnote');
    assert.ok(doc.querySelector('[data-export-brand="pl-rd"]'));
    assert.equal(doc.querySelectorAll('[data-export-point-key-entry]').length, 14);
    assert.ok(doc.querySelector('[data-export-footer]').compareDocumentPosition(doc.querySelector('[data-export-point-key]')) & output.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.doesNotMatch(visible, /log2\(28\)|gross WPM|correct CPM/);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 14);
  } finally { output?.window.close(); await cleanup(); }
});
