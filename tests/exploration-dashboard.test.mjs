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
