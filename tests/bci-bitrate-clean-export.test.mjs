import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { buildChartImage } from '../src/lib/chart-export.ts';
globalThis.React = React;
import * as imported from '../src/data/bci-bitrate.ts';
const data = imported.default ?? imported;
const plot = data.BCI_BITRATE_EVIDENCE.plots[0];

test('PNG study identities are concise while full conversion and task notes remain on site', () => {
  for (const point of plot.points) {
    assert.equal(typeof point.exportAnnotation, 'string', point.id);
    assert.ok(point.exportAnnotation.length <= 110, point.exportAnnotation);
    assert.ok(point.exportAnnotation.includes(String(point.x)), point.id);
    assert.ok(point.exportAnnotation.includes(String(Number(point.y.toPrecision(3)))), point.id);
    assert.ok(point.exportAnnotation.includes(point.qualifier ?? ''), point.id);
    assert.doesNotMatch(point.exportAnnotation, /log2|gross WPM|correct CPM|fit included|excluded from fit|Publication|word error/i);
    assert.ok(point.note.length > point.exportAnnotation.length, point.id);
    assert.ok(point.exportNote.length > point.exportAnnotation.length, point.id);
    const row = data.BCI_BITRATE_ROWS.find(row => row.id === point.id);
    assert.match(point.exportAnnotation, row.fitIncluded ? /equiv\./ : /source unverified|native|company/);
    if (row.fitIncluded) {
      const speech = row.nativeRateUnit === 'words/minute';
      assert.match(point.annotation, speech ? /5 × 1 bit\/char/ : /log2\(28\)/, 'Full on-site conversion is retained');
      if (speech) assert.match(point.exportAnnotation, /1b\/char equiv\./, 'Speech keys carry a compact model indicator');
      else assert.doesNotMatch(point.exportAnnotation, /1b\/char/, 'Retained symbol equivalents use the shared scope note');
    }
  }
  assert.match(plot.exportPointKeyNote, /PL R&D estimates/);
  assert.match(plot.exportPointKeyNote, /context outside the fit/);
  assert.match(plot.exportPointKeyNote, /speech.*5 char\/word/i);
  assert.match(plot.exportPointKeyNote, /speech 1 bit\/char × 5 char\/word; other text 28-symbol/);
  assert.match(plot.exportPointKeyNote, /mixed.model fit/i);
  assert.match(plot.points.find(point => point.id === 'bci-slide-pandarinath').exportAnnotation, /T5 9×9/);
  assert.match(plot.points.find(point => point.id === 'bci-slide-stentrode').exportAnnotation, /P2 isolated/);
  assert.match(plot.points.find(point => point.id === 'bci-slide-unlabeled-cursor-2015-upper').exportAnnotation, /unverified/);
});

test('the native image puts a compact two-column study key after the branded crop boundary, not in the legend', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  let out;
  try {
    const svg = dom.window.document.querySelector('svg.draft-plot-svg');
    const original = svg.outerHTML;
    const legend = [...plot.legend, { ...plot.referenceTrendline, marker: 'line' }];
    const pointKey = plot.points.map((point, index) => ({ label: `${index + 1}. ${point.exportAnnotation}`, color: point.color, marker: point.marker }));
    const base = { svg, title: plot.title, anchor: 'bci-information-transfer-over-time', legend, notes: plot.points.map(point => point.exportNote) };
    const url = 'https://www.plneuro.xyz/neuro-atlas/field-velocity';
    const image = buildChartImage({ ...base, pointKey, pointKeyNote: plot.exportPointKeyNote }, url);
    out = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
    const doc = out.window.document;
    const key = doc.querySelector('[data-export-point-key]');
    assert.ok(key, 'Observation identities must remain readable in the real image');
    const entries = [...key.querySelectorAll('[data-export-point-key-entry]')];
    assert.equal(entries.length, 14);
    assert.deepEqual(entries.map(entry => [...entry.querySelectorAll('text')].map(text => text.textContent).join(' ')), pointKey.map(entry => entry.label));
    assert.equal(new Set(entries.map(entry => entry.querySelector('text').getAttribute('x'))).size, 2);
    const footer = doc.querySelector('[data-export-footer]');
    assert.ok(footer.compareDocumentPosition(key) & out.window.Node.DOCUMENT_POSITION_FOLLOWING);
    const logo = footer.querySelector('[data-export-brand]');
    const brandBottom = Number(logo.getAttribute('y')) + Number(logo.getAttribute('height'));
    const cropBottom = Number(doc.documentElement.getAttribute('data-export-crop-bottom'));
    assert.ok(cropBottom > brandBottom);
    assert.ok(Math.min(...[...key.querySelectorAll('text')].map(text => Number(text.getAttribute('y')))) > cropBottom);
    assert.match(footer.textContent, /More information on Neuro Atlas/);
    assert.ok(footer.textContent.includes(url + '/bci-information-transfer-over-time'));
    const visible = [...doc.querySelectorAll('text')].map(text => text.textContent).join(' ');
    assert.doesNotMatch(visible, /log2\(28\)|gross WPM|correct CPM|fit included|Publication\//);
    assert.ok(visible.includes(`R²(log10) = ${data.BCI_BITRATE_FIT.rSquaredLog10.toFixed(3)}`));
    assert.match(visible, /mixed models/i);
    const entryText = entries.map(entry => [...entry.querySelectorAll('text')].map(text => text.textContent).join(' '));
    assert.equal(entryText.filter(text => /1b\/char equiv\./.test(text)).length, 5);
    assert.match(visible, /speech 1 bit\/char × 5 char\/word; other text 28-symbol/);
    assert.match(doc.querySelector('desc').textContent, /log2\(28\)/);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 14);
    const legacy = buildChartImage({ ...base, legend: [...legend, ...plot.points.map((point, index) => ({label: `${index + 1}. ${point.annotation}`, color: point.color, marker: point.marker}))] }, url);
    assert.ok(image.height < legacy.height * .8, `${image.height} should be materially shorter than ${legacy.height}`);
    assert.equal(svg.outerHTML, original, 'No source plot is altered by exporting');
  } finally { out?.window.close(); dom.window.close(); }
});
