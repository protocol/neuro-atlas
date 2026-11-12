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
// Preserve the independently captured scientific geometry/content goldens.
// Normalize only the exact export hint and deliberate presentation changes;
// coordinates, source values, labels, intervals and other paint stay pinned.
// The new styling is independently asserted in chart-presentation.test.mjs.
const svgSha = svg => {
  const normalized = svg.cloneNode(true);
  // Calendar guides and the 6px expanded/export radius are intentional
  // presentation changes. Assert them before restoring the old hash input;
  // never normalize a source center, value, interval, tick or label.
  const marks = [...svg.querySelectorAll('[data-curve-point]')];
  for (const mark of marks) {
    assert.equal(mark.getAttribute('r'), '6');
    assert.equal(mark.getAttribute('data-export-r'), '6');
  }
  const dates = marks.map(mark => Date.parse(mark.dataset.curvePoint.split(':').at(-1)));
  const firstYear = new Date(Math.min(...dates)).getUTCFullYear();
  const lastYear = new Date(Math.max(...dates)).getUTCFullYear();
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i)
    .filter(year => Date.UTC(year, 0, 1) >= Math.min(...dates) && Date.UTC(year, 0, 1) <= Math.max(...dates));
  assert.deepEqual([...svg.querySelectorAll('[data-year-guide]')].map(line => Number(line.dataset.yearGuide)), years);
  for (const guide of normalized.querySelectorAll('[data-year-guide]')) {
    const group = guide.parentElement;
    guide.remove();
    if (!group.childNodes.length) group.remove(); // Never discard any preexisting content beside a guide.
  }
  for (const mark of normalized.querySelectorAll('[data-curve-point]')) {
    mark.setAttribute('r', '5');
    mark.setAttribute('data-export-r', '5');
  }
  return sha(normalized.outerHTML
  // Unit/scale caption alone now starts at the common content edge.
  // point-source-tooltip.test.mjs independently requires x=0; all marks/axes stay pinned.
  .replace(/(<svg[^>]*>)<text x="0" y="16">/, '$1<text x="100" y="16">')
  // Only the explicit date-axis caption has moved to the shared left edge.
  .replace('<text x="0" y="297" text-anchor="start">', '<text x="399" y="297" text-anchor="middle">')
  // Exact new root typography only; independent geometry/content hashes stay fixed.
  .replace(/^<svg style="font-size: ?[0-9.e+-]+px;?" data-export-font-size="12"/, '<svg')
  .replaceAll(' data-export-r="5"', '')
  .replace('Separate source observations.', 'Separate observations; no connecting growth line.')
  .replaceAll(' vector-effect="non-scaling-stroke"', '')
  .replaceAll(' class="pc-gridline"', '')
  .replaceAll('stroke="var(--border)" stroke-width="1" stroke-dasharray="3 5"', 'stroke="var(--border-strong)" stroke-dasharray="3 5"'));
};
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
    assert.equal(svgSha(document.querySelector('dialog svg')), baseline['tissue-mapped']);
    assert.equal(document.querySelectorAll('[data-curve-point]').length, 7);
    assert.equal(document.querySelectorAll('[data-source-observation]').length, 7);
  } finally { await cleanup(); }
});

// The refreshed recording card deliberately removes the historical growth UI.
// Pure legacy-fit math is still covered by extrapolation*.test.mjs. A changed
// inherited reference can never become a fit over new mixed measurements.
for (const [name, transform] of [['flat', () => 651], ['decreasing', (_, i) => 100 - i], ['slow', (_, i) => 2 + i / 100]]) test(`${name} inherited neuron history never enables a fit in modern recording views`, async () => {
  const changed = structuredClone(data);
  changed.record.series = changed.record.series.map((p, i) => ({ ...p, y: transform(p.y, i) }));
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: changed, provenance }), '#simultaneously-recorded-neurons');
  try {
    const dialog = document.querySelector('dialog');
    assert.equal(dialog.querySelector('[role=switch], [data-extrapolation-line], [data-target-line], [data-fit-diagnostics]'), null);
    assert.deepEqual([...dialog.querySelectorAll('[data-curve-point]')].map(p => Number(p.dataset.value)), [741, 2668, 1012]);
  } finally { await cleanup(); }
});

test('forecast layout reserves readable label rows and 720px internal scrolling without changing off sizing', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#neural-recording-hours');
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
    assert.equal(svgSha(dialog.querySelector('svg')), baseline['neural-recording-hours']);
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
    assert.match(dialog.querySelector('[data-point-description]').textContent, /TUSZ v1.0.0/);
    assert.ok(point.getAttribute('aria-describedby'));
    await act(async () => { point.blur(); select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(toggle);
    assert.equal(svgSha(dialog.querySelector('svg')), baseline['neural-recording-hours']);
    assert.equal(dialog.querySelector('table').outerHTML, table);
    assert.deepEqual([...document.querySelectorAll('.pc-preview')].map(el => el.outerHTML), previews);
  } finally { await cleanup(); }
});

// Historical neuron opt-in/fit-control UI assertions were superseded by the
// observed-only three-view recording contract (recording-evidence-ui.test.mjs).
// No changes to the shared extrapolation math or the hours UI are authorized.
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
  assert.equal(svgSha(dialog.querySelector('svg')),baseline['neural-recording-hours']);
 }finally{await cleanup();}
});
