import { canonicalPerformanceAnchor } from "../src/data/field-velocity-links.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { StrictMode } from 'react';
import { mount, click, settle } from './modal-helpers.mjs';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';

// Only browser raster/clipboard boundaries are fixtures. Real components, SVG
// geometry, export serialization and MIME payload construction run unchanged.
const exportEvidence = doc => (doc.querySelector('svg > desc')?.textContent ?? '').replace(/\s+/g, ' ');
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
function browserBoundaries(win, { rejectWrite = false, unsupported = false } = {}) {
  const writes = [], svgs = [], downloads = [], objects = new Map();
  let serial = 0;
  const saved = Object.fromEntries(['navigator', 'ClipboardItem', 'Image'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  class Item {
    constructor(data) { this.data = data; this.types = Object.keys(data); }
    async getType(type) { return this.data[type]; }
    static supports(type) { return ['image/png', 'text/plain', 'text/html'].includes(type); }
  }
  Object.defineProperty(globalThis, 'ClipboardItem', { configurable: true, value: unsupported ? undefined : Item });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { write(items) { writes.push(items); return rejectWrite ? Promise.reject(new Error('Permission denied')) : Promise.all(items.flatMap(i => Object.values(i.data))).then(() => {}); }, writeText(text) { writes.push(text); return Promise.resolve(); } } } });
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { const url = `blob:fixture-${++serial}`; objects.set(url, blob); return url; };
  URL.revokeObjectURL = url => objects.delete(url);
  class ImageFixture {
    set src(url) { objects.get(url).text().then(text => { svgs.push(text); queueMicrotask(() => this.onload()); }); }
  }
  Object.defineProperty(globalThis, 'Image', { configurable: true, writable: true, value: ImageFixture });
  win.HTMLCanvasElement.prototype.getContext = () => ({ scale() {}, drawImage() {}, fillRect() {} });
  win.HTMLCanvasElement.prototype.toBlob = function (callback, type) { assert.equal(type, 'image/png'); callback(new Blob([pngBytes], { type })); };
  win.HTMLAnchorElement.prototype.click = function () { downloads.push({ href: this.href, filename: this.download, blob: objects.get(this.href) }); };
  return { writes, svgs, downloads, objects, restore() {
    for (const [key, value] of Object.entries(saved)) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; }
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
  } };
}


async function openPanel(panel) {
  const existing = document.querySelector('dialog[open]');
  if (existing && panel.contains(existing)) return existing;
  if (existing) { await click(existing.querySelector('.pc-modal-header button')); await settle(); await settle(); }
  await click(panel.querySelector('[data-draft-popout-trigger]'));
  const modal = panel.querySelector('dialog[open]');
  assert.ok(modal, 'selected chart detail is open');
  return modal;
}

test('each curated numeric panel offers a single-item PNG + absolute chart URL + safe rich HTML, without writes on render', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(DraftChartsSection)), '', win => {
    win.history.replaceState(null, '', '/neuro-atlas/field-velocity?token=private&review=1');
    boundary = browserBoundaries(win);
  });
  try {
    assert.equal(boundary.writes.length, 0);
    const panels = [...document.querySelectorAll('[data-draft-panel]')].filter(panel => panel.querySelector('[data-source-observation]'));
    assert.ok(panels.length > 1);
    for (const panel of panels) {
      await openPanel(panel);
      const button = panel.querySelector('button[data-copy-chart]');
      assert.ok(button, `Copy chart missing for ${panel.id}`);
      const anchor = panel.querySelector('.metric-anchor').id;
      assert.equal(button.dataset.copyChart, anchor);
    }
    const panel = panels.find(panel => panel.closest('article').querySelectorAll('[data-draft-panel]').length > 1);
    await openPanel(panel);
    const title = panel.querySelector('figcaption').textContent;
    await click(panel.querySelector('[data-copy-chart]'));
    assert.equal(boundary.writes.length, 1);
    const items = boundary.writes[0];
    assert.equal(items.length, 1, 'One item, not competing image and URL items');
    assert.deepEqual(items[0].types.sort(), ['image/png', 'text/html', 'text/plain']);
    for (const mime of items[0].types) assert.equal((await items[0].getType(mime)).type, mime);
    const link = await (await items[0].getType('text/plain')).text();
    assert.equal(link, `https://atlas.example/neuro-atlas/field-velocity#${canonicalPerformanceAnchor(panel.querySelector('.metric-anchor').id)}`);
    const html = await (await items[0].getType('text/html')).text();
    assert.match(html, /<img[^>]+src="data:image\/png;base64,/);
    assert.ok(html.includes(`href="${link}"`));
    assert.doesNotMatch(html, /private|token=|<script|onerror/);
    assert.ok(boundary.svgs[0].includes(title));
    assert.match(boundary.svgs[0], /Neuro Atlas/);
    assert.doesNotMatch(boundary.svgs[0], /Hover, tap|Data and sources|Bounded evidence|<foreignObject/);
    assert.match(panel.querySelector('[data-chart-share] [role=status]').textContent, /copied/i);
    assert.ok(panel.querySelector('[data-copy-draft-link]'), 'Separate Copy link retained');
  } finally { await cleanup(); boundary.restore(); }
});

import { readFileSync } from 'node:fs';
import { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { selectPerformance, selectPace } from '../src/lib/field-velocity/performance.ts';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
const feed = parseFeed(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));

for (const id of ['simultaneously-recorded-neurons', 'tissue-mapped', 'neural-recording-hours', 'idea_vintage', 'latency_compression', 'google-trends-neurotech', 'google-trends-neuralink']) {
  test(`${id}: copy targets the expanded numeric plot with exact marks, units, source scope and legend`, async () => {
    globalThis.React = React;
    let boundary;
    const component = id.startsWith('google-trends') ? React.createElement(GoogleTrends)
      : ['idea_vintage', 'latency_compression'].includes(id) ? React.createElement(PaceReadings, { data: selectPace(feed) })
      : React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance });
    const cleanup = await mount(component, `#${id}`, win => { boundary = browserBoundaries(win); });
    try {
      const modal = document.querySelector('dialog[open]');
      const button = modal.querySelector(`[data-copy-chart="${id}"]`);
      assert.ok(button, 'Expanded plot must expose Copy chart');
      assert.equal(boundary.writes.length, 0);
      const selector = id.startsWith('google-trends') ? '[data-trend-point]' : '[data-curve-point]';
      const values = [...modal.querySelectorAll(selector)].map(p => [p.getAttribute('cx'), p.getAttribute('cy'), p.getAttribute('data-value')]);
      await click(button);
      assert.equal(boundary.writes.length, 1);
      const serialized = boundary.svgs[0];
      assert.ok(serialized, modal.textContent);
      const { JSDOM } = await import('jsdom');
      const exported = new JSDOM(serialized, { contentType: 'image/svg+xml' });
      assert.deepEqual([...exported.window.document.querySelectorAll(selector)].map(p => [p.getAttribute('cx'), p.getAttribute('cy'), p.getAttribute('data-value')]), values);
      assert.match(exported.window.document.documentElement.textContent, /Sources?:/);
      assert.match(exported.window.document.documentElement.textContent, id.startsWith('google-trends') ? /0–100.*weekly|weekly.*0–100/i : /scale/);
      assert.ok(exported.window.document.documentElement.textContent.includes(modal.querySelector('h2').textContent));
      assert.equal(await (await boundary.writes[0][0].getType('text/plain')).text(), `https://atlas.example/field-velocity#${canonicalPerformanceAnchor(id)}`);
      assert.ok(modal.querySelector('[aria-label^="Copy link"]'));
      exported.window.close();
    } finally { await cleanup(); boundary.restore(); }
  });
}

test('performance export retains the selected track, conditional scenario and targets, but not a hovered readout', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#neural-recording-hours', win => {
    win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    boundary = browserBoundaries(win);
  });
  try {
    const modal = document.querySelector('dialog');
    await click(modal.querySelector('[role=switch]'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
    const mode = modal.querySelector('[data-scenario-select]');
    await act(async () => { mode.value = 'plateau'; mode.dispatchEvent(new Event('change', { bubbles: true })); });
    const actual = modal.querySelector('[data-extrapolation-line]').getAttribute('points');
    await click(modal.querySelector('[data-copy-chart]'));
    assert.ok(boundary.svgs[0].includes(actual));
    assert.match(boundary.svgs[0], /plateau/i);
    assert.match(boundary.svgs[0], /TUSZ corpus only|TUSZ corpus-only/);
    assert.match(boundary.svgs[0], /not.*forecast/);
    assert.match(boundary.svgs[0], /data-target-line/);
  } finally { await cleanup(); boundary.restore(); }
});

for (const failure of ['unsupported', 'permission']) test(`${failure}: recover with accessible error, explicit PNG download and untouched Copy link`, async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win, { unsupported: failure === 'unsupported', rejectWrite: failure === 'permission' }); });
  try {
    const panel = document.querySelector('[data-draft-panel]');
    await openPanel(panel);
    await click(panel.querySelector('[data-copy-chart]'));
    assert.match(panel.querySelector('[data-chart-share] [role=status]').textContent, /unavailable.*Download PNG.*Copy link/);
    assert.equal(boundary.downloads.length, 0, 'Never silently download on failure');
    assert.equal(boundary.writes.filter(item => typeof item === 'string').length, 0, 'Never replace clipboard with URL after failed image write');
    await click(panel.querySelector('[data-download-chart]'));
    assert.equal(boundary.downloads.length, 1);
    assert.equal(boundary.downloads[0].blob.type, 'image/png');
    assert.equal(boundary.downloads[0].filename, `neuro-atlas-${canonicalPerformanceAnchor(panel.querySelector('.metric-anchor').id)}.png`);
    assert.deepEqual(new Uint8Array(await boundary.downloads[0].blob.arrayBuffer()), new Uint8Array(pngBytes));
    await click(panel.querySelector('[data-copy-draft-link]'));
    assert.equal(boundary.writes.at(-1), `https://atlas.example/field-velocity?review=1#${canonicalPerformanceAnchor(panel.querySelector('.metric-anchor').id)}`);
  } finally { await cleanup(); boundary.restore(); }
});

test('image rendering failure is announced, releases object URLs and permits a retry', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win); });
  try {
    const WorkingImage = globalThis.Image;
    globalThis.Image = class { set src(_) { queueMicrotask(() => this.onerror()); } };
    const panel = document.querySelector('[data-draft-panel]');
    await openPanel(panel);
    await click(panel.querySelector('[data-copy-chart]'));
    assert.match(panel.querySelector('[data-chart-share] [role=status]').textContent, /unavailable/);
    assert.equal(boundary.objects.size, 0);
    assert.equal(panel.querySelector('[data-copy-chart]').disabled, false);
    globalThis.Image = WorkingImage;
    await click(panel.querySelector('[data-copy-chart]'));
    assert.match(panel.querySelector('[data-chart-share] [role=status]').textContent, /copied/);
  } finally { await cleanup(); boundary.restore(); }
});

test('rendered metric cards omit the generic Bounded evidence eyebrow, retaining observed counts and scientific caveats', async () => {
  globalThis.React = React;
  const cleanup = await mount(React.createElement(DraftChartsSection));
  try {
    assert.equal([...document.querySelectorAll('.pc-eyebrow')].filter(node => node.textContent === 'Bounded evidence').length, 0);
    for (const card of document.querySelectorAll('[data-draft-chart-status="plotted"]')) {
      assert.match(card.querySelector('.draft-chart-readiness').textContent, /[0-9]+ (observations|events)/);
      assert.ok(card.querySelector('[data-draft-methodology]'));
      for (const panel of card.querySelectorAll('[data-draft-panel]')) {
        if (!panel.querySelector('[data-source-observation]')) continue;
        const modal = await openPanel(panel);
        assert.ok(modal.querySelector('.draft-plot-scope').textContent.length > 0);
      }
    }
  } finally { await cleanup(); }
});

test('multi-panel definitions render separate tiles with one unambiguous panel copy action each', async () => {
  globalThis.React = React;
  const cleanup = await mount(React.createElement(DraftChartsSection, { flat: true, showGaps: false }));
  try {
    const targets = [];
    for (const card of document.querySelectorAll('[data-draft-chart-card]')) {
      assert.equal(card.querySelectorAll('[data-draft-popout]').length, 1);
      const popout = card.querySelector('[data-draft-popout]');
      const copies = card.querySelectorAll('[data-copy-draft-link]');
      assert.equal(copies.length, 1);
      assert.equal(copies[0].textContent, 'Copy link');
      assert.equal(copies[0].dataset.copyDraftLink, popout.dataset.draftPopout);
      assert.equal(card.querySelector('[data-chart-share]'), null, 'Image export is mounted only inside its selected modal');
      targets.push(popout.dataset.draftPopout);
    }
    assert.equal(new Set(targets).size, targets.length);
  } finally { await cleanup(); }
});

test('all 14 curated images keep exact geometry, refer to Atlas, and retain source evidence without painting a footnote', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win); });
  try {
    const { JSDOM } = await import('jsdom');
    const panels = [...document.querySelectorAll('[data-draft-panel]')].filter(panel => panel.querySelector('[data-source-observation]'));
    assert.equal(panels.length, 14, 'Independent current public inventory');
    for (const panel of panels) {
      const modal = await openPanel(panel);
      const source = modal.querySelector('svg');
      const geometry = svg => [...svg.querySelectorAll('[data-source-observation]')].map(node => Object.fromEntries(['data-source-observation', 'cx', 'cy', 'x', 'y', 'width', 'height', 'r', 'points', 'fill', 'stroke'].map(key => [key, node.getAttribute(key)])));
      await click(panel.querySelector('[data-copy-chart]'));
      const out = new JSDOM(boundary.svgs.at(-1), { contentType: 'image/svg+xml' });
      const marks = out.window.document.querySelector('svg svg');
      // Resolve CSS variables in source paint separately; numeric coordinates are exact.
      const numeric = rows => rows.map(({ fill, stroke, ...rest }) => rest);
      assert.deepEqual(numeric(geometry(marks)), numeric(geometry(source)), panel.id);
      const text = [...out.window.document.querySelectorAll('text')].map(n => n.textContent).join(' ');
      assert.ok(text.includes(panel.querySelector('figcaption').textContent), panel.id);
      const scope = panel.querySelector('.draft-plot-scope').textContent.replace(/\s+/g, ' ');
      assert.ok(exportEvidence(out.window.document).includes(scope), `Source evidence retained: ${panel.id}`);
      assert.ok(!text.includes(scope), `Long scope is not painted into the image: ${panel.id}`);
      assert.ok(text.includes('More information on Neuro Atlas.'), panel.id);
      out.window.close();
    }
  } finally { await cleanup(); boundary.restore(); }
});

test('optional rich HTML is omitted only when unsupported; PNG and URL stay in one ClipboardItem', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win); });
  try {
    ClipboardItem.supports = type => type !== 'text/html';
    await openPanel(document.querySelector('[data-draft-panel]'));
    await click(document.querySelector('[data-copy-chart]'));
    assert.equal(boundary.writes[0].length, 1);
    assert.deepEqual(boundary.writes[0][0].types, ['image/png', 'text/plain']);
  } finally { await cleanup(); boundary.restore(); }
});

test('filtered performance export retains the selected track definition and every actual selected point', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#tissue-mapped', win => { boundary = browserBoundaries(win); });
  try {
    const modal = document.querySelector('dialog');
    const select = modal.querySelector('.pc-track-select select');
    const option = select.options[1];
    await act(async () => { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); });
    const definition = [...modal.querySelectorAll('.pc-methodology dl > div')].find(node => node.querySelector('dt').textContent === option.textContent).querySelector('dd').textContent;
    await click(modal.querySelector('[data-copy-chart]'));
    const { JSDOM } = await import('jsdom');
    const out = new JSDOM(boundary.svgs[0], { contentType: 'image/svg+xml' });
    const text = [...out.window.document.querySelectorAll('text')].map(n => n.textContent).join(' ');
    assert.ok(exportEvidence(out.window.document).includes(definition), 'Selected track evidence remains nonvisual and available on Atlas');
    assert.ok(!text.includes(definition));
    assert.ok(text.includes('More information on Neuro Atlas.'));
    assert.deepEqual([...out.window.document.querySelectorAll('[data-curve-point]')].map(p => p.getAttribute('data-curve-point')), [...modal.querySelectorAll('[data-curve-point]')].map(p => p.dataset.curvePoint));
    out.window.close();
  } finally { await cleanup(); boundary.restore(); }
});


test('curated exports keep source-qualified evidence and identity without adding visible notes', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win); });
  const { JSDOM } = await import('jsdom');
  try {
    let qualifiedCount = 0;
    for (const panel of document.querySelectorAll('[data-draft-panel]')) {
      if (!panel.querySelector('[data-source-observation]')) continue;
      await openPanel(panel);
      const button = panel.querySelector('[data-copy-chart]');
      if (!button) continue;
      const rows = [...panel.querySelectorAll('.draft-plot-data tbody tr')].filter(row => /^[≈≥>]/.test(row.querySelectorAll('td')[1].textContent));
      if (!rows.length) continue;
      await click(button);
      const exported = new JSDOM(boundary.svgs.at(-1), { contentType: 'image/svg+xml' });
      const evidence = exportEvidence(exported.window.document);
      for (const row of rows) {
        const label = row.querySelector('th').firstChild.textContent;
        const qualified = row.querySelectorAll('td')[1].textContent;
        assert.ok(evidence.includes(`${label}: ${qualified}`), `${panel.id}: missing source association ${label}: ${qualified}`);
        qualifiedCount++;
      }
      exported.window.close();
    }
    assert.ok(qualifiedCount > 10, 'Audit all qualified curated observations, not only the examples');
  } finally { await cleanup(); boundary.restore(); }
});

test('filtered POYO image keeps its selected point and nonvisual lower-bound evidence with a clean referral', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#neural-recording-hours', win => { boundary = browserBoundaries(win); });
  const { JSDOM } = await import('jsdom');
  try {
    const modal=document.querySelector('dialog');
    const select=modal.querySelector('select');
    const option=[...select.options].find(o=>o.textContent.includes('POYO'));
    assert.ok(option);
    await act(async()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));});
    await click(modal.querySelector('[data-copy-chart]'));
    const exported=new JSDOM(boundary.svgs.at(-1), {contentType:'image/svg+xml'});
    const visible=[...exported.window.document.querySelectorAll('text')].map(e=>e.textContent).join(' ');
    assert.match(exportEvidence(exported.window.document),/POYO[^;]*More than 100 hours/);
    assert.ok(visible.includes('More information on Neuro Atlas.'));
    assert.equal(exported.window.document.querySelectorAll('[data-curve-point]').length,1);
    exported.window.close();
  } finally { await cleanup(); boundary.restore(); }
});


test('unified recording-hours export has one generic chart URL, all 12 marks and observation-linked lower bounds/scopes', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win); });
  const { JSDOM } = await import('jsdom');
  try {
    const card = await openPanel(document.querySelector('#draft-recording-hours [data-draft-panel]'));
    assert.equal(card.querySelector('[data-copy-chart]').dataset.copyChart, 'metric-recording-hours');
    assert.equal(card.querySelectorAll('[data-copy-chart]').length, 1);
    assert.deepEqual([...card.querySelectorAll('[data-copy-draft-link]')].map(button => button.dataset.copyDraftLink), ['metric-recording-hours']);
    assert.equal(card.querySelectorAll('.draft-chart-share a').length, 0, 'Copy link replaces duplicate Direct link');
    await click(card.querySelector('[data-copy-chart]'));
    assert.equal(await (await boundary.writes[0][0].getType('text/plain')).text(), 'https://atlas.example/field-velocity#neural-recording-hours-selected-datasets');
    const exported = new JSDOM(boundary.svgs[0], { contentType: 'image/svg+xml' });
    const doc = exported.window.document;
    assert.deepEqual([...doc.querySelectorAll('[data-source-observation]')].map(n => n.getAttribute('data-source-observation')), [...card.querySelectorAll('[data-source-observation]')].map(n => n.dataset.sourceObservation));
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 12);
    const text = exportEvidence(doc);
    assert.match(text, /Qualified values \(Recording hours\).*Neuralink · >50,000 accumulated recording hours: >50,000; POYO-1 training corpus: >100/);
    for (const phrase of ['company-held', 'participant-specific pretraining', 'held-out evaluation', 'existing recordings', 'seven nonhuman primates', 'Log scale', 'Unconnected observations']) assert.ok(text.includes(phrase), phrase);
    for (const name of ['Neuralink', 'TUSZ', 'AJILE12', 'POYO-1', 'JapanEEG']) assert.ok(text.includes(name));
    assert.equal(doc.querySelectorAll('[data-export-note], [data-export-footnotes]').length, 0);
    const visible = [...doc.querySelectorAll('text')].map(node => node.textContent).join(' ');
    assert.ok(visible.includes('More information on Neuro Atlas.'));
    assert.equal(card.querySelectorAll('[data-chart-note]').length, 5, 'On-site dataset notes are unchanged');
    assert.ok(!text.includes('#metric-panel-neuralink-private-intracortical-hours'));
    exported.window.close();
  } finally { await cleanup(); boundary.restore(); }
});


test('NeuroAI clipboard export uses the corrected performance–cost title with its original panel URL', async () => {
  globalThis.React = React;
  let boundary;
  const cleanup = await mount(React.createElement(DraftChartsSection), '', win => { boundary = browserBoundaries(win); });
  try {
    const modal = await openPanel(document.getElementById('draft-panel-neuroai-imagenet'));
    assert.equal(modal.querySelector('h2').textContent, 'NeuroAI performance–cost frontier');
    await click(modal.querySelector('[data-copy-chart]'));
    assert.equal(boundary.writes.length, 1);
    assert.match(boundary.svgs[0], /NeuroAI performance–cost frontier/);
    assert.doesNotMatch(boundary.svgs[0], /frontier over time/);
    assert.equal(await (await boundary.writes[0][0].getType('text/plain')).text(), 'https://atlas.example/field-velocity#neuroai-performance-cost-frontier');
  } finally { await cleanup(); boundary.restore(); }
});

import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
test('public-data export keeps plotted units and source evidence without painting long notes', async () => {
 globalThis.React=React;let boundary;
 const plot=Object.values(METRIC_CHART_EVIDENCE).flatMap(e=>e.plots).find(p=>p.id==='public-data-size');
 const cleanup=await mount(React.createElement(DraftChartPlot,{plot,shareAnchor:'metric-panel-public-data-size'}),'',win=>{boundary=browserBoundaries(win)});
 try{
  await click(document.querySelector('[data-download-chart]'));
  assert.equal(boundary.downloads.length,1);
  const {JSDOM}=await import('jsdom');const doc=new JSDOM(boundary.svgs[0],{contentType:'image/svg+xml'});const text=[...doc.window.document.querySelectorAll('text')].map(e=>e.children.length?[...e.children].map(line=>line.textContent).join(' '):e.textContent).join('\n').replace(/\s+/g,' ');
  for(const required of [/2026-11-03/,/initial release October 2025/,/same specimen/i,/11 JPEG image resolution levels/,/50,910,260,068,834/,/N5.*segmentation.*meshes.*tables.*excluded/])assert.match(exportEvidence(doc.window.document),required);
  assert.ok(text.includes('More information on Neuro Atlas.'));assert.ok(!text.includes('11 JPEG image resolution levels'));
  assert.match(text,/Resource size \(PB\)/);assert.doesNotMatch(text,/decimal PB/);assert.equal(doc.window.document.querySelectorAll('[data-source-observation]').length,6);doc.window.close();
 }finally{await cleanup();boundary.restore()}
});


import { RECORDING_VIEWS } from '../src/data/recording-evidence.ts';
for (const view of RECORDING_VIEWS) test(`recording ${view.id}: actual Copy chart and PNG callbacks preserve selected marks, qualifications, sources and view link`, async () => {
  let boundary;
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#simultaneously-recorded-neurons', win => { boundary = browserBoundaries(win); });
  try {
    const modal = document.querySelector('dialog');
    const select = modal.querySelector('[data-recording-view-select]');
    await act(async () => { select.value = view.id; select.dispatchEvent(new Event('change', { bubbles: true })); });
    const geometry = root => [...root.querySelectorAll('[data-curve-point]')].map(p => ['data-curve-point', 'data-value', 'cx', 'cy'].map(a => p.getAttribute(a)));
    const expected = geometry(modal);
    // Pointer-only detail must not become an arbitrary frozen tooltip in PNG.
    const point = modal.querySelector('[data-curve-point]');
    await act(async () => point.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })));
    assert.ok(modal.querySelector('[data-point-description]').textContent);
    await click(modal.querySelector('[data-copy-chart]'));
    assert.equal(boundary.writes.length, 1, modal.textContent);
    const url = `https://atlas.example/field-velocity?recordingView=${view.id}#simultaneous-neural-recordings`;
    assert.equal(await (await boundary.writes[0][0].getType('text/plain')).text(), url);
    await click(modal.querySelector('[data-download-chart]'));
    assert.equal(boundary.downloads.length, 1);
    assert.equal(boundary.svgs.length, 2);
    for (const serialized of boundary.svgs) {
      const { JSDOM } = await import('jsdom');
      const out = new JSDOM(serialized, { contentType: 'image/svg+xml' });
      assert.deepEqual(geometry(out.window.document), expected);
      const visible = [...out.window.document.querySelectorAll('text')].map(n => n.textContent).join(' ').replace(/\s+/g, ' ');
      assert.ok(visible.includes(view.label));
      const evidence = out.window.document.querySelector('desc')?.textContent ?? '';
      assert.match(evidence, /2026-11-04/);
      assert.ok(evidence.includes(view.description), 'Source scope remains available in evidence and on the site');
      assert.ok(!visible.includes(view.description), 'The copied image no longer paints methodology footnotes');
      assert.ok(visible.includes('More information on Neuro Atlas.'));
      for (const p of view.points) {
        assert.ok(evidence.includes(p.unit), p.unit);
        assert.ok(evidence.includes(p.dateBasis), 'Date basis stays in evidence and linked source details');
        assert.ok(evidence.includes(p.sourceLabel));
        // Long methods and citations stay on the linked chart, not the PNG.
        for (const original of [p.preparation, p.sourceUrl, p.note, `${p.datePrecision} precision, ${p.dateBasis}`]) assert.ok(evidence.includes(original), original);
      }
      assert.equal(out.window.document.querySelector('[role=status], [data-extrapolation-line], polyline'), null);
      assert.doesNotMatch(visible, /review=1|token=/);
      out.window.close();
    }
    if (view.id === 'human-channels') assert.match(boundary.svgs[0], /Approximately 3,000/);
  } finally { await cleanup(); boundary.restore(); }
});
