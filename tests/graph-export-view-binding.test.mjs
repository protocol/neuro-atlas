import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import layout from '../src/app/field-velocity/layout.tsx';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { FIELD_VELOCITY_GRAPHS, fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { currentGraphExport, registerChart, subscribeGraphExport, whenChartRegistered, withGraphExport } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const FieldVelocityLayout = layout.default ?? layout;
const slug = 'simultaneous-neural-recordings';
const path = atlasPath(`/field-velocity/${slug}`);
const entry = fieldVelocityGraph(slug);
const optical = '?review=1&review=2&recordingView=optical#retained';

function mountRecording(search = optical, { hosted = true, siblings, ready = true, pathname = path } = {}) {
  const detail = React.createElement(FieldVelocityGraphDetail, { entry });
  const content = React.createElement(React.Fragment, null, ready && detail, siblings);
  return mount(React.createElement(AppRouterContext.Provider, {
    value: { replace() { assert.fail('unexpected router navigation'); } },
  }, hosted ? React.createElement(FieldVelocityLayout, null, content) : content), '', win => {
    win.history.replaceState({ keep: 'router state' }, '', pathname + search);
  });
}

function rasterFixture(onDecode = () => {}) {
  // Run the real chart and SVG serializer; fixture only the image decoder and canvas.
  const svgs = [], objects = new Map();
  const { createObjectURL, revokeObjectURL } = URL;
  const { Image } = globalThis;
  const canvas = window.HTMLCanvasElement.prototype;
  const { getContext, toBlob } = canvas;
  let id = 0;
  URL.createObjectURL = blob => {
    const url = `blob:export-fixture-${++id}`;
    objects.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = url => objects.delete(url);
  globalThis.Image = class {
    set src(url) {
      void objects.get(url).text().then(async svg => { svgs.push(svg); await onDecode(); }).then(() => this.onload(), () => this.onerror());
    }
  };
  canvas.getContext = () => ({ scale() {}, drawImage() {}, fillRect() {} });
  canvas.toBlob = (callback, type) => callback(new Blob(['raster-fixture'], { type }));
  return { svgs, restore() {
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    globalThis.Image = Image;
    Object.assign(canvas, { getContext, toBlob });
  } };
}

function defer() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function holdQueue() {
  const started = defer(), gate = defer();
  // This registered sibling is only a queue gate: its payload is never rendered.
  const dispose = registerChart('citation-latency', { title: 'queue gate', getChart() { assert.fail('gate was rendered'); } });
  const blocker = withGraphExport('citation-latency', () => { started.resolve(); return gate.promise; });
  void blocker.then(dispose, dispose);
  await started.promise;
  return () => { gate.resolve(); return blocker; };
}


async function selectView(value) {
  await act(async () => {
    const selector = document.querySelector('[data-recording-view-select]');
    selector.value = value;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const renderedView = () => document.querySelector('[data-recording-view]').dataset.recordingView;
const marks = root => [...root.querySelectorAll('[data-curve-point]')].map(p => [p.getAttribute('data-curve-point'), Number(p.getAttribute('data-value'))]);
const locationState = () => ({ href: window.location.href, historyLength: window.history.length, state: window.history.state });

function imageEvidence(svg) {
  const root = new window.DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  return {
    title: [...root.querySelectorAll(':scope > text[font-size="30"]')].map(node => node.textContent).join(' '),
    footer: [...root.querySelectorAll('[data-export-footer] > text:not([data-export-info])')].map(node => node.textContent).join(''),
    marks: marks(root),
  };
}

test('queued public single export rejects an optical request after the actual selector switches to electrical', async () => {
  const cleanup = await mountRecording();
  const raster = rasterFixture();
  const release = await holdQueue();
  try {
    assert.equal(renderedView(), 'optical');
    const opticalMarks = marks(document.querySelector('[data-recording-view]'));
    assert.ok(opticalMarks.length > 0);
    const outcome = window.neuroAtlas.exportChart(slug).then(result => ({ result }), error => ({ error }));
    await selectView('electrical');
    assert.equal(renderedView(), 'electrical');
    const electricalMarks = marks(document.querySelector('[data-recording-view]'));
    assert.ok(electricalMarks.length > 0);
    assert.notDeepEqual(electricalMarks, opticalMarks);
    const before = locationState();
    await release();
    const { error, result } = await outcome;
    const evidence = raster.svgs[0] && imageEvidence(raster.svgs[0]);
    assert.match(error?.message ?? '', /recording view.*retry/i, JSON.stringify({ result, evidence }));
    assert.equal(raster.svgs.length, 0, 'a stale job must not reach rasterization');
    assert.deepEqual(locationState(), before);
    assert.equal(document.querySelectorAll('[data-graph-export-host]').length, 0);
  } finally {
    await release();
    raster.restore();
    await cleanup();
  }
});

test('exportAll skips the stale recording while still returning an unaffected rendered graph', async () => {
  const sibling = fieldVelocityGraph('bci-information-transfer-over-time');
  // Keep this test focused: let unmounted graphs skip without opening a full batch host.
  const cleanup = await mountRecording(optical, {
    hosted: false, siblings: React.createElement(FieldVelocityGraphDetail, { entry: sibling }),
  });
  const raster = rasterFixture();
  const release = await holdQueue();
  try {
    assert.equal(renderedView(), 'optical');
    const batch = window.neuroAtlas.exportAll();
    await selectView('electrical');
    assert.equal(renderedView(), 'electrical');
    const before = locationState();
    await release();
    const { exported, skipped } = await batch;
    assert.deepEqual(exported.map(chart => chart.anchor), [sibling.slug], JSON.stringify(exported));
    assert.deepEqual(skipped, FIELD_VELOCITY_GRAPHS.map(graph => graph.slug).filter(value => value !== sibling.slug));
    assert.equal(raster.svgs.length, 1);
    assert.equal(imageEvidence(raster.svgs[0]).footer, exported[0].url);
    assert.deepEqual(locationState(), before);
  } finally {
    await release();
    raster.restore();
    await cleanup();
  }
});

test('an updated query cannot label a recording before React has rendered the matching view', async () => {
  const cleanup = await mountRecording();
  const raster = rasterFixture();
  try {
    // Change only the URL: withhold the location notification to model the commit gap.
    window.history.pushState({ keep: 'router state' }, '', path + '?recordingView=electrical#retained');
    assert.equal(renderedView(), 'optical');
    const before = locationState();
    await assert.rejects(window.neuroAtlas.exportChart(slug), /recording view.*retry/i);
    assert.equal(raster.svgs.length, 0);
    assert.equal(renderedView(), 'optical');
    assert.deepEqual(locationState(), before);
  } finally {
    raster.restore();
    await cleanup();
  }
});

test('an older registration callback cannot combine its original title with a newer SVG', async () => {
  const cleanup = await mountRecording();
  try {
    const opticalUrl = window.location.href;
    const { getChart } = await whenChartRegistered(slug);
    await selectView('electrical');
    const stale = getChart();
    assert.match(stale.title, /optical/i);
    assert.equal(stale.svg.closest('[data-recording-view]').dataset.recordingView, 'electrical');
    assert.throws(() => buildChartImage(stale, opticalUrl), /recording view.*retry/i);
  } finally { await cleanup(); }
});

test('a queued request from an unready recording detail does not switch to the offscreen host after navigation', async () => {
  const cleanup = await mountRecording('', { ready: false });
  const raster = rasterFixture();
  const release = await holdQueue();
  const hosted = [];
  const unsubscribe = subscribeGraphExport(() => {
    const request = currentGraphExport();
    if (request) hosted.push(request.entry.slug);
  });
  try {
    assert.equal(window.neuroAtlas.charts().find(chart => chart.anchor === slug).open, false);
    const outcome = window.neuroAtlas.exportChart(slug).then(result => ({ result }), error => ({ error }));
    window.history.pushState({ keep: 'new router state' }, '', atlasPath('/field-velocity') + '#metrics');
    const before = locationState();
    await act(async () => { await release(); });
    const { error, result } = await outcome;
    assert.match(error?.message ?? '', /graph not ready/i, JSON.stringify({ result, hosted }));
    assert.deepEqual(hosted, []);
    assert.equal(raster.svgs.length, 0);
    assert.deepEqual(locationState(), before);
  } finally {
    await release();
    unsubscribe();
    raster.restore();
    await cleanup();
  }
});

test('all four rendered views and defaulted queries keep SVG evidence, footer, and filename aligned', async () => {
  const cleanup = await mountRecording();
  const raster = rasterFixture();
  try {
    for (const [query, view, token] of [
      ['historical', 'historical', 'historical'], ['electrical', 'electrical', 'electrical'],
      ['human-channels', 'human-channels', 'human-channels'], ['optical', 'optical', 'optical'],
      ['invalid', 'historical', null], ['optical&recordingView=optical', 'historical', null],
    ]) {
      await act(async () => {
        window.history.pushState({ keep: 'router state' }, '', `${path}?recordingView=${query}&review=1&review=2#retained`);
        window.dispatchEvent(new Event('popstate'));
      });
      assert.equal(renderedView(), view);
      const before = locationState();
      const expectedMarks = marks(document.querySelector('[data-recording-view]'));
      assert.ok(expectedMarks.length > 0 && expectedMarks.every(([id]) => id.startsWith(`${view}:`)));
      const expectedTitle = document.querySelector('[data-recording-view] [data-download-chart]').getAttribute('aria-label').replace('Download PNG: ', '');
      const result = await window.neuroAtlas.exportChart('simultaneously-recorded-neurons');
      const expectedUrl = window.location.origin + path + (token ? `?recordingView=${token}` : '');
      assert.equal(result.anchor, slug);
      assert.equal(result.title, expectedTitle);
      assert.equal(result.url, expectedUrl);
      assert.equal(result.filename, `neuro-atlas-${slug}${token ? `-${token}` : ''}.png`);
      assert.deepEqual(imageEvidence(raster.svgs.at(-1)), { title: expectedTitle, footer: expectedUrl, marks: expectedMarks });
      assert.deepEqual(locationState(), before);
    }
  } finally {
    raster.restore();
    await cleanup();
  }
});

test('a view change after SVG capture cannot change the pending image or its metadata', async () => {
  const cleanup = await mountRecording();
  const entered = defer(), resume = defer();
  const raster = rasterFixture(() => { entered.resolve(); return resume.promise; });
  try {
    const expectedMarks = marks(document.querySelector('[data-recording-view]'));
    const job = window.neuroAtlas.exportChart(slug);
    await entered.promise;
    await selectView('electrical');
    assert.equal(renderedView(), 'electrical');
    const before = locationState();
    resume.resolve();
    const result = await job;
    const expectedUrl = window.location.origin + path + '?recordingView=optical';
    assert.equal(result.filename, `neuro-atlas-${slug}-optical.png`);
    assert.equal(result.url, expectedUrl);
    assert.match(result.title, /optical/i);
    assert.deepEqual(imageEvidence(raster.svgs[0]), { title: result.title, footer: expectedUrl, marks: expectedMarks });
    assert.deepEqual(locationState(), before);
  } finally {
    resume.resolve();
    raster.restore();
    await cleanup();
  }
});

test('the real offscreen host exports the requested view without changing the overview or its rail', async () => {
  const cleanup = await mountRecording('?recordingView=optical&review=1&review=2#metrics', {
    ready: false, pathname: atlasPath('/field-velocity'),
    siblings: React.createElement('div', { 'data-metric-rail': true }),
  });
  const raster = rasterFixture();
  try {
    const rail = document.querySelector('[data-metric-rail]');
    rail.scrollLeft = 193;
    const before = locationState();
    let job;
    await act(async () => { job = window.neuroAtlas.exportChart(slug); });
    let result;
    await act(async () => { result = await job; });
    const evidence = imageEvidence(raster.svgs[0]);
    assert.ok(evidence.marks.length > 0 && evidence.marks.every(([id]) => id.startsWith('optical:')));
    assert.equal(evidence.footer, window.location.origin + path + '?recordingView=optical');
    assert.equal(result.url, evidence.footer);
    assert.equal(result.filename, `neuro-atlas-${slug}-optical.png`);
    assert.equal(currentGraphExport(), null);
    assert.equal(document.querySelectorAll('[data-graph-export-host]').length, 0);
    assert.equal(window.neuroAtlas.charts().find(chart => chart.anchor === slug).open, false);
    assert.equal(rail.scrollLeft, 193);
    assert.deepEqual(locationState(), before);
  } finally {
    raster.restore();
    await cleanup();
  }
});
