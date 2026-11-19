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

const catalogToggle = () => button('[data-dashboard-catalog-toggle]');
const openCatalog = async () => { if (catalogToggle()?.getAttribute('aria-expanded') === 'false') await click(catalogToggle()); };

test('Add chart opens a focused catalog and Escape returns to the trigger', async () => {
  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    const trigger = catalogToggle();
    assert.ok(trigger, 'a populated dashboard has an Add chart disclosure');
    assert.equal(trigger.type, 'button');
    assert.equal(trigger.textContent.trim(), 'Add chart');
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(panel?.hidden, true);
    await click(trigger);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.hidden, false);
    const search = button('[data-dashboard-search]');
    assert.ok(document.activeElement === search, 'opening moves focus into search');
    await setInput('[data-dashboard-search]', 'bitrate');
    const result = button(`[data-dashboard-add="${bitrate}"]`);
    result.focus();
    await click(result);
    assert.equal(cards().length, 2);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.ok(document.activeElement === result, 'adding a chart keeps focus available for repeat adds');
    await act(async () => result.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(panel.hidden, true);
    assert.ok(document.activeElement === trigger, 'Escape restores focus to Add chart');
    await click(trigger);
    assert.equal(search.value, 'bitrate');
  } finally { await close(); }
});

test('an empty dashboard starts with its chart catalog open without stealing focus', async () => {
  const close = await dashboard();
  try {
    assert.equal(cards().length, 0);
    assert.equal(catalogToggle()?.getAttribute('aria-expanded'), 'true');
    assert.ok(!button('[data-dashboard-search]').closest('[hidden]'));
    assert.ok(document.activeElement === document.body);
  } finally { await close(); }
});

test('the open catalog disables results at the card cap without stranding focus', async () => {
  const { CARD_LIMIT, dashboardHash } = await import('../src/lib/dashboard-state.ts');
  const close = await dashboard({ search: dashboardHash({ name: 'Almost full', cards: Array.from({ length: CARD_LIMIT - 1 }, () => ({ slug: bitrate })) }) });
  try {
    await openCatalog();
    const result = button(`[data-dashboard-add="${bitrate}"]`);
    result.focus();
    await click(result);
    assert.equal(cards().length, CARD_LIMIT);
    const results = [...loc().querySelectorAll('[data-dashboard-add]')];
    assert.equal(results.length, 25);
    assert.ok(results.every(option => option.disabled));
    assert.match(loc().textContent, /Dashboard full/);
    assert.ok(document.activeElement === button('[data-dashboard-search]'), 'a result disabled by the last add returns focus to search');
    await click(result);
    assert.equal(cards().length, CARD_LIMIT);
    await click(cards().at(-1).querySelector('[data-dashboard-remove]'));
    assert.ok(results.every(option => !option.disabled));
  } finally { await close(); }
});

test('catalog search can add an independent duplicate; controls reorder and return focus on removal', async () => {
  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    await openCatalog();
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
    await click(catalogToggle());
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
    await openCatalog();
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
    await openCatalog();
    await click(button(`[data-dashboard-add="${recording}"]`));
    const controls = cards().map(c => c.querySelector('[data-recording-view-select]'));
    const before = window.location.href;
    const views = () => cards().map(c => c.querySelector('[data-recording-view]').dataset.recordingView);
    assert.deepEqual(views(), ['electrical', 'historical'], 'only the incoming card takes the explicitly linked recording view');
    await act(async () => { controls[0].value = 'optical'; controls[0].dispatchEvent(new Event('change', { bubbles: true })); });
    assert.deepEqual(views(), ['optical', 'historical']);
    assert.equal(window.location.href, before);
    assert.ok(cards().every(c => c.querySelector('svg [data-curve-point]')));
    assert.ok(cards().every(c => c.querySelector('[data-exploration-export-disabled]')?.hidden));
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

test('image export guidance appears once above cards and the dashboard link remains copyable on clipboard failure', async () => {
  const close = await dashboard({ search: '?add=' + bitrate }, win => {
    Object.defineProperty(win.navigator, 'clipboard', { value: { async writeText() { throw new Error('clipboard unavailable'); } } });
  });
  try {
    await openCatalog();
    await click(button(`[data-dashboard-add="${bitrate}"]`));
    const notes = [...document.querySelectorAll('.exploration-export-note')];
    assert.equal(notes.length, 1, 'only one dashboard export explanation is rendered');
    assert.ok(!notes[0].closest('[data-dashboard-card]'));
    assert.match(notes[0].textContent, /Image export is unavailable.*Copy dashboard link/);
    assert.equal(document.querySelectorAll('[data-chart-actions], [data-copy-chart], [data-download-chart], [data-copy-draft-link]').length, 0);
    await click(button('[data-dashboard-copy]'));
    const fallback = button('[data-dashboard-copy-fallback]');
    assert.ok(fallback?.readOnly);
    assert.equal(new URL(fallback.value).pathname, atlasPath(route));
    fallback.focus();
    assert.equal(fallback.selectionStart, 0);
    assert.equal(fallback.selectionEnd, fallback.value.length);
    const { readDashboardLink } = await import('../src/lib/dashboard-state.ts');
    assert.deepEqual(readDashboardLink(new URL(fallback.value).hash)?.cards, [{ slug: bitrate }, { slug: bitrate }]);
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

test('bitrate controls sit between the plot and the study key even with diagnostics open', async () => {
  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    const chart = cards()[0];
    const el = selector => chart.querySelector(selector);
    const before = (a, b) => !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    const svg = el('svg.draft-plot-svg');
    const study = el('[data-point-annotation]');
    const fit = el('[data-exploration-fit-toggle]');
    const sensory = el('[data-sensory-toggle]');
    const filters = [...chart.querySelectorAll('[data-exploration-series]')];
    assert.ok(filters.length > 0);
    for (const control of [...filters, fit, sensory]) {
      assert.ok(before(svg, control) && before(control, study), 'plot controls precede the long study key');
    }
    await click(fit);
    assert.ok(before(sensory, el('[data-exploration-fit-diagnostics]')), 'both switches are reachable before fit diagnostics');
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

test('the long dashboard Source key starts collapsed with every standalone annotation and source row intact', async () => {
  const keyRows = () => [...document.querySelectorAll('[data-point-annotation]')].map(row => [row.dataset.pointAnnotation, row.textContent, row.getAttribute('aria-label')]);
  const sourceRows = () => [...document.querySelectorAll('.draft-plot-data tbody tr')].map(row => row.innerHTML);
  const standalone = await mount(await graphPage({ params: Promise.resolve({ slug: bitrate }) }));
  let expectedKey, expectedSources;
  try {
    expectedKey = keyRows();
    expectedSources = sourceRows();
    assert.equal(expectedKey.length, 14);
    assert.equal(expectedSources.length, 14);
    assert.ok(!button('[data-point-annotation]').closest('details'), 'standalone annotations remain visible');
  } finally { await standalone(); }

  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    const disclosure = button('details[data-dashboard-source-key]');
    assert.ok(disclosure, 'long dashboard annotation keys have a native disclosure');
    const summary = disclosure.querySelector('summary');
    assert.match(summary.textContent, /Source key.*14/);
    assert.equal(disclosure.open, false);
    assert.equal(disclosure.querySelectorAll('[data-point-annotation]').length, 14);
    const svg = button('svg.draft-plot-svg').outerHTML;
    await click(summary);
    assert.equal(disclosure.open, true);
    assert.deepEqual(keyRows(), expectedKey);
    assert.deepEqual(sourceRows(), expectedSources);
    await click(summary);
    assert.equal(disclosure.open, false);
    assert.equal(button('svg.draft-plot-svg').outerHTML, svg);
  } finally { await close(); }
});

test('draft dashboard cards show one visual title without losing the SVG label or full graph link', async () => {
  const standalone = await mount(await graphPage({ params: Promise.resolve({ slug: bitrate }) }));
  try { assert.ok(!button('.draft-plot > figcaption').classList.contains('sr-only')); }
  finally { await standalone(); }

  const close = await dashboard({ search: '?add=' + bitrate });
  try {
    const card = cards()[0];
    const svg = card.querySelector('svg.draft-plot-svg');
    const caption = document.getElementById(svg.getAttribute('aria-labelledby'));
    assert.equal(card.querySelector('h2').textContent, `1. ${caption.textContent}`);
    assert.ok(caption.classList.contains('sr-only'), 'the duplicate caption is visually suppressed but still names the SVG');
    const link = card.querySelector('[data-dashboard-open-graph]');
    assert.equal(link?.textContent, 'Open full graph');
    assert.equal(link?.getAttribute('href'), atlasPath('/field-velocity/' + bitrate));
  } finally { await close(); }
});

const tissue = 'selected-tissue-volume-checkpoints';
test('motion: changing a real card setting or legend does not animate either existing card', async () => {
  const animated = [];
  const close = await dashboard({ search: '?add=' + bitrate }, win => {
    win.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: 400 });
    win.HTMLElement.prototype.animate = function () {
      animated.push(this.dataset.dashboardGraph);
      return { cancel() {} };
    };
  });
  try {
    await click(button(`[data-dashboard-add="${tissue}"]`));
    assert.ok(animated.includes(tissue), 'the real structural add animates the entering sibling');
    animated.length = 0;
    await click(cards()[0].querySelector('[data-exploration-fit-toggle]'));
    assert.equal(cards()[0].querySelector('[data-exploration-fit-line]')?.dataset.fitN, '9');
    assert.deepEqual(animated, [], 'no layout animation after an extrapolation-only change');
    await click(cards()[0].querySelector('[data-exploration-series="Speech decoding"]'));
    assert.equal(cards()[0].querySelector('[data-exploration-fit-line]')?.dataset.fitN, '4');
    assert.deepEqual(animated, [], 'no layout animation after a legend-only change');
  } finally { await close(); }
});

const named = (name, ...slugs) => ({ name, cards: slugs.map(slug => ({ slug })) });
const savedRaw = () => window.localStorage.getItem(storage);
const writeFromPeer = (raw, notify = true) => act(async () => {
  const local = window.localStorage;
  const oldValue = local.getItem(storage);
  if (raw === null) local.removeItem(storage); else local.setItem(storage, raw);
  if (notify) window.dispatchEvent(new window.StorageEvent('storage', { key: storage, storageArea: local, oldValue, newValue: raw }));
});
const reopenNamed = name => click([...document.querySelectorAll('[data-dashboard-reopen]')].find(el => el.textContent === name));
const slugsShown = () => cards().map(card => card.dataset.dashboardGraph);
const saveLocally = () => click(button('[data-dashboard-save]'));

test('custody: a peer update cannot overwrite the opened draft or be overwritten by it', async () => {
  const old = JSON.stringify([named('Comparison', bitrate)]);
  const latest = [named('Comparison', tissue), named('Other', recording)];
  const peerBytes = JSON.stringify(latest, null, 2);
  const close = await dashboard({}, win => {
    win.localStorage.setItem(storage, old);
    win.localStorage.setItem('unrelated', 'untouched');
  });
  try {
    await reopenNamed('Comparison');
    await click(cards()[0].querySelector('[data-exploration-fit-toggle]'));
    await writeFromPeer(peerBytes);
    assert.deepEqual(slugsShown(), [bitrate]);
    await saveLocally();
    assert.equal(savedRaw(), peerBytes, 'a stale Save must preserve exact peer bytes');
    assert.match(button('[data-dashboard-save-conflict]')?.textContent ?? '', /new name.*reopen/i);
    assert.equal(cards()[0].querySelector('[data-exploration-fit-line]')?.dataset.fitN, '9');
    assert.deepEqual([...document.querySelectorAll('[data-dashboard-reopen]')].map(el => el.textContent), ['Comparison', 'Other']);
    await saveLocally();
    assert.equal(savedRaw(), peerBytes, 'an ordinary retry still cannot take custody');
    await setInput('[data-dashboard-name]', 'My comparison');
    await saveLocally();
    assert.deepEqual(JSON.parse(savedRaw()), [...latest, { name: 'My comparison', cards: [{ slug: bitrate, settings: { extrapolate: true } }] }]);
    assert.equal(window.localStorage.getItem('unrelated'), 'untouched');
    await reopenNamed('Comparison');
    assert.deepEqual(slugsShown(), [tissue]);
    assert.equal(Boolean(button('[data-dashboard-save-conflict]')), false);
  } finally { await close(); }
});

test('custody: storage events refresh the saved list before a reopen, not the active draft', async () => {
  const close = await dashboard({ search: '?add=' + bitrate }, win => {
    win.localStorage.setItem(storage, JSON.stringify([named('Comparison', bitrate)]));
  });
  try {
    await setInput('[data-dashboard-name]', 'Unsaved draft');
    const newer = JSON.stringify([named('Comparison', tissue), named('Other', recording)]);
    await writeFromPeer(newer);
    assert.equal(button('[data-dashboard-name]').value, 'Unsaved draft');
    assert.deepEqual(slugsShown(), [bitrate]);
    assert.deepEqual([...document.querySelectorAll('[data-dashboard-reopen]')].map(el => el.textContent), ['Comparison', 'Other']);
    await reopenNamed('Comparison');
    assert.deepEqual(slugsShown(), [tissue]);
    assert.equal(savedRaw(), newer);
  } finally { await close(); }
});

test('custody: appending binds the target version even if a peer deletes it before the storage event', async () => {
  const close = await dashboard({ search: '?add=' + bitrate }, win => {
    win.localStorage.setItem(storage, JSON.stringify([named('Comparison', tissue)]));
  });
  try {
    await click(button('[data-dashboard-append-saved]'));
    const newer = JSON.stringify([named('Other', recording)]);
    await writeFromPeer(newer, false);
    await saveLocally();
    assert.equal(savedRaw(), newer);
    assert.deepEqual(slugsShown(), [tissue, bitrate]);
    assert.ok(button('[data-dashboard-save-conflict]'));
  } finally { await close(); }
});

test('custody: ordinary rename saves a copy and later updates obey the newly saved version', async () => {
  const initial = { name: 'Comparison', cards: [{ slug: bitrate, settings: { sensory: true, extrapolate: false } }] };
  const close = await dashboard({}, win => win.localStorage.setItem(storage, JSON.stringify([initial])));
  try {
    await reopenNamed('Comparison');
    await setInput('[data-dashboard-name]', 'New name');
    await saveLocally();
    await click(cards()[0].querySelector('[data-exploration-fit-toggle]'));
    await saveLocally();
    assert.deepEqual(JSON.parse(savedRaw()), [initial, { name: 'New name', cards: [{ slug: bitrate, settings: { sensory: true, extrapolate: true } }] }]);
  } finally { await close(); }
});

test('custody: a same-name imported link never claims the saved dashboard', async () => {
  const { dashboardHash } = await import('../src/lib/dashboard-state.ts');
  const local = JSON.stringify([named('Comparison', tissue)]);
  const close = await dashboard({ search: dashboardHash(named('Comparison', bitrate)) }, win => win.localStorage.setItem(storage, local));
  try {
    await saveLocally();
    assert.equal(savedRaw(), local);
    assert.deepEqual(slugsShown(), [bitrate]);
    assert.ok(button('[data-dashboard-save-conflict]'));
  } finally { await close(); }
});

test('custody lock: save checks storage only after obtaining the same-origin dashboard lock', async () => {
  const original = JSON.stringify([named('Comparison', bitrate)]);
  const close = await dashboard({}, win => win.localStorage.setItem(storage, original));
  let grant;
  const installLock = () => Object.defineProperty(window.navigator, 'locks', { value: {
    request(key, opts, callback) {
      assert.equal(key, storage);
      assert.equal(opts.ifAvailable, true);
      return new Promise(resolve => { grant = lock => resolve(callback(lock)); });
    },
  } });
  try {
    await reopenNamed('Comparison');
    await click(cards()[0].querySelector('[data-exploration-fit-toggle]'));
    installLock();
    await saveLocally();
    assert.equal(typeof grant, 'function', 'Save must request a lock when available');
    await act(async () => grant(null));
    assert.equal(savedRaw(), original);
    assert.match(button('[data-dashboard-error]')?.textContent ?? '', /another tab/i);
    await saveLocally();
    const peer = JSON.stringify([named('Comparison', tissue)]);
    await writeFromPeer(peer, false);
    await act(async () => grant({ name: storage }));
    assert.equal(savedRaw(), peer);
    assert.ok(button('[data-dashboard-save-conflict]'));
    await setInput('[data-dashboard-name]', 'New draft');
    await saveLocally();
    await setInput('[data-dashboard-name]', 'Changed while waiting');
    await act(async () => grant({ name: storage }));
    assert.equal(savedRaw(), peer);
    assert.equal(button('[data-dashboard-name]').value, 'Changed while waiting');
  } finally { await close(); }
});

const hashNavigation = navigate => act(async () => {
  await new Promise(resolve => {
    window.addEventListener('hashchange', resolve, { once: true });
    navigate();
  });
});

test('history: pristine linked comparisons follow actual hash changes, Back and Forward', { timeout: 5000 }, async () => {
  const { dashboardHash } = await import('../src/lib/dashboard-state.ts');
  const first = dashboardHash(named('First', bitrate));
  const second = dashboardHash(named('Second', tissue));
  const close = await dashboard({ search: first });
  try {
    assert.deepEqual(slugsShown(), [bitrate]);
    await hashNavigation(() => { window.location.hash = second; });
    assert.equal(button('[data-dashboard-name]').value, 'Second');
    assert.deepEqual(slugsShown(), [tissue]);
    assert.ok(cards()[0].querySelector('svg [data-source-observation]'));
    const sameCard = cards()[0].dataset.dashboardCard;
    await act(async () => window.dispatchEvent(new window.HashChangeEvent('hashchange')));
    assert.equal(cards()[0].dataset.dashboardCard, sameCard, 'repeat events do not reset the mounted card');
    await hashNavigation(() => window.history.back());
    assert.equal(button('[data-dashboard-name]').value, 'First');
    assert.deepEqual(slugsShown(), [bitrate]);
    await hashNavigation(() => window.history.forward());
    assert.equal(button('[data-dashboard-name]').value, 'Second');
    assert.deepEqual(slugsShown(), [tissue]);
    assert.equal(savedRaw(), null);
  } finally { await close(); }
});

test('history: a settings-only draft stays put until the user chooses to open the linked comparison', { timeout: 5000 }, async () => {
  const { dashboardHash } = await import('../src/lib/dashboard-state.ts');
  const first = dashboardHash(named('First', bitrate));
  const second = dashboardHash(named('Second', tissue));
  const close = await dashboard({ search: first });
  try {
    await click(cards()[0].querySelector('[data-exploration-fit-toggle]'));
    await hashNavigation(() => { window.location.hash = second; });
    assert.deepEqual(slugsShown(), [bitrate], 'navigation alone must not replace a changed chart');
    assert.match(button('[data-dashboard-pending-link]')?.textContent ?? '', /First.*Second/s);
    await click(button('[data-dashboard-keep-draft]'));
    assert.match(button('[data-dashboard-pending-link]')?.textContent ?? '', /not the dashboard at this address/i);
    assert.equal(Boolean(button('[data-dashboard-keep-draft]')), false);
    assert.equal(window.location.hash, second);
    assert.equal(cards()[0].querySelector('[data-exploration-fit-line]')?.dataset.fitN, '9');
    await hashNavigation(() => window.history.back());
    assert.equal(Boolean(button('[data-dashboard-pending-link]')), false);
    assert.deepEqual(slugsShown(), [bitrate]);
    assert.equal(cards()[0].querySelector('[data-exploration-fit-line]')?.dataset.fitN, '9');
    await hashNavigation(() => window.history.forward());
    await click(button('[data-dashboard-open-link]'));
    assert.equal(button('[data-dashboard-name]').value, 'Second');
    assert.deepEqual(slugsShown(), [tissue]);
    assert.equal(Boolean(button('[data-dashboard-pending-link]')), false);
    assert.equal(savedRaw(), null);
  } finally { await close(); }
});

test('history: an invalid destination identifies the retained draft and invalidates the prior pending link', { timeout: 5000 }, async () => {
  const { dashboardHash } = await import('../src/lib/dashboard-state.ts');
  const close = await dashboard({ search: dashboardHash(named('First', bitrate)) });
  try {
    await setInput('[data-dashboard-name]', 'My unsaved title');
    const second = dashboardHash(named('Second', tissue));
    await hashNavigation(() => { window.location.hash = second; });
    await hashNavigation(() => { window.location.hash = '#d=invalid'; });
    assert.match(button('[data-dashboard-link-error]')?.textContent ?? '', /could not be opened.*My unsaved title.*not the dashboard at this address/s);
    assert.equal(Boolean(button('[data-dashboard-open-link]')), false);
    assert.deepEqual(slugsShown(), [bitrate]);
    assert.equal(savedRaw(), null);
    await hashNavigation(() => window.history.back());
    assert.equal(Boolean(button('[data-dashboard-link-error]')), false);
    assert.match(button('[data-dashboard-pending-link]')?.textContent ?? '', /My unsaved title.*Second/s);
  } finally { await close(); }
});

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
    const notice = button('[data-exploration-export-disabled]');
    assert.ok(notice && !notice.hidden, 'standalone views still explain unsupported export');
    assert.match(notice.textContent, /unavailable for this exploration/);
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
    await openCatalog();
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
