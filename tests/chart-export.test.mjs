import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { buildChartImage, chartShareUrl } from '../src/lib/chart-export.ts';

const parse = xml => new JSDOM(xml, { contentType: 'image/svg+xml' });

test('export removes pointer-only emphasis without mutating the actual plotted marks', async () => {
  globalThis.React = React;
  const feed = parseFeed(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
  const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#tissue-mapped');
  try {
    const svg = document.querySelector('dialog svg');
    const spec = { svg, title: 'Tissue', anchor: 'tissue-mapped', notes: [] };
    const baseline = buildChartImage(spec, window.location.href).svg;
    const point = svg.querySelector('[data-curve-point]');
    await act(async () => point.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    assert.equal(point.getAttribute('r'), '7', 'Real hover changed the source DOM');
    assert.equal(buildChartImage(spec, window.location.href).svg, baseline, 'Export must not freeze random hover styling');
    assert.equal(point.getAttribute('r'), '7', 'Export never mutates the live chart');
  } finally { await cleanup(); }
});

for (const theme of ['light', 'dark']) test(`${theme}: complete viewBox, marks and computed paint survive independently of viewport size`, () => {
  const background = theme === 'dark' ? '#101820' : '#ffffff';
  const ink = theme === 'dark' ? '#e8edf4' : '#112233';
  const dom = new JSDOM(`<style>.axis { fill: ${ink}; font-size: 13px; } .grid {stroke: #567890; stroke-width: 1.5px;}</style><svg viewBox="-10 -20 720 380" style="--surface:${background};--foreground:${ink};--accent:#aabbcc;width:200px;height:80px"><text class="axis" x="10" y="20">Scientific units mm³</text><line class="grid" x1="0" y1="0" x2="700" y2="0"/><polyline points="1.2345678901,2.3456789012 700,300" stroke="var(--accent)" stroke-dasharray="8 5" fill="none"/><circle data-value="1.2345678901234567" cx="200.123456789" cy="250.987654321" r="5" fill="currentColor" style="color:#be3456"/></svg>`);
  try {
    const source = dom.window.document.querySelector('svg');
    source.getBoundingClientRect = () => { throw new Error('Never capture the tiny clipped DOM viewport'); };
    const image = buildChartImage({ svg: source, title: 'Title & scope <not markup>', anchor: 'tissue-mapped', notes: ['Partial specimen, not whole-brain reconstruction.'], legend: [{ color: 'var(--accent)', label: 'Human partial cortex', marker: 'triangle' }] }, 'https://user:password@atlas.example/neuro-atlas/field-velocity?token=secret');
    assert.equal(image.width, 1200);
    const out = parse(image.svg);
    const doc = out.window.document;
    assert.equal(doc.querySelector('svg svg').getAttribute('viewBox'), '-10 -20 720 380');
    assert.equal(doc.querySelector('svg > rect').getAttribute('fill'), background);
    assert.equal(doc.querySelector('polyline').getAttribute('points'), source.querySelector('polyline').getAttribute('points'));
    assert.equal(doc.querySelector('polyline').getAttribute('stroke'), '#aabbcc');
    assert.equal(doc.querySelector('polyline').getAttribute('stroke-dasharray'), '8 5');
    assert.equal(doc.querySelector('line').getAttribute('stroke-width'), '1.5px');
    assert.equal(doc.querySelector('[data-value]').getAttribute('data-value'), '1.2345678901234567');
    assert.equal(doc.querySelector('[data-value]').getAttribute('cx'), '200.123456789');
    assert.equal(doc.querySelector('[data-value]').getAttribute('fill'), 'rgb(190, 52, 86)');
    assert.equal(doc.querySelector('svg svg text').getAttribute('font-size'), '13px');
    assert.ok(doc.querySelector('polygon'));
    assert.doesNotMatch(image.svg, /secret|password|token=|var\(|currentColor/);
    assert.match(image.svg, /&lt;not markup&gt;/);
    out.window.close();
  } finally { dom.window.close(); }
});

test('SVG export is inert and local: drops active markup, external resources, tooltip UI, handlers and stylesheet links', () => {
  const dom = new JSDOM(`<svg viewBox="0 0 600 300"><script>active()</script><foreignObject><div>UI buttons</div></foreignObject><image href="https://evil.example/image"/><use href="https://evil.example/marks"/><style>@import 'https://evil.example/css';</style><a href="javascript:active()"><circle cx="2" cy="2" r="3"/></a><g role="tooltip"><text>Random hover</text></g><circle onload="active()" cx="30" cy="40" r="5" fill="url(https://evil.example/paint)"/><text>Safe &amp; qualified</text></svg>`);
  try {
    const image = buildChartImage({ svg: dom.window.document.querySelector('svg'), title: 'Chart', anchor: 'tissue-mapped', notes: ['Source: <img onerror="active()">'] }, 'https://atlas.example/field-velocity');
    const out = parse(image.svg);
    assert.equal(out.window.document.querySelectorAll('script, foreignObject, image, use, style, a, [onload]').length, 0);
    assert.doesNotMatch(image.svg, /evil.example|Random hover|UI buttons|javascript:/);
    assert.match(image.svg, /&lt;img/);
    assert.equal(out.window.document.querySelectorAll('circle').length, 1);
    out.window.close();
  } finally { dom.window.close(); }
});

test('large/dynamic dimensions include all notes or fail explicitly rather than clipping, and source DOM stays unchanged', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 1400"><text>Entire tall chart</text></svg>');
  try {
    const svg = dom.window.document.querySelector('svg');
    const source = svg.outerHTML;
    const spec = { svg, title: 'A dynamic chart', anchor: 'tissue-mapped', notes: Array.from({ length: 20 }, (_, i) => `Scope note ${i}: must remain readable.`) };
    const image = buildChartImage(spec, 'https://atlas.example/field-velocity');
    assert.ok(image.height > 2500);
    assert.match(image.svg, /Scope note 19/);
    assert.equal(svg.outerHTML, source);
    svg.setAttribute('viewBox', '0 0 1 100000');
    assert.throws(() => buildChartImage(spec, 'https://atlas.example/field-velocity'), /bounds/);
    svg.removeAttribute('viewBox');
    assert.throws(() => buildChartImage(spec, 'https://atlas.example/field-velocity'), /viewBox/);
  } finally { dom.window.close(); }
});

test('share link validates chart identity and strips URL credentials/query while preserving origin and basePath', () => {
  assert.equal(chartShareUrl('https://name:secret@atlas.example/neuro-atlas/field-velocity?token=a&token=b#previous', 'tissue-mapped'), 'https://atlas.example/neuro-atlas/field-velocity#tissue-mapped');
  assert.throws(() => chartShareUrl('https://atlas.example/', 'made-up-target'), /Unknown/);
  assert.throws(() => chartShareUrl('javascript:alert(1)', 'tissue-mapped'), /HTTP/);
});
