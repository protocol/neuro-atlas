import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import * as overviewModule from '../src/app/field-velocity/page.tsx';
import * as layoutModule from '../src/app/field-velocity/layout.tsx';
import * as pageModule from '../src/app/field-velocity/[slug]/page.tsx';
import { settle } from './modal-helpers.mjs';
import { DraftChartShare } from '../src/components/draft-chart-share.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { chartShareUrl } from '../src/lib/chart-export.ts';
import { withGraphExport } from '../src/lib/chart-export-api.ts';
import { click, mount } from './modal-helpers.mjs';

globalThis.React = React;
const plotGeometry = svg => { const clone = svg.cloneNode(true); clone.removeAttribute('aria-labelledby'); return clone.outerHTML; };
const bci = 'bci-information-transfer-over-time';
function assertShared(value, slug) {
  const url = new URL(value);
  assert.equal(url.pathname, '/field-velocity/' + slug);
  assert.equal(url.hash, '');
  assert.equal(url.searchParams.get('utm_source'), 'neuro_atlas');
  assert.equal(url.searchParams.get('utm_medium'), 'share');
  assert.equal(url.searchParams.get('utm_campaign'), 'chart_share');
  assert.equal(url.searchParams.get('utm_content'), slug);
  assert.equal(url.searchParams.has('review'), false);
  return url;
}

test('every overview copy surface shares a dedicated tagged chart URL without moving the sender', async () => {
  const writes = [];
  const close = await mount(React.createElement(React.Fragment, null,
    React.createElement(DraftChartShare, { anchor: 'draft-panel-bci-bitrate', label: 'BCI' }),
    React.createElement(GoogleTrends, { selection: ['neurotech'] })), '#metrics', win => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: win.navigator });
    Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: async value => writes.push(value) } });
  });
  try {
    const before = window.location.href, length = window.history.length;
    await click(document.querySelector('[data-copy-draft-link]'));
    assertShared(writes[0], bci);
    await click(document.querySelector('.gt-card [aria-label^="Copy link"]'));
    assertShared(writes[1], 'neurotech-search-terms');
    assert.equal(window.location.href, before);
    assert.equal(window.history.length, length);
    assert.equal(new URL(chartShareUrl(before, bci)).search, '', 'PNG/API canonical identity stays untagged');
  } finally { await close(); }
});

// PR144 intentionally changes: card activation explores in place, sharing opens a page.
test('overview card opens live exploration, shares its exact state and closes back to unchanged overview', async () => {
  const Overview = overviewModule.default.default ?? overviewModule.default;
  const Layout = layoutModule.default.default ?? layoutModule.default;
  const Page = pageModule.default.default ?? pageModule.default;
  const writes = [], replacements = [];
  const close = await mount(React.createElement(AppRouterContext.Provider, { value: { replace: href => replacements.push(href) } },
    React.createElement(Layout, null, React.createElement(Overview))), '#metrics', win => {
    win.history.replaceState({ keep: 'router' }, '', '/field-velocity?review=1#metrics');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: win.navigator });
    Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: async value => writes.push(value) } });
  });
  let shared, geometry;
  try {
    const before = window.location.href;
    const search = document.querySelector('#metrics-search');
    await act(async () => { search.value = 'BCI'; search.dispatchEvent(new Event('input', { bubbles: true })); });
    const rail = document.querySelector('[data-metric-rail]'); rail.scrollLeft = 183;
    const trigger = document.querySelector('[data-draft-popout-trigger="metric-panel-bci-bitrate"]');
    assert.equal(trigger.tagName, 'BUTTON', 'ordinary card opens a dialog rather than navigating');
    trigger.focus();
    await click(trigger);
    const modal = document.querySelector('dialog[open]'); assert.ok(modal);
    assert.equal(search.value, 'BCI', 'ordinary chart opening retains the live overview search');
    assert.deepEqual(replacements, [], 'exploration hashes must not be redirected');
    await click(modal.querySelector('[data-exploration-series="Speech decoding"]'));
    await click(modal.querySelector('[data-exploration-fit-toggle]'));
    assert.equal(modal.querySelectorAll('svg [data-source-observation]').length, 9);
    geometry = plotGeometry(modal.querySelector('svg.draft-plot-svg'));
    await click(modal.querySelector('[data-copy-draft-link]'));
    shared = assertShared(writes.at(-1), bci);
    assert.equal(shared.searchParams.get('chartHidden'), bci + ':speech');
    assert.equal(shared.searchParams.get('chartModel'), bci + ':fit');
    assert.equal(window.location.pathname, '/field-velocity');
    await click(modal.querySelector('.pc-modal-close'));
    for (let i = 0; i < 8 && document.querySelector('dialog[open]'); i++) await settle();
    assert.ok(document.querySelector('dialog[open]') === null, 'one close dismisses after edits');
    assert.equal(window.location.href, before);
    assert.equal(rail.scrollLeft, 183);
    assert.ok(document.activeElement === trigger, 'focus returns to exact card');
    assert.equal(window.history.state.keep, 'router');
  } finally { await close(); }
  const cleanup = await mount(await Page({ params: Promise.resolve({slug: bci}) }), '', win => win.history.replaceState({}, '', shared.href));
  try {
    assert.equal(plotGeometry(document.querySelector('.graph-detail svg.draft-plot-svg')), geometry, 'recipient restores exact source geometry/model');
  } finally { await cleanup(); }
});

test('recording view edits stay one overview dialog entry, retain exact shared units and restore with Forward', async () => {
  const Overview = overviewModule.default.default ?? overviewModule.default;
  const Layout = layoutModule.default.default ?? layoutModule.default;
  const writes=[];
  const cleanup=await mount(React.createElement(AppRouterContext.Provider,{value:{}},React.createElement(Layout,null,React.createElement(Overview))), '#metrics', win=>{
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:win.navigator});
    Object.defineProperty(win.navigator,'clipboard',{value:{writeText:async value=>writes.push(value)}});
  });
  try{
    const before=window.location.href;
    await click(document.querySelector('[data-performance-card="simultaneously-recorded-neurons"] .pc-trigger'));
    const select=document.querySelector('dialog [data-recording-view-select]');
    await act(async()=>{select.value='optical';select.dispatchEvent(new Event('change',{bubbles:true}));});
    await click(document.querySelector('dialog [data-exploration-series="optical"]'));
    await click(document.querySelector('dialog [data-copy-draft-link]'));
    const shared=assertShared(writes.at(-1),'simultaneous-neural-recordings');
    assert.equal(shared.searchParams.get('recordingView'),'optical');
    assert.equal(shared.searchParams.get('chartHidden'),'simultaneous-neural-recordings:optical');
    await click(document.querySelector('dialog .pc-modal-close'));
    for(let i=0;i<8&&document.querySelector('dialog[open]');i++)await settle();
    assert.equal(window.location.href,before,'one close returns to the exact overview, not a previous recording view');
    assert.ok(document.querySelector('dialog[open]')===null);
    await act(async()=>window.history.forward());await settle();
    assert.equal(document.querySelector('dialog [data-recording-view-select]').value,'optical');
    assert.equal(document.querySelector('dialog [data-exploration-series="optical"]').getAttribute('aria-pressed'),'false');
  }finally{await cleanup();}
});


test('supported overview export registration binds captured settings to the same live DOM and URL', async () => {
  const Overview = overviewModule.default.default ?? overviewModule.default;
  const Layout = layoutModule.default.default ?? layoutModule.default;
  const cleanup = await mount(React.createElement(Layout, null, React.createElement(Overview)), '#metrics');
  try {
    await click(document.querySelector('[data-draft-popout-trigger="metric-panel-bci-bitrate"]'));
    await click(document.querySelector('dialog[open] [data-sensory-toggle]'));
    const captured = await withGraphExport(bci, getChart => getChart());
    const root = captured.svg.closest('[data-chart-state]');
    assert.ok(root, 'the live SVG must own the DOM state checked by PNG serialization');
    assert.equal(root.getAttribute('data-chart-state'), captured.chartState);
    assert.equal(captured.svg.querySelector('[data-sensory-reference]').getAttribute('data-value'), '8750000');
    const url = new URL(chartShareUrl(window.location.href, bci));
    assert.equal(url.searchParams.get('chartModel'), bci + ':sensory');
    assert.equal(url.searchParams.has('utm_source'), false);
  } finally { await cleanup(); }
});
