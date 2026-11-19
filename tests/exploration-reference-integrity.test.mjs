import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import React from 'react';
import dashboardModule from '../src/app/field-velocity/dashboard/page.tsx';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { readDashboardLink } from '../src/lib/dashboard-state.ts';
import { brainScaleClock } from './brain-scale-helpers.mjs';
import { click, mount } from './modal-helpers.mjs';

globalThis.React = React;
const graphPage = graphModule.default.default ?? graphModule.default;
const DashboardPage = dashboardModule.default ?? dashboardModule;
const tissue = 'selected-tissue-volume-checkpoints';
const query = selector => document.querySelector(selector);
const checksum = data => createHash('sha256').update(data).digest('hex');

async function mountGraph(slug, clock = brainScaleClock(true)) {
  return mount(await graphPage({ params: Promise.resolve({ slug }) }), '', win => {
    win.history.replaceState({}, '', atlasPath(`/field-velocity/${slug}`));
    clock.configure(win);
  });
}

test('F6: tissue source JSON bytes and evidence table stay in cm³ across both switches', async () => {
  const close = await mountGraph(tissue);
  try {
    const download = () => query('[data-selected-plot-json]');
    const href = () => download().getAttribute('href');
    const original = href();
    const source = JSON.parse(decodeURIComponent(original.slice(original.indexOf(',') + 1)));
    const bock = source.points.find(point => point.id === 'bock-mouse-imaged-2011-01-01');
    assert.equal(bock.y, 0.00000819);
    assert.ok(bock.sourceUrl && bock.quote && bock.note, 'the Bock observation retains its source and scope');
    assert.match(source.yLabel, /cm³/);
    assert.match(source.scope, /Values are converted to cm³/);
    assert.equal(source.points.length, 8);
    assert.equal(download().download, 'neuro-atlas-tissue-cm3.json');
    assert.equal(download().textContent, 'Download selected data and sources JSON');
    const originalTable = query('.draft-plot-data table').textContent;
    const verifySource = mode => {
      assert.equal(checksum(href()), checksum(original), `${mode} must keep the source download byte-identical`);
      assert.equal(download().download, 'neuro-atlas-tissue-cm3.json');
      assert.equal(query('.draft-plot-data table').textContent, originalTable);
    };
    await click(query('[data-brain-scale-toggle]'));
    assert.equal(document.querySelectorAll('[data-brain-scale-reference]').length, 3);
    verifySource('whole-brain scale');
    await click(query('[data-voxel-view-toggle]'));
    assert.match(query('svg.draft-plot-svg .draft-plot-axis-title').textContent, /Nominal image voxels/);
    verifySource('both switches on');
    await click(query('[data-brain-scale-toggle]'));
    assert.equal(document.querySelectorAll('[data-brain-scale-reference]').length, 0);
    verifySource('voxels without reference lines');
    await click(query('[data-voxel-view-toggle]'));
    verifySource('both switches off again');
  } finally { await close(); }
});

test('F6: modeled marks are labeled in the SVG even without references; reverting restores the exact off SVG', async () => {
  const close = await mountGraph(tissue);
  try {
    const svg = () => query('svg.draft-plot-svg');
    const legend = () => query('.draft-plot-legend').textContent;
    const original = checksum(svg().outerHTML);
    const defaultLegend = legend();
    assert.match(defaultLegend, /Source-reported/);
    await click(query('[data-voxel-view-toggle]'));
    assert.match(svg().querySelector('.draft-plot-axis-title').textContent, /Modeled equivalents/);
    assert.match(legend(), /Modeled equivalents/);
    assert.doesNotMatch(legend(), /Source-reported/);
    await click(query('[data-voxel-view-toggle]'));
    assert.equal(checksum(svg().outerHTML), original);
    assert.equal(legend(), defaultLegend);
  } finally { await close(); }
});

const dashboardPath = atlasPath('/field-velocity/dashboard');
const referenceLines = root => [...root.querySelectorAll('[data-brain-scale-reference]')].map(line => ({
  id: line.getAttribute('data-brain-scale-reference'),
  value: line.getAttribute('data-value'),
  label: line.parentElement.querySelector('text').textContent,
}));
const mountDashboard = (url, writeText) => mount(React.createElement(DashboardPage), '', win => {
  win.history.replaceState({}, '', url);
  brainScaleClock(true).configure(win);
  if (writeText) Object.defineProperty(win.navigator, 'clipboard', { value: { writeText } });
});

for (const [slug, lineCount] of [
  ['selected-public-image-resource-footprints', 3],
  ['estimated-acquisition-efficiency-voxels-per-dollar', 5],
]) test(`F9: ${slug} transfers its live benchmark and reopens with the same references`, async () => {
  const anchor = fieldVelocityGraph(slug).target;
  const clock = brainScaleClock();
  const close = await mountGraph(slug, clock);
  let href, references;
  try {
    const addLink = () => new URL(query('[data-add-to-dashboard]').href);
    const graph = () => query('figure.draft-plot');
    const download = () => query('[data-download-chart]');
    const registered = () => whenChartRegistered(anchor, 0);
    assert.equal(addLink().pathname + addLink().search, `${dashboardPath}?add=${slug}`);
    assert.equal(addLink().hash, '');
    assert.deepEqual(referenceLines(graph()), []);
    const original = (await registered()).getChart();
    const originalImage = buildChartImage(original, window.location.href);
    const sourceHref = query('[data-selected-plot-json]')?.getAttribute('href');
    const sourceTable = query('.draft-plot-data table').textContent;

    await click(query('[data-brain-scale-toggle]'));
    await clock.advance(350);
    assert.equal(graph().dataset.brainScaleState, 'animating');
    assert.equal(download()?.disabled, true);
    assert.equal(query('[data-copy-chart]')?.disabled, true);
    assert.equal(await registered(), undefined);

    await clock.advance(350);
    assert.equal(graph().dataset.brainScaleState, 'on');
    assert.equal(download()?.disabled, false);
    assert.equal(query('[data-copy-chart]')?.disabled, false);
    references = referenceLines(graph());
    assert.equal(references.length, lineCount);
    const selected = (await registered()).getChart();
    const image = buildChartImage(selected, window.location.href);
    const exported = new window.DOMParser().parseFromString(image.svg, 'image/svg+xml');
    const exportedLabels = [...exported.querySelectorAll('text')].map(text => text.textContent);
    for (const { label } of references) assert.ok(exportedLabels.includes(label), `export preserves reference label: ${label}`);
    assert.ok(original.notes.every(note => selected.notes.includes(note)), 'existing source qualifiers survive selected export');
    assert.equal(image.url, originalImage.url);
    assert.equal(image.filename, originalImage.filename);
    assert.equal(query('[data-selected-plot-json]')?.getAttribute('href'), sourceHref);
    assert.equal(query('.draft-plot-data table').textContent, sourceTable);

    href = addLink();
    assert.equal(href.pathname, dashboardPath);
    const incoming = readDashboardLink(href.hash);
    assert.ok(incoming, 'Add must encode the visible benchmark in a dashboard snapshot');
    assert.equal(href.search, '');
    assert.equal(incoming.cards.length, 1);
    assert.equal(incoming.cards[0].slug, slug);
    assert.equal(incoming.cards[0].settings.benchmark, true);

    if (slug === 'estimated-acquisition-efficiency-voxels-per-dollar') {
      const filter = query('[data-exploration-series="EM · reported-tech estimates"]');
      await click(filter);
      assert.ok(query('[data-exploration-export-disabled]'), 'a supported benchmark does not unblock an unsupported filter');
      assert.equal(await registered(), undefined);
      await click(filter);
    }
    await click(query('[data-brain-scale-toggle]'));
    await clock.advance(700);
    assert.equal(addLink().search, `?add=${slug}`);
    assert.equal(addLink().hash, '');
    assert.equal(checksum(buildChartImage((await registered()).getChart(), window.location.href).svg), checksum(originalImage.svg));
  } finally { await close(); }

  const verifyCard = () => {
    const card = query(`[data-dashboard-graph="${slug}"]`);
    assert.ok(card, 'the dashboard mounted the transferred graph');
    assert.equal(card.querySelector('[data-brain-scale-toggle]').getAttribute('aria-checked'), 'true');
    assert.deepEqual(referenceLines(card), references);
    assert.equal(card.querySelectorAll('[data-download-chart]').length, 0);
  };
  let copied;
  const closeDashboard = await mountDashboard(href, async url => { copied = new URL(url); });
  try {
    verifyCard();
    await click(query('[data-dashboard-copy]'));
    assert.equal(copied.hash, href.hash);
    assert.equal(readDashboardLink(copied.hash).cards[0].settings.benchmark, true);
  } finally { await closeDashboard(); }

  const closeReopened = await mountDashboard(copied);
  try { verifyCard(); } finally { await closeReopened(); }
});
