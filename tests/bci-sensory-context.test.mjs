import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { BCI_BITRATE_EVIDENCE } from '../src/data/bci-bitrate.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const plot = BCI_BITRATE_EVIDENCE.plots[0];
const anchor = 'metric-panel-bci-bitrate';
const slug = 'bci-information-transfer-over-time';
const normalize = svg => svg.outerHTML.replace(/_r_[^" ]+/g, 'CHART_ID');

test('sensory log geometry keeps a bounded plot, separated keys and readable calendar labels at narrow widths', async () => {
  const previousObserver = globalThis.ResizeObserver;
  try {
    for (const width of [560, 320, 280, 240]) {
      globalThis.ResizeObserver = class {
        constructor(callback) { this.callback = callback; }
        observe(target) { this.callback([{ target, contentRect: { width } }]); }
        disconnect() {}
      };
      const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), `#${slug}`);
      try {
        const dialog = document.querySelector('dialog[open]');
        const svg = dialog.querySelector('svg.draft-plot-svg');
        // BCI glyphs include polygons: use their source centers from their tooltip leader.
        const centers = () => [...svg.querySelectorAll('[data-annotation-leader]')].map(line => Number(line.getAttribute('y1')));
        const years = [...svg.querySelectorAll('[data-year-guide]')].map(line => line.dataset.yearGuide);
        await click(dialog.querySelector('[data-sensory-toggle]'));
        const bottom = Number(svg.querySelector('.draft-plot-axis').getAttribute('y1'));
        const top = Math.min(...[...svg.querySelectorAll('.draft-plot-gridline')].map(line => Number(line.getAttribute('y1'))));
        const minPower = Math.floor(Math.log10(Math.min(...plot.points.map(point => point.y))));
        const maxPower = Math.ceil(Math.log10(8_750_000) + .15);
        const expected = bottom - (Math.log10(8_750_000) - minPower) / (maxPower - minPower) * (bottom - top);
        assert.ok(Math.abs(Number(svg.querySelector('[data-sensory-reference]').getAttribute('y1')) - expected) < 1e-9, `${width}: exact log reference`);
        const sensoryCenters = centers();
        assert.ok(bottom - top <= 480, `${width}: sensory view stays bounded, not an empty multi-screen plot`);
        assert.ok(Math.min(...sensoryCenters) > expected + 24, `${width}: reference remains separate from BCI observations`);
        assert.equal(svg.querySelectorAll('[data-annotation-key]').length, 14);
        const keys = [...svg.querySelectorAll('[data-annotation-key] rect')].map(rect => ({ x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')) }));
        for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
          assert.ok(Math.abs(keys[i].x - keys[j].x) >= 23 || Math.abs(keys[i].y - keys[j].y) >= 23, `${width}: keys ${i + 1}/${j + 1} stay separated`);
        }
        assert.deepEqual([...svg.querySelectorAll('[data-year-guide]')].map(line => line.dataset.yearGuide), years, `${width}: every annual guide retained`);
        const ticks = [...svg.querySelectorAll('text')].filter(text => Number(text.getAttribute('y')) === bottom + 22 && text.getAttribute('text-anchor') === 'middle');
        assert.ok(ticks.length >= 2);
        for (let i = 1; i < ticks.length; i++) assert.ok(Number(ticks[i].getAttribute('x')) - Number(ticks[i - 1].getAttribute('x')) >= 34, `${width}: four-digit calendar labels have breathing room`);
        const fitBaseline = Math.max(...[...svg.querySelectorAll('[data-fit-direct-label]')].map(text => Number(text.getAttribute('y'))));
        assert.ok(Number(svg.querySelector('[data-sensory-reference-label]').getAttribute('y')) >= fitBaseline + 20, `${width}: qualified label stays clear of the fit heading`);
        assert.ok(sensoryCenters.every(Number.isFinite), `${width}: all marker geometry remains finite`);
      } finally { await cleanup(); }
    }
  } finally { globalThis.ResizeObserver = previousObserver; }
});

test('BCI local sensory context plots a qualified sourced retinal scenario, then restores the exact default SVG', async () => {
  const before = JSON.stringify(BCI_BITRATE_EVIDENCE);
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), `#${slug}`);
  try {
    const dialog = document.querySelector('dialog[open]');
    assert.equal(dialog?.querySelector('h2').textContent, plot.title);
    const svg = dialog.querySelector('svg.draft-plot-svg');
    const original = normalize(svg);
    const preview = normalize(document.querySelector('[data-draft-preview] svg'));
    const url = window.location.href;
    const toggle = dialog.querySelector('[data-sensory-toggle]');
    assert.ok(toggle, 'BCI detail has a default-off Sensory context switch');
    assert.equal(toggle.textContent, 'Sensory context');
    assert.equal(toggle.getAttribute('role'), 'switch');
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    assert.equal(svg.querySelector('[data-sensory-reference]'), null);
    await click(toggle);
    assert.equal(toggle.getAttribute('aria-checked'), 'true');
    const line = svg.querySelector('[data-sensory-reference="retinal-output"]');
    assert.ok(line, 'The comparison is a plotted line, not only prose below');
    assert.equal(Number(line.dataset.value), 8_750_000);
    assert.equal(line.getAttribute('y1'), line.getAttribute('y2'));
    assert.ok(Number(line.getAttribute('x2')) > Number(line.getAttribute('x1')));
    assert.equal(line.getAttribute('stroke-dasharray'), '2 5');
    const label = svg.querySelector('[data-sensory-reference-label]');
    assert.match(label.textContent, /Eye → brain ≈9 Mb\/s/);
    assert.match(label.textContent, /animal-scaled human retinal scenario/i);
    const assumptions = dialog.querySelector('[data-sensory-assumptions]');
    assert.ok(assumptions.querySelector('a[href="https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/"]'));
    assert.match(assumptions.textContent, /875,000.*1,000,000.*100,000.*8,750,000/s);
    assert.match(assumptions.textContent, /independent.*correlation/s);
    assert.match(assumptions.textContent, /not a direct human measurement.*capacity.*BCI target/s);
    assert.equal(svg.querySelectorAll('[data-source-observation]').length, plot.points.length);
    assert.equal(svg.querySelectorAll('[data-annotation-key]').length, 14);
    assert.equal(normalize(document.querySelector('[data-draft-preview] svg')), preview);
    assert.equal(document.querySelector('[data-draft-preview] [data-sensory-toggle]'), null);
    assert.equal(window.location.href, url, 'Local context never changes chart URLs');
    await click(toggle);
    assert.equal(normalize(svg), original, 'Off restores every SVG byte (not just observations)');
    assert.equal(JSON.stringify(BCI_BITRATE_EVIDENCE), before, 'No source observations, fit or downloads are rewritten');
  } finally { await cleanup(); }
});

for (const path of ['/field-velocity', '/neuro-atlas/field-velocity']) {
  test(`main popout at ${path} exports the visible sensory state with source and restores its default image`, async () => {
    const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor }), `#${slug}`, win => {
      win.history.replaceState(null, '', `${path}?review=1#${slug}`);
    });
    let image;
    try {
      const dialog = document.querySelector('dialog[open]');
      assert.equal(dialog?.querySelector('h2').textContent, plot.title, 'Use the existing main Metrics popout');
      const svg = dialog.querySelector('svg.draft-plot-svg');
      const original = buildChartImage((await whenChartRegistered(anchor)).getChart(), window.location.href);
      const rows = dialog.querySelector('tbody').outerHTML;
      const fit = dialog.querySelector('[data-reference-trendline-key]').textContent;
      await click(dialog.querySelector('[data-sensory-toggle]'));
      const spec = (await whenChartRegistered(anchor)).getChart();
      assert.equal(spec.svg, svg, 'No separate default-state renderer');
      assert.ok(spec.notes.some(note => note.includes('875,000') && note.includes('8,750,000')), 'Export retains the current scenario assumptions');
      assert.ok(spec.notes.some(note => note.includes('https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/')), 'Export retains the primary source');
      assert.equal(dialog.querySelector('[data-download-chart]').disabled, false);
      image = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' });
      const exported = image.window.document;
      const text = [...exported.querySelectorAll('text')].map(node => node.textContent).join(' ');
      assert.match(text, /Eye → brain ≈9 Mb\/s.*animal-scaled human retinal scenario/s);
      const reference = svg.querySelector('[data-sensory-reference]');
      assert.ok([...exported.querySelectorAll('line')].some(line => line.getAttribute('y1') === reference.getAttribute('y1')
        && line.getAttribute('y2') === reference.getAttribute('y2') && line.getAttribute('stroke-dasharray') === '2 5'), 'Native serializer retains the actual horizontal dotted mark');
      assert.equal(exported.querySelectorAll('[data-export-point-key-entry]').length, 14);
      assert.equal(exported.querySelectorAll('[data-source-observation]').length, plot.points.length);
      assert.equal(dialog.querySelector('tbody').outerHTML, rows, 'Sensory context never becomes canonical BCI source data');
      assert.equal(dialog.querySelector('[data-reference-trendline-key]').textContent, fit, 'The original fit is not recomputed');
      assert.match(dialog.textContent, /Copy link opens the default chart/);
      assert.equal(window.location.pathname, path);
      await click(dialog.querySelector('[data-sensory-toggle]'));
      assert.equal(buildChartImage((await whenChartRegistered(anchor)).getChart(), window.location.href).svg, original.svg, 'Default native export bytes are restored');
    } finally { image?.window.close(); await cleanup(); }
  });
}

test('all default and preview plot SVGs match pinned main plus the isolated acquisition display baseline', () => {
  // Frozen main SVGs captured at 913eb58f69ef385b5e4fc2cbc02c532bdb7a8a13 stay untouched.
  const frozenMain = JSON.parse(readFileSync(new URL('./fixtures/bci-sensory-default-svg.json', import.meta.url), 'utf8'));
  // Only acquisition's two display states use the independently captured premerge baseline.
  const acquisition = JSON.parse(readFileSync(new URL('./fixtures/bci-sensory-acquisition-approved-svg.json', import.meta.url), 'utf8'));
  assert.equal(acquisition.source, '6eabb6726ff8d47e0611e7b5e027739e0bd67344');
  assert.deepEqual(Object.keys(acquisition).sort(), ['hashes', 'source']);
  assert.deepEqual(Object.keys(acquisition.hashes).sort(), ['acquisition-economics:default', 'acquisition-economics:preview']);
  assert.equal(Object.keys(frozenMain).length, 30);
  for (const key of Object.keys(acquisition.hashes)) assert.ok(Object.hasOwn(frozenMain, key), key);
  const expected = { ...frozenMain, ...acquisition.hashes };
  const plots = [...new Map(Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots ?? []).map(plot => [plot.id, plot])).values()];
  const actual = {};
  for (const plot of plots) for (const preview of [false, true]) {
    const markup = renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview }));
    const svg = markup.match(/<svg[^>]*class="draft-plot-svg"[\s\S]*?<\/svg>/)?.[0];
    assert.ok(svg, plot.id);
    actual[`${plot.id}:${preview ? 'preview' : 'default'}`] = createHash('sha256').update(svg).digest('hex');
    if (plot.id !== 'bci-bitrate' || preview) assert.equal(markup.includes('data-sensory-toggle'), false, plot.id);
  }
  assert.deepEqual(actual, expected);
});
