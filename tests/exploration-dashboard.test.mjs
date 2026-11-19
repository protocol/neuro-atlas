import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { mount, click } from './modal-helpers.mjs';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { atlasPath } from '../src/lib/atlas-path.ts';

globalThis.React = React;
const graphPage = graphModule.default.default ?? graphModule.default;
const route = '/field-velocity/dashboard';
const bitrate = 'bci-information-transfer-over-time';

async function dashboard(props = {}, setup) {
  const mod = await import('../src/app/field-velocity/dashboard/page.tsx');
  const Page = mod.default.default ?? mod.default;
  return mount(React.createElement(React.StrictMode, null, React.createElement(Page, props)), '', win => {
    win.HTMLElement.prototype.attachEvent = () => {};
    win.HTMLElement.prototype.detachEvent = () => {};
    win.history.replaceState({ keep: true }, '', atlasPath(route) + (props.search ?? ''));
    setup?.(win);
  });
}

test('the graph page adds its real plotted chart to the dashboard route', async () => {
  const cleanup = await mount(await graphPage({ params: Promise.resolve({ slug: bitrate }) }));
  let href;
  try {
    href = document.querySelector('[data-add-to-dashboard]')?.getAttribute('href');
    assert.equal(href, atlasPath(route) + '?add=' + bitrate, 'graph page offers a real Add to dashboard link');
  } finally { await cleanup(); }
  const close = await dashboard({ search: new URL(href, 'https://atlas.example').search });
  try {
    const card = document.querySelector(`[data-dashboard-graph="${bitrate}"]`);
    assert.ok(card?.querySelector('svg [data-source-observation]'), 'the added chart has actual observation marks');
  } finally { await close(); }
});

const loc = () => document.querySelector('[data-dashboard]');
const cards = () => [...document.querySelectorAll('[data-dashboard-graph]')];
const button = (selector) => document.querySelector(selector);
const storage = 'neuro-atlas:dashboards:v1';
const setInput = async (selector, value) => act(async () => {
  const input = document.querySelector(selector);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

test('catalog search can add an independent duplicate; controls reorder and return focus on removal', async () => {
  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    assert.ok(button('[data-dashboard-search]'), 'dashboard has a searchable chart catalog');
    await setInput('[data-dashboard-search]', 'zzzz-nonmatch');
    assert.ok(button('[data-dashboard-no-match]'));
    await setInput('[data-dashboard-search]', 'bitrate');
    const add = button(`[data-dashboard-add="${bitrate}"]`);
    await click(add);
    assert.equal(cards().length, 2);
    assert.ok(cards().every(c => c.querySelector('svg [data-source-observation]')));
    const [a,b] = cards().map(c => c.dataset.dashboardCard);
    await click(cards()[1].querySelector('[data-dashboard-earlier]'));
    assert.deepEqual(cards().map(c => c.dataset.dashboardCard), [b,a]);
    assert.ok(document.activeElement.hasAttribute('data-dashboard-later'));
    await click(cards()[0].querySelector('[data-dashboard-remove]'));
    assert.equal(cards()[0].dataset.dashboardCard, a);
    assert.ok(document.activeElement.hasAttribute('data-dashboard-remove'));
    await click(cards()[0].querySelector('[data-dashboard-remove]'));
    assert.ok(button('[data-dashboard-empty]'));
    assert.ok(document.activeElement.hasAttribute('data-dashboard-search'));
  } finally { await close(); }
});

test('named snapshots reopen on reload and malformed local data is never overwritten', async () => {
  let raw;
  let close = await dashboard({ search: '?add=' + bitrate });
  try {
    assert.ok(button('[data-dashboard-name]'), 'dashboard supports named local saves');
    await setInput('[data-dashboard-name]', 'Interface studies');
    await click(button('[data-dashboard-save]'));
    raw = window.localStorage.getItem(storage);
    assert.ok(raw?.includes('Interface studies'));
  } finally { await close(); }
  close = await dashboard({}, win => win.localStorage.setItem(storage, raw));
  try {
    assert.equal(cards().length, 0);
    await click(button('[data-dashboard-reopen]'));
    assert.equal(cards()[0]?.dataset.dashboardGraph, bitrate);
    assert.equal(button('[data-dashboard-name]').value, 'Interface studies');
  } finally { await close(); }
  close = await dashboard({ search: '?add=' + bitrate }, win => win.localStorage.setItem(storage, '{broken'));
  try {
    assert.match(button('[data-dashboard-error]')?.textContent ?? '', /left unchanged/i);
    assert.equal(cards().length, 1);
    await click(button('[data-dashboard-save]'));
    assert.equal(window.localStorage.getItem(storage), '{broken');
  } finally { await close(); }
});

test('dashboard links reproduce a named comparison without copying unrelated query parameters', async () => {
  let copied;
  let close = await dashboard({ search: '?add=' + bitrate + '&token=omit#omit' }, win => {
    Object.defineProperty(win.navigator, 'clipboard', { value: { async writeText(value) { copied = value; } } });
  });
  try {
    await setInput('[data-dashboard-name]', 'Retina & BCI 🧠');
    assert.ok(button('[data-dashboard-copy]'), 'dashboard has a share-link control');
    await click(button('[data-dashboard-copy]'));
    const url = new URL(copied);
    assert.equal(url.pathname, atlasPath(route));
    assert.equal(url.search, '');
    assert.match(url.hash, /^#d=/);
    assert.ok(!copied.includes('omit'));
  } finally { await close(); }
  close = await dashboard({ search: new URL(copied).hash });
  try {
    assert.equal(button('[data-dashboard-name]').value, 'Retina & BCI 🧠');
    assert.equal(cards()[0]?.dataset.dashboardGraph, bitrate);
    assert.equal(window.localStorage.getItem(storage), null);
  } finally { await close(); }
});

test('untrusted links and saved records reject invalid state and do not partially hydrate', async () => {
  const { readDashboards, readDashboardLink } = await import('../src/lib/dashboard-state.ts');
  assert.equal(readDashboards(JSON.stringify([{ name: 'Good', cards: [{ slug: bitrate }, { slug: '../anything' }] }])), null);
  assert.equal(readDashboards(JSON.stringify([{ name: 'Long'.repeat(17), cards: [] }])), null);
  assert.equal(readDashboards(' '.repeat(65537)), null);
  assert.equal(readDashboardLink('#d=' + 'A'.repeat(9000)), null);
  assert.equal(readDashboardLink('#d=not-a-real-link'), null);
  const close = await dashboard({ search: '?add=' + bitrate + '&add=' + bitrate });
  try {
    assert.equal(cards().length, 0);
    assert.ok(button('[data-dashboard-link-error]'));
  } finally { await close(); }
});

test('layout changes animate card rectangles without scaling content; reduced motion skips animations', async () => {
  const runs = [];
  let reduced = false;
  const close = await dashboard({ search: '?add=' + bitrate }, win => {
    win.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
    win.HTMLElement.prototype.getBoundingClientRect = function () {
      const count = this.parentElement?.children.length ?? 1;
      const width = count === 1 ? 1000 : 480;
      const index = Array.from(this.parentElement?.children ?? []).indexOf(this);
      return { left: (width + 20) * index, top: 0, width, height: 400 };
    };
    win.HTMLElement.prototype.animate = function (frames) {
      const entry = { id: this.dataset.dashboardCard, frames, cancelled: false };
      runs.push(entry);
      return { cancel() { entry.cancelled = true; } };
    };
  });
  try {
    const add = button(`[data-dashboard-add="${bitrate}"]`);
    const existing = cards()[0].dataset.dashboardCard;
    const start = runs.length;
    await click(add);
    const shrink = runs.slice(start).find(run => run.id === existing && run.frames[0].width === '1000px');
    assert.ok(shrink, 'existing card animates from its old rectangle');
    assert.equal(shrink.frames.at(-1).width, '480px');
    assert.ok(shrink.frames.every(frame => !frame.transform?.includes('scale')));
    await click(cards()[1].querySelector('[data-dashboard-remove]'));
    assert.ok(shrink.cancelled);
    assert.ok(runs.some(run => run.frames.at(-1).width === '1000px'));
    reduced = true;
    const count = runs.length;
    await click(add);
    assert.equal(runs.length, count);
    assert.ok(runs.every(run => run.cancelled));
  } finally { await close(); }
});

const recording = 'simultaneous-neural-recordings';
test('recording cards select views independently and never register dashboard charts in the graph export API', async () => {
  const close = await dashboard({ search: '?add=' + recording + '&recordingView=electrical' });
  try {
    await click(button(`[data-dashboard-add="${recording}"]`));
    const controls = cards().map(c => c.querySelector('[data-recording-view-select]'));
    const before = window.location.href;
    const views = () => cards().map(c => c.querySelector('[data-recording-view]').dataset.recordingView);
    assert.deepEqual(views(), ['electrical', 'historical'], 'only the incoming card takes the explicitly linked recording view');
    await act(async () => { controls[0].value = 'optical'; controls[0].dispatchEvent(new Event('change', { bubbles: true })); });
    assert.deepEqual(views(), ['optical', 'historical']);
    assert.equal(window.location.href, before);
    assert.ok(cards().every(c => c.querySelector('svg [data-curve-point]')));
    assert.ok(cards().every(c => /dashboard link/i.test(c.querySelector('[data-exploration-export-disabled]')?.textContent ?? '')));
    const api = await import('../src/lib/chart-export-api.ts');
    let canonical;
    const dispose = api.registerChart(recording, { title: 'independent canonical sentinel', getChart() { return canonical; } });
    try {
      await act(async () => { controls[1].value = 'human-channels'; controls[1].dispatchEvent(new Event('change', { bubbles: true })); });
      assert.equal((await api.whenChartRegistered(recording)).title, 'independent canonical sentinel');
      await click(button('[data-dashboard-save]'));
      const raw = window.localStorage.getItem(storage);
      assert.match(raw, /optical/);
      assert.match(raw, /human-channels/);
    } finally { dispose(); }
  } finally { await close(); }
});

test('bitrate legend changes actual marks and recomputes the visible eligible model without removing evidence', async () => {
  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    const chart = cards()[0];
    const toggle = () => chart.querySelector('[data-exploration-fit-toggle]');
    const fit = () => chart.querySelector('[data-exploration-fit-line]');
    const key = term => [...chart.querySelectorAll('[data-exploration-series]')].find(b => b.textContent.includes(term));
    const marks = () => chart.querySelectorAll('svg [data-source-observation]').length;
    assert.equal(marks(), 14);
    assert.equal(fit(), null);
    assert.ok(toggle(), 'extrapolation is opt-in');
    await click(toggle());
    assert.equal(fit()?.dataset.fitN, '9');
    const geometry = fit().getAttribute('points');
    await click(key('Speech decoding'));
    assert.equal(key('Speech decoding').getAttribute('aria-pressed'), 'false');
    assert.equal(marks(), 9);
    assert.equal(fit()?.dataset.fitN, '4');
    assert.notEqual(fit().getAttribute('points'), geometry);
    await click(key('Cursor / grid control'));
    assert.equal(fit()?.dataset.fitN, '4');
    for (const term of ['Endovascular switch', 'Text selection', 'Handwriting']) await click(key(term));
    assert.equal(marks(), 0);
    assert.equal(fit(), null);
    assert.ok(chart.querySelector('[data-exploration-empty]'));
    assert.equal(chart.querySelectorAll('.draft-plot-data tbody tr').length, 14);
    await click(chart.querySelector('[data-exploration-reset]'));
    assert.equal(marks(), 14);
  } finally { await close(); }
});

test('retinal context is opt-in, animal-extrapolated and geometrically separate from the BCI plot and fit', async () => {
  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    const chart = cards()[0];
    assert.ok(chart.querySelector('[data-sensory-toggle]'), 'BCI exposes sensory context');
    assert.ok(!chart.querySelector('[data-sensory-context]'));
    await click(chart.querySelector('[data-exploration-fit-toggle]'));
    const svg = chart.querySelector('svg.draft-plot-svg').outerHTML;
    await click(chart.querySelector('[data-sensory-toggle]'));
    const panel = chart.querySelector('[data-sensory-context]');
    assert.equal(panel.querySelector('[data-retinal-bits-per-second]').dataset.retinalBitsPerSecond, '8750000');
    assert.match(panel.textContent, /≈9 Mb\/s.*guinea pig/s);
    assert.match(panel.textContent, /ear.*no verified direct human whole-auditory-nerve rate/is);
    assert.equal(panel.querySelector('a').href, 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/');
    assert.equal(chart.querySelector('svg.draft-plot-svg').outerHTML, svg);
  } finally { await close(); }
});

const tissue = 'selected-tissue-volume-checkpoints';
test('tissue reference lines and the nominal voxel view reuse the brain model without changing original evidence', async () => {
  const close = await dashboard({ search: '?add=' + tissue }, win => { win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} }); });
  try {
    const chart = cards()[0];
    const el = s => chart.querySelector(s);
    const references = () => [...chart.querySelectorAll('[data-brain-scale-reference]')].map(ref => +ref.dataset.value);
    const axes = () => el('svg.draft-plot-svg text').textContent;
    const svg = () => el('svg.draft-plot-svg').outerHTML;
    const original = svg();
    const evidence = el('.draft-plot-data table').textContent;
    assert.deepEqual(references(), []);
    assert.ok(el('[data-brain-scale-toggle]'), 'tissue chart has an anatomical scale switch');
    await click(el('[data-brain-scale-toggle]'));
    assert.deepEqual(references(), [.45, 78.55, 1200]);
    await click(el('[data-voxel-view-toggle]'));
    assert.match(axes(), /Nominal image voxels/);
    assert.deepEqual(references().map(n => n.toPrecision(5)), ['7.0313e+17', '1.2273e+20', '1.8750e+21']);
    assert.equal(el('.draft-plot-data table').textContent, evidence);
    await click(el('[data-voxel-view-toggle]'));
    await click(el('[data-brain-scale-toggle]'));
    assert.equal(svg(), original);
  } finally { await close(); }
});

test('Trends legend hides the selected keyword line and hit targets, preserving source rows', async () => {
  const close = await dashboard({ search: '?add=neurotech-search-terms' });
  try {
    const card = cards()[0];
    assert.equal(card.querySelectorAll('[data-trend-line]').length, 2);
    const keys = [...card.querySelectorAll('[data-exploration-series]')];
    assert.equal(keys.length, 2, 'mounted Trends plot has two keyword filters');
    const rows = card.querySelectorAll('[data-trends-row]').length;
    const hidden = keys[0].dataset.explorationSeries;
    await click(keys[0]);
    assert.equal(card.querySelectorAll('[data-trend-line]').length, 1);
    assert.ok([...card.querySelectorAll('[data-trend-point]')].every(p => p.dataset.term !== hidden));
    await click(keys[1]);
    assert.equal(card.querySelectorAll('[data-trend-line]').length, 0);
    assert.ok(card.querySelector('[data-exploration-empty]'));
    assert.equal(card.querySelectorAll('[data-trends-row]').length, rows);
  } finally { await close(); }
});

test('publication filter hides the selected comparison line and its targets without rebasing the axis', async () => {
  const close = await dashboard({ search: '?add=neurotech-papers-per-year' });
  try {
    const card = cards()[0];
    const ticks = () => [...card.querySelectorAll('[data-annual-index-tick]')].map(t => t.textContent);
    const initial = ticks();
    assert.ok(initial.length > 0);
    const key = card.querySelector('[data-exploration-series="all-research"]');
    assert.ok(key, 'annual publications exposes its science reference key');
    await click(key);
    assert.equal(card.querySelector('polyline[data-science-context]'), null);
    assert.equal(card.querySelectorAll('[data-science-year]').length, 0);
    assert.ok(card.querySelector('polygon[data-science-context]'));
    assert.deepEqual(ticks(), initial);
    assert.ok(card.querySelector('table'));
  } finally { await close(); }
});

test('Add to dashboard carries an explored standalone view into an independently shareable card', async () => {
  let href, shared;
  const close = await mount(await graphPage({ params: Promise.resolve({ slug: bitrate }) }));
  try {
    await click(button('[data-exploration-series="Speech decoding"]'));
    await click(button('[data-exploration-fit-toggle]'));
    assert.ok(button('[data-exploration-export-disabled]'));
    href = button('[data-add-to-dashboard]').href;
    assert.match(new URL(href).hash, /^#d=/, 'Add link carries the selected exploration');
  } finally { await close(); }
  const done = await dashboard({ search: new URL(href).hash }, win => {
    Object.defineProperty(win.navigator, 'clipboard', { value: { async writeText(value) { shared = value; } } });
  });
  try {
    assert.equal(button('[data-exploration-series="Speech decoding"]').getAttribute('aria-pressed'), 'false');
    assert.equal(button('[data-exploration-fit-line]').dataset.fitN, '4');
    await click(button('[data-dashboard-copy]'));
    assert.equal(new URL(shared).hash, new URL(href).hash);
  } finally { await done(); }
});

test('a recording legend hides the plotted view without conflating its track with another recording view', async () => {
  const close = await dashboard({ search: '?add=' + recording });
  try {
    const key = button('[data-exploration-series="historical"]');
    assert.ok(key, 'recording plot exposes its track in the legend');
    await click(key);
    assert.equal(document.querySelectorAll('[data-curve-point]').length, 0);
    assert.equal(document.querySelectorAll('svg [data-historical-fit]').length, 0);
    assert.ok(button('[data-exploration-empty]'));
    assert.ok(button('[data-recording-source-json]'));
    const selector = button('[data-recording-view-select]');
    await act(async () => { selector.value = 'optical'; selector.dispatchEvent(new Event('change', { bubbles: true })); });
    assert.ok(document.querySelectorAll('[data-curve-point]').length > 0);
    assert.equal(button('[data-exploration-empty]'), null);
    await act(async () => { selector.value = 'historical'; selector.dispatchEvent(new Event('change', { bubbles: true })); });
    assert.equal(document.querySelectorAll('[data-curve-point]').length, 0);
  } finally { await close(); }
});

test('acquisition continuations stay in separate method families and omit prospective observations', async () => {
  const close = await dashboard({ search: '?add=estimated-acquisition-efficiency-voxels-per-dollar' });
  try {
    const chart = cards()[0];
    await click(chart.querySelector('[data-exploration-fit-toggle]'));
    const fitted = () => [...chart.querySelectorAll('[data-exploration-fit-line]')].map(node => [node.dataset.explorationFitLine, node.dataset.fitN, node.getAttribute('points')]);
    const before = fitted();
    assert.deepEqual(before.map(row => row.slice(0,2)), [['Expansion microscopy · estimates','4'], ['EM · reported-tech estimates','4']]);
    await click(chart.querySelector('[data-exploration-series="PEEM · prospective"]'));
    assert.equal(chart.querySelector('svg [data-source-observation="peem2024"]'), null);
    assert.deepEqual(fitted(), before);
    await click(chart.querySelector('[data-exploration-series="Expansion microscopy · estimates"]'));
    assert.deepEqual(fitted().map(row => row.slice(0,2)), [['EM · reported-tech estimates','4']]);
  } finally { await close(); }
});

test('growth comparison baselines survive a shared dashboard and stay independent between cards', async () => {
  let shared;
  const slug = 'publication-growth-by-group';
  let close = await dashboard({ search: '?add=' + slug }, win => {
    Object.defineProperty(win.navigator, 'clipboard', { value: { async writeText(value) { shared = value; } } });
  });
  const states = () => cards().map(card => card.querySelector('[data-growth-baseline]').dataset.growthBaseline);
  try {
    await click(button(`[data-dashboard-add="${slug}"]`));
    await click(cards()[0].querySelector('[data-baseline-option="matched"]'));
    assert.deepEqual(states(), ['matched','science']);
    await click(button('[data-dashboard-copy]'));
  } finally { await close(); }
  close = await dashboard({ search: new URL(shared).hash });
  try { assert.deepEqual(states(), ['matched','science'], 'copied comparison reproduces its selected baselines'); }
  finally { await close(); }
});

test('a chart brought from another graph can be added to a saved dashboard without overwriting the saved original', async () => {
  const saved = JSON.stringify([{ name: 'Signal comparison', cards: [{ slug: recording, settings: { recordingView: 'optical' } }] }]);
  const close = await dashboard({ search: '?add=' + bitrate }, win => win.localStorage.setItem(storage, saved));
  try {
    const action = button('[data-dashboard-append-saved]');
    assert.ok(action, 'a new chart can be appended to a named dashboard');
    action.focus();
    await click(action);
    assert.ok(document.activeElement.hasAttribute('data-dashboard-name'), 'focus moves to the dashboard name when the append control disappears');
    assert.deepEqual(cards().map(card => card.dataset.dashboardGraph), [recording, bitrate]);
    assert.equal(cards()[0].querySelector('[data-recording-view]').dataset.recordingView, 'optical');
    assert.equal(button('[data-dashboard-name]').value, 'Signal comparison');
    assert.equal(window.localStorage.getItem(storage), saved);
    await click(button('[data-dashboard-save]'));
    assert.equal(JSON.parse(window.localStorage.getItem(storage))[0].cards.length, 2);
  } finally { await close(); }
});
