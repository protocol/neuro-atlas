import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { mount as mountDOM, click, settle } from './modal-helpers.mjs';

// These assertions cover settled scientific/UI invariants. Intermediate frames,
// live media-query changes and interruption are exercised with a fake RAF clock
// in extrapolation-motion.test.mjs, not timing-sensitive sleeps here.
const mount = (node, hash) => mountDOM(node, hash, window => {
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});

const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const sha = text => createHash('sha256').update(text).digest('hex');
// Captured from untouched 58dd8c2 before adding the controls, not the new off-state itself.
const baseline = {
  'simultaneously-recorded-neurons': 'b0b0235052650e0f586bff88e75935e0e28cd6295698dd29455b0fff6ca77a6d',
  'neural-recording-hours': 'f8a43e011f1888e3060245875d2353f9c4c5d02a8261ae4daf6de7bdeef0dc56',
  'tissue-mapped': 'd4ecadcdac8485846b4d8bf4d72b485281d058d5f9ccb340840e384ef742d1a6',
};

test('canonical source bytes and unmodified tissue chart are preserved', async () => {
  assert.equal(sha(readFileSync('src/data/field-velocity/neurotech.snapshot.json')), '2b16a8ebf5ada867a79129243fc3f3afada7ad6e75a639ca0d005849607815ee');
  assert.equal(sha(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json')), '66df3d351fd6318ed289b1d0e8299ad8da9a7f6399becda046d17baf49f48b97');
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#tissue-mapped');
  try {
    assert.equal(document.querySelector('[role="switch"]'), null);
    assert.equal(document.querySelector('[data-extrapolation-line]'), null);
    assert.equal(sha(document.querySelector('dialog svg').outerHTML), baseline['tissue-mapped']);
    assert.equal(document.querySelectorAll('[data-curve-point]').length, 7);
    assert.equal(document.querySelectorAll('[data-source-observation]').length, 7);
  } finally { await cleanup(); }
});

for (const [name, transform, expected] of [
  ['flat', () => 651, /No fit: insufficient comparable history or invalid\/non-growing data/],
  ['decreasing', (_, i) => 100 - i, /No fit: insufficient comparable history or invalid\/non-growing data/],
  ['slow', (_, i) => 2 + i / 100, /beyond 2200 display range/],
]) test(`${name} neuron history shows no invented crossing date`, async () => {
  const changed = structuredClone(data);
  changed.record.series = changed.record.series.map((p, i) => ({ ...p, y: transform(p.y, i) }));
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: changed, provenance }), '#simultaneously-recorded-neurons');
  try {
    await click(document.querySelector('[role="switch"]'));
    const dialog = document.querySelector('dialog');
    assert.equal(dialog.querySelectorAll('[data-target-line]').length, 2);
    assert.match(dialog.querySelector('[data-extrapolation-summary]').textContent, expected);
    for (const label of dialog.querySelectorAll('[data-crossing-label]')) assert.doesNotMatch(label.textContent, /≈\d{4}/);
    if (name !== 'slow') assert.equal(dialog.querySelector('[data-extrapolation-line]'), null);
  } finally { await cleanup(); }
});

test('forecast layout reserves readable label rows and 720px internal scrolling without changing off sizing', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#simultaneously-recorded-neurons');
  try {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/components/performance-curves.css', 'utf8');
    document.head.append(style);
    const dialog = document.querySelector('dialog');
    const svg = dialog.querySelector('svg');
    const toggle = dialog.querySelector('[role="switch"]');
    assert.equal(getComputedStyle(svg).minWidth, '560px');
    await click(toggle);
    assert.equal(getComputedStyle(svg).minWidth, '720px', 'Opt-in plots retain legible native SVG width');
    assert.equal(getComputedStyle(svg.parentElement).overflowX, 'auto');
    assert.equal(getComputedStyle(svg.parentElement).maxWidth, '100%');
    assert.equal(getComputedStyle(toggle).minHeight, '44px', 'Touch target stays usable');
    for (const label of svg.querySelectorAll('.pc-target-label')) {
      assert.equal(label.querySelectorAll('tspan').length, 2, 'Target and conditional crossing get distinct rows');
      assert.ok(Number(label.getAttribute('y')) >= 30, 'Target labels do not overlap unit heading');
    }
    assert.ok([...svg.querySelectorAll('text[text-anchor="end"]')].every(el => el.textContent.length < 8), 'Large axis ticks use compact suffixes');
    await click(toggle);
    assert.equal(getComputedStyle(svg).minWidth, '560px');
  } finally { await cleanup(); }
});

test('hours opt-in switches to log scale, keeps TUSZ-only dates scoped, suppresses unsupported tracks and restores linear geometry', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#neural-recording-hours');
  try {
    const dialog = document.querySelector('dialog[open]');
    const toggle = dialog.querySelector('[role="switch"]');
    assert.ok(toggle, 'Hours modal needs its own opt-in switch');
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    assert.equal(sha(dialog.querySelector('svg').outerHTML), baseline['neural-recording-hours']);
    const table = dialog.querySelector('table').outerHTML;
    const previews = [...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML);
    await click(toggle);
    assert.match(dialog.querySelector('svg').getAttribute('aria-label'), /log hours axis/);
    assert.match(dialog.textContent, /switched from linear to log/i);
    assert.equal(dialog.querySelectorAll('[data-target-line]').length, 2);
    assert.equal(dialog.querySelector('[data-frontier-line]'), null, 'Hours remain scatter, not a connected source curve');
    const model = dialog.querySelector('[data-extrapolation-line]');
    assert.ok(model);
    const lastTusz = dialog.querySelector('[data-curve-point="tusz-scalp-eeg:2020-05-09"]');
    assert.equal(model.getAttribute('points').split(' ')[0], `${lastTusz.getAttribute('cx')},${lastTusz.getAttribute('cy')}`);
    const summary = dialog.querySelector('[data-extrapolation-summary]');
    assert.match(summary.textContent, /TUSZ corpus-only scenario — not worldwide human data/);
    assert.match(summary.textContent, /8.*2017.*2020/);
    assert.match(summary.textContent, /overlapping.*not summed/);
    assert.match(summary.textContent, /plateaus/i);
    assert.match(summary.textContent, /Worldwide human-data ETA unavailable/);
    assert.doesNotMatch(summary.textContent, /mixed.species|neuron count|7-year literature/);
    for (const label of dialog.querySelectorAll('[data-crossing-label]')) assert.match(label.textContent, /TUSZ corpus-only · ≈20(?:29|43)/);
    assert.match(summary.textContent, /100,000 h/);
    assert.match(summary.textContent, /100 million h/);
    const coordinates = () => Object.fromEntries([...dialog.querySelectorAll('[data-curve-point]')].map(p => [p.dataset.curvePoint, [p.getAttribute('cx'), p.getAttribute('cy')]]));
    const onCoordinates = coordinates();
    const select = dialog.querySelector('select');
    for (const track of ['ajile12-intracranial', 'poyo-primate-training', 'japaneeg-scalp-eeg']) {
      await act(async () => { select.value = track; select.dispatchEvent(new Event('change', { bubbles: true })); });
      assert.equal(dialog.querySelector('[data-extrapolation-line]'), null);
      assert.equal(dialog.querySelectorAll('[data-curve-point]').length, 1);
      assert.equal(dialog.querySelectorAll('[data-source-observation]').length, 11);
      assert.match(dialog.querySelector('[data-extrapolation-summary]').textContent, /insufficient comparable history/i);
      assert.doesNotMatch(dialog.querySelector('[data-extrapolation-summary]').textContent, /≈2029|≈2043|Doubling time/);
      for (const [key, coordinate] of Object.entries(coordinates())) assert.deepEqual(coordinate, onCoordinates[key], 'Filtering keeps axes fixed');
    }
    await act(async () => { select.value = 'tusz-scalp-eeg'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    assert.equal(dialog.querySelectorAll('[data-curve-point]').length, 8);
    assert.equal(dialog.querySelector('[data-extrapolation-line]').outerHTML, model.outerHTML);
    const point = dialog.querySelector('[data-curve-point]');
    await act(async () => point.focus());
    assert.equal(document.activeElement, point);
    assert.match(dialog.querySelector('.pc-point-readout').textContent, /TUSZ v1.0.0/);
    assert.ok(point.getAttribute('aria-describedby'));
    await act(async () => { point.blur(); select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(toggle);
    assert.equal(sha(dialog.querySelector('svg').outerHTML), baseline['neural-recording-hours']);
    assert.equal(dialog.querySelector('table').outerHTML, table);
    assert.deepEqual([...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML), previews);
  } finally { await cleanup(); }
});

test('neuron modal opt-in adds a connected dashed continuation and restores exact baseline SVG when off', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#simultaneously-recorded-neurons');
  try {
    const dialog = document.querySelector('dialog[open]');
    const toggle = dialog.querySelector('button[role="switch"]');
    assert.ok(toggle, 'Extrapolation needs an accessible expanded-chart switch');
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    assert.match(toggle.textContent, /Extrapolation/);
    assert.equal(sha(dialog.querySelector('svg').outerHTML), baseline['simultaneously-recorded-neurons']);
    const source = dialog.querySelector('table').outerHTML;
    const previews = [...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML);
    const url = window.location.href;
    await click(toggle);
    assert.equal(toggle.getAttribute('aria-checked'), 'true');
    assert.equal(document.querySelectorAll('[role="switch"]').length, 1, 'No preview-card switch');
    assert.equal(dialog.querySelectorAll('[data-target-line]').length, 2);
    const model = dialog.querySelector('[data-extrapolation-line]');
    assert.ok(model);
    assert.match(model.getAttribute('stroke-dasharray'), /\d+ \d+/);
    const lastActual = [...dialog.querySelectorAll('[data-curve-point]')].at(-1);
    assert.equal(model.getAttribute('points').split(' ')[0], `${lastActual.getAttribute('cx')},${lastActual.getAttribute('cy')}`);
    assert.equal(dialog.querySelectorAll('[data-curve-point]').length, 7);
    assert.equal(dialog.querySelectorAll('[data-source-observation]').length, 7);
    const summary = dialog.querySelector('[data-extrapolation-summary]');
    assert.match(summary.textContent, /Historical exponential continuation/);
    assert.match(summary.textContent, /not a current forecast/i);
    assert.match(summary.textContent, /2094/);
    assert.match(summary.textContent, /2150/);
    assert.match(summary.textContent, /5\.5.*7 selected points/);
    assert.match(summary.textContent, /not.*7.year.*literature/i);
    assert.match(summary.textContent, /mixed.species/i);
    assert.match(summary.textContent, /spatial.*temporal/i);
    assert.match(dialog.querySelector('svg').textContent, /2080/);
    assert.match(dialog.querySelector('svg').textContent, /2120/);
    assert.equal(dialog.querySelector('table').outerHTML, source);
    assert.deepEqual([...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML), previews);
    assert.equal(window.location.href, url, 'Toggling never changes share/history state');
    await click(toggle);
    assert.equal(toggle.getAttribute('aria-checked'), 'false');
    assert.equal(dialog.querySelector('[data-extrapolation-summary]'), null);
    assert.equal(sha(dialog.querySelector('svg').outerHTML), baseline['simultaneously-recorded-neurons']);
    assert.equal(dialog.querySelector('table').outerHTML, source);
    await click(dialog.querySelector('.pc-modal-header button')); await settle();
    await click(document.querySelector('[data-performance-card="simultaneously-recorded-neurons"] .pc-trigger'));
    assert.equal(document.querySelector('[role="switch"]').getAttribute('aria-checked'), 'false', 'New modal opens opt-out');
  } finally { await cleanup(); }
});

test('scenario controls expose log R², real alternative dates and count-equivalent references', async () => {
 const cleanup=await mount(React.createElement(PerformanceCurves,{data,provenance}),'#simultaneously-recorded-neurons');
 try {
  const dialog=document.querySelector('dialog');
  assert.equal(dialog.querySelector('[data-scenario-select]'),null);
  await click(dialog.querySelector('[role="switch"]'));
  const select=dialog.querySelector('[data-scenario-select]');
  assert.ok(select,'Scenario selector is visible only when enabled');
  assert.match(dialog.querySelector('[data-fit-diagnostics]').textContent,/0\.929/);
  assert.match(dialog.textContent,/not.*probability|not.*forecast confidence/i);
  assert.match(dialog.querySelector('svg').textContent,/Mouse brain neuron-count equivalent/);
  assert.doesNotMatch(dialog.querySelector('svg').textContent,/whole-brain live target/);
  const before=dialog.querySelector('[data-extrapolation-line]').getAttribute('points');
  for(const [mode,year,n] of [['recent','2085','4'],['literature','2115','7']]) {
   await act(async()=>{select.value=mode;select.dispatchEvent(new Event('change',{bubbles:true}));});
   assert.match(dialog.querySelector('[data-extrapolation-summary]').textContent,new RegExp(year));
   assert.match(dialog.querySelector('[data-fit-diagnostics]').textContent,new RegExp(`${n} observations`));
   assert.notEqual(dialog.querySelector('[data-extrapolation-line]').getAttribute('points'),before);
  }
  assert.match(dialog.textContent,/No post-2014 observations have been added/);
  await click(dialog.querySelector('[role="switch"]'));
  assert.equal(sha(dialog.querySelector('svg').outerHTML),baseline['simultaneously-recorded-neurons']);
 } finally {await cleanup();}
});
test('hours scenarios expose the old flat tail beside the chart and remove optimistic dates under plateau',async()=>{
 const cleanup=await mount(React.createElement(PerformanceCurves,{data,provenance}),'#neural-recording-hours');
 try{
  const dialog=document.querySelector('dialog');await click(dialog.querySelector('[role="switch"]'));
  assert.match(dialog.querySelector('[data-scenario-warning]')?.textContent??'',/last three.*1,074/i);
  const select=dialog.querySelector('[data-scenario-select]');
  assert.equal(select.selectedOptions[0].textContent,'Expansion resumes');
  await act(async()=>{select.value='plateau';select.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.match(dialog.querySelector('[data-fit-diagnostics]').textContent,/N\/A.*constant values/);
  assert.ok([...dialog.querySelectorAll('[data-crossing-label]')].every(e=>e.textContent.includes('not reached if plateau continues')));
  assert.doesNotMatch(dialog.querySelector('[data-extrapolation-summary]').textContent,/≈2029|≈2043|Infinity/);
  await click(dialog.querySelector('[role="switch"]'));
  assert.equal(sha(dialog.querySelector('svg').outerHTML),baseline['neural-recording-hours']);
 }finally{await cleanup();}
});
