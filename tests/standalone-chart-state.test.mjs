import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { FieldVelocityRoutes } from '../src/components/field-velocity-routes.tsx';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { click, mount } from './modal-helpers.mjs';

globalThis.React = React;
const graphPage = graphModule.default.default ?? graphModule.default;
const bci = 'bci-information-transfer-over-time';
const path = slug => atlasPath('/field-velocity/' + slug);
const query = () => new URL(window.location.href).searchParams;
const el = selector => document.querySelector(selector);
async function standalone(slug, search = '', configure = () => {}) {
  return mount(React.createElement(AppRouterContext.Provider, { value: { replace() { assert.fail('unexpected router navigation'); } } },
    React.createElement(FieldVelocityRoutes, null, await graphPage({ params: Promise.resolve({ slug }) }))), '', win => {
    win.history.replaceState({ __NA: true, tree: ['retained'], atlasOverviewOrigin: { href: path('') } }, '', path(slug) + search);
    win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    configure(win);
  });
}
const bciEvidence = () => ({
  marks: [...document.querySelectorAll('svg [data-source-observation]')].map(mark => mark.dataset.sourceObservation),
  fit: el('[data-exploration-fit-line]')?.getAttribute('points'),
  n: el('[data-exploration-fit-line]')?.dataset.fitN,
  sensory: !!el('[data-sensory-context]'),
});

test('real BCI legend and fit synchronously write stable scoped URLs while retaining focus and history state', async () => {
  const close = await standalone(bci, '?review=1&review=2#retained');
  try {
    const state = window.history.state;
    const control = el('[data-exploration-fit-toggle]');
    control.focus();
    await act(async () => {
      control.click();
      assert.equal(query().get('chartModel'), `${bci}:fit`, 'address bar changes during the event');
    });
    assert.ok(document.activeElement === control, 'keyboard focus stays on the toggle');
    assert.equal(bciEvidence().n, '9');
    const speech = el('[data-exploration-series="Speech decoding"]');
    speech.focus();
    await click(speech);
    assert.equal(query().get('chartHidden'), `${bci}:speech`);
    assert.equal(bciEvidence().n, '4');
    assert.equal(bciEvidence().marks.length, 9);
    assert.ok(document.activeElement === speech);
    assert.deepEqual(query().getAll('review'), ['1', '2']);
    assert.equal(window.location.hash, '#retained');
    assert.deepEqual(window.history.state, state);
  } finally { await close(); }
});


test('a filtered modeled BCI Copy link round-trips a fresh mount and does not enable image export', async () => {
  let clipboard = '';
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { clipboard = value; } } });
  let close = await standalone(bci, '?access_token=secret&campaign=private');
  let expected, shared;
  try {
    await click(el('[data-exploration-fit-toggle]'));
    await click(el('[data-sensory-toggle]'));
    await click(el('[data-exploration-series="Speech decoding"]'));
    expected = bciEvidence();
    const copy = [...document.querySelectorAll('button')].find(button => button.textContent === 'Copy link');
    assert.ok(copy, 'selected views retain link sharing');
    assert.equal(el('[data-copy-chart]'), null, 'unsupported image exports remain unavailable');
    assert.equal(el('[data-download-chart]'), null);
    await click(copy);
    shared = new URL(clipboard);
    assert.equal(shared.pathname, path(bci));
    assert.deepEqual([...shared.searchParams.keys()], ['chartHidden', 'chartModel']);
    assert.equal(shared.searchParams.get('chartModel'), `${bci}:fit,sensory`);
    assert.equal(shared.searchParams.get('chartHidden'), `${bci}:speech`);
    assert.match(document.body.textContent, /Copied/);
    await click(el('[data-sensory-toggle]'));
    assert.doesNotMatch(document.body.textContent, /Copied/, 'clipboard success is not relabeled for a new view');
  } finally { await close(); }
  close = await standalone(bci, shared.search);
  try {
    assert.deepEqual(bciEvidence(), expected, 'fresh document restores actual points, fit coordinates, sample size and sensory panel');
    assert.equal(el('[data-exploration-series="Speech decoding"]').getAttribute('aria-pressed'), 'false');
  } finally { await close(); }
});

const legendCases = [
  [bci, [['cursor','Cursor / grid control'],['switch','Endovascular switch'],['text','Text selection / scanning'],['speech','Speech decoding'],['handwriting','Handwriting decoding']]],
  ['estimated-acquisition-efficiency-voxels-per-dollar', [['expansion','Expansion microscopy · estimates'],['em','EM · reported-tech estimates'],['mesospim','mesoSPIM · optical'],['peem','PEEM · prospective']]],
  ['neurotech-papers-per-year', [['neurotech','neurotech'],['all-research','all-research'],['four-domain','four-domain']]],
  ['neurotech-search-terms', [['neurotechnology','neurotechnology'],['bci','brain-computer interface']]],
];
for (const [slug, series] of legendCases) test(`${slug}: every legend token and all-hidden/reset round-trip`, async () => {
  let close = await standalone(slug);
  let shared;
  try {
    assert.deepEqual([...document.querySelectorAll('[data-exploration-series]')].map(node => node.dataset.explorationSeries), series.map(([,label]) => label), 'independent control inventory');
    for (let i = series.length - 1; i >= 0; i--) {
      await click(el(`[data-exploration-series="${series[i][1]}"]`));
      assert.equal(query().get('chartHidden'), `${slug}:${series.slice(i).map(([token])=>token).join(',')}`, 'canonical order is independent of click order');
    }
    assert.ok(el('[data-exploration-empty]'));
    shared = window.location.search;
    await click(el('[data-exploration-reset]'));
    assert.equal(query().has('chartHidden'), false);
    assert.equal(el('[data-exploration-empty]'), null);
    assert.ok([...document.querySelectorAll('[data-exploration-series]')].every(node=>node.getAttribute('aria-pressed')==='true'));
  } finally { await close(); }
  close = await standalone(slug, shared);
  try {
    assert.ok(el('[data-exploration-empty]'));
    assert.ok([...document.querySelectorAll('[data-exploration-series]')].every(node=>node.getAttribute('aria-pressed')==='false'));
  } finally { await close(); }
});

for (const [slug, selectors, tokens] of [
  ['estimated-acquisition-efficiency-voxels-per-dollar', ['[data-exploration-fit-toggle]','[data-brain-scale-toggle]'], 'fit,brain-scale'],
  ['selected-tissue-volume-checkpoints', ['[data-brain-scale-toggle]','[data-voxel-view-toggle]'], 'brain-scale,voxels'],
  ['selected-public-image-resource-footprints', ['[data-brain-scale-toggle]'], 'brain-scale'],
  ['publication-growth-by-group', ['[data-baseline-option="matched"]'], 'matched'],
]) test(`${slug}: companion model/baseline controls survive a new document and defaults clear params`, async () => {
  let close = await standalone(slug);
  let search, rendered;
  const key = tokens === 'matched' ? 'chartBaseline' : 'chartModel';
  const evidence = () => ({
    checked: selectors.map(selector => el(selector).getAttribute('aria-checked')),
    plotText: el('.graph-detail svg').textContent,
    references: [...document.querySelectorAll('[data-brain-scale-reference]')].map(node=>node.dataset.value),
  });
  try {
    for (const selector of selectors) { const control=el(selector); control.focus(); await click(control); assert.ok(document.activeElement===control); }
    assert.equal(query().get(key), `${slug}:${tokens}`);
    rendered=evidence(); search=window.location.search;
    for (const selector of [...selectors].reverse()) await click(el(tokens === 'matched' ? '[data-baseline-option="science"]' : selector));
    assert.equal(query().has(key), false);
  } finally { await close(); }
  close=await standalone(slug, search);
  try { assert.deepEqual(evidence(),rendered); } finally { await close(); }
});

async function selectRecording(value) {
  const selector=el('[data-recording-view-select]'); selector.focus();
  await act(async()=>{selector.value=value;selector.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.ok(document.activeElement===selector, 'recording select keeps native keyboard focus');
}
test('all four recording view legends retain separate hidden tokens and the default view removes recordingView', async()=>{
  const slug='simultaneous-neural-recordings';
  let close=await standalone(slug), search;
  try {
    const originalState=window.history.state;
    const initialLength=window.history.length;
    for (const view of ['historical','electrical','human-channels','optical']) {
      await selectRecording(view);
      if(view==='historical') assert.equal(window.history.length,initialLength,'selecting the current default does not add an identical history entry');
      assert.deepEqual(window.history.state,originalState);
      if(view!=='historical') assert.deepEqual([...query().keys()],['recordingView','chartHidden'],'reserved state parameter ordering is deterministic');
      assert.ok(document.querySelectorAll('[data-curve-point]').length>0);
      await click(el(`[data-exploration-series="${view}"]`));
      assert.equal(document.querySelectorAll('[data-curve-point]').length,0);
    }
    assert.equal(query().get('chartHidden'), `${slug}:historical,electrical,human-channels,optical`);
    search=window.location.search;
    await selectRecording('historical');
    assert.equal(query().has('recordingView'),false);
    assert.equal(document.querySelectorAll('[data-curve-point]').length,0);
    await click(el('[data-exploration-reset]'));
    assert.equal(query().has('chartHidden'),false);
    assert.ok(document.querySelectorAll('[data-curve-point]').length>0);
  } finally {await close();}
  close=await standalone(slug,search);
  try {
    assert.equal(el('[data-recording-view-select]').value,'optical');
    for(const view of ['historical','electrical','human-channels','optical']) {
      await selectRecording(view);
      assert.equal(document.querySelectorAll('[data-curve-point]').length,0);
      assert.equal(el(`[data-exploration-series="${view}"]`).getAttribute('aria-pressed'),'false');
    }
  } finally {await close();}
});


async function travel(direction) {
  await act(async()=>{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('history did not fire popstate')),2000);
      window.addEventListener('popstate',()=>{clearTimeout(timer);resolve();},{once:true});
      window.history[direction]();
    });
  });
}
test('native Back/Forward restores each BCI point selection, exact refit and model settings without replacing router state', async()=>{
  const close=await standalone(bci,'?review=1&review=2#retained');
  try {
    const initial=bciEvidence(), state=window.history.state;
    await click(el('[data-exploration-fit-toggle]'));
    const modeled=bciEvidence();
    await click(el('[data-exploration-series="Speech decoding"]'));
    const filtered=bciEvidence();
    await click(el('[data-sensory-toggle]'));
    const sensory=bciEvidence();
    for(const expected of [filtered,modeled,initial]) {await travel('back');assert.deepEqual(bciEvidence(),expected);assert.deepEqual(window.history.state,state);}
    for(const expected of [modeled,filtered,sensory]) {await travel('forward');assert.deepEqual(bciEvidence(),expected);assert.deepEqual(window.history.state,state);}
    assert.deepEqual(query().getAll('review'),['1','2']);
    assert.equal(window.location.hash,'#retained');
  } finally {await close();}
});

test('clipboard denial and a late response never show a fallback or success for a different selected chart URL',async()=>{
  let mode='deny', resolve;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>{
    if(mode==='deny') return Promise.reject(new Error('denied'));
    return new Promise(done=>{resolve=done;});
  }}});
  const close=await standalone(bci,'?secret=private');
  try {
    await click(el('[data-exploration-series="Speech decoding"]'));
    await click(el('[data-copy-draft-link]'));
    const input=el('.chart-link-fallback input');
    assert.ok(input?.readOnly);
    assert.equal(new URL(input.value).searchParams.get('chartHidden'),`${bci}:speech`);
    assert.equal(new URL(input.value).searchParams.has('secret'),false);
    assert.equal(el('.chart-link-fallback a').href,input.value);
    await click(el('[data-exploration-fit-toggle]'));
    assert.equal(el('.chart-link-fallback'),null);
    assert.doesNotMatch(document.body.textContent,/Copy failed/);
    mode='pending';
    await click(el('[data-copy-draft-link]'));
    await click(el('[data-sensory-toggle]'));
    await act(async()=>{resolve();});
    assert.doesNotMatch(document.body.textContent,/Copied|Copy failed/);
  } finally {await close();}
});

test('malformed initial state is inert, leaves the address intact and never disables default image export',async()=>{
  const search=`?review=1&chartHidden=${bci}:speech,unknown&chartModel=${bci}:${'x'.repeat(600)}&chartHidden=${bci}:speech#retained`;
  const close=await standalone(bci,search);
  try {
    assert.equal(bciEvidence().marks.length,14);
    assert.equal(bciEvidence().fit,undefined);
    assert.ok(el('[data-copy-chart]'));
    assert.ok(el('[data-download-chart]'));
    assert.equal(window.location.search,new URL('https://atlas.example/'+search).search);
    assert.equal(window.location.hash,'#retained');
  } finally {await close();}
});

test('Trends custom preview link preserves validated term selection and clears stale success on history changes',async()=>{
  let copied;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>{copied=url;}}});
  const slug='neurotech-search-terms';
  const close=await mount(React.createElement(AppRouterContext.Provider,{value:{replace(){assert.fail('unexpected navigation');}}},
    React.createElement(FieldVelocityRoutes,null,React.createElement(GoogleTrends,{flat:true,selection:['neurotech']}))),'',win=>{
      win.history.replaceState({tree:['retained']},'',path(slug)+`?secret=private&chartHidden=${slug}:bci`);
    });
  try {
    const button=el('button[aria-label^="Copy link to"]');
    await click(button);
    assert.equal(new URL(copied).searchParams.get('chartHidden'),`${slug}:bci`);
    assert.equal(new URL(copied).searchParams.has('secret'),false);
    assert.equal(button.parentElement.querySelector('[role=status]').textContent,'Link copied');
    await act(async()=>{window.history.pushState(window.history.state,'',path(slug));window.dispatchEvent(new Event('popstate'));});
    assert.equal(button.parentElement.querySelector('[role=status]').textContent,'','new URL was not copied');
  } finally {await close();}
});
