import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { RECORDING_VIEWS } from '../src/data/recording-evidence.ts';
import { mount, click, settle } from './modal-helpers.mjs';
const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const chart = () => React.createElement(PerformanceCurves, { data, provenance, flat: true, selection: ['simultaneously-recorded-neurons'] });
globalThis.React = React;
const changeView = async value => act(async () => {
  const select = document.querySelector('[data-recording-view-select]');
  select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
});

test('the original recording anchor opens three source-qualified scatter views with no extrapolation or prefilled detail', async () => {
  const cleanup = await mount(chart(), '#simultaneously-recorded-neurons');
  try {
    const modal = document.querySelector('dialog[open]');
    const select = modal.querySelector('[data-recording-view-select]');
    assert.ok(select, 'Recording measurement selector is available');
    assert.deepEqual([...select.options].map(o => o.value), ['electrical', 'human-channels', 'optical']);
    assert.equal(select.labels[0].textContent.startsWith('Measurement view'), true);
    for (const view of RECORDING_VIEWS) {
      if (view.id !== 'electrical') await changeView(view.id);
      assert.equal(modal.querySelector('[data-recording-view]').dataset.recordingView, view.id);
      assert.equal(window.location.hash, '#simultaneously-recorded-neurons');
      assert.equal(modal.querySelectorAll('[data-curve-point]').length, view.points.length);
      assert.equal(modal.querySelectorAll('[data-source-observation]').length, view.points.length);
      assert.equal(modal.querySelector('.pc-point-readout').textContent, '');
      assert.equal(modal.querySelector('[role=switch], [data-frontier-line], [data-extrapolation-line], [data-fit-diagnostics]'), null);
      assert.match(modal.textContent, /publication.*disclosure.*not.*experiment/i);
      assert.ok(modal.querySelector('svg').textContent.includes(view.unit));
      assert.equal(modal.querySelector('svg').outerHTML.includes('NaN'), false, 'Single-point optical plot is finite');
      for (const p of view.points) {
        const row = modal.querySelector(`[data-source-observation="${p.id}"]`);
        assert.ok(row, p.id);
        assert.ok(row.textContent.includes(p.unit));
        assert.ok(row.textContent.includes(p.preparation));
        assert.ok(row.textContent.includes(`${p.datePrecision} precision · ${p.dateBasis}`));
        assert.ok(row.textContent.includes(p.note));
        assert.equal(row.querySelector('a').href, p.sourceUrl);
      }
    }
  } finally { await cleanup(); }
});


test('measurement selection roundtrips through copied URLs, fresh mount, Back/Forward and close/reopen', async () => {
  let copied;
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => { copied = text; } } } });
  let cleanup;
  try {
    cleanup = await mount(chart(), '#simultaneously-recorded-neurons');
    await changeView('human-channels');
    assert.equal(new URL(window.location.href).searchParams.get('recordingView'), 'human-channels');
    await changeView('optical');
    await click(document.querySelector('dialog [data-copy-draft-link]'));
    assert.equal(new URL(copied).searchParams.get('recordingView'), 'optical');
    assert.equal(new URL(copied).hash, '#simultaneously-recorded-neurons');
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 40)); });
    assert.equal(document.querySelector('[data-recording-view-select]').value, 'human-channels');
    await act(async () => { window.history.forward(); await new Promise(resolve => setTimeout(resolve, 40)); });
    assert.equal(document.querySelector('[data-recording-view-select]').value, 'optical');
    await click(document.querySelector('.pc-modal-header button')); await settle();
    assert.equal(document.querySelector('dialog[open]'), null, 'Close must close, not merely undo the last view selection');
    await click(document.querySelector('.pc-trigger'));
    assert.equal(document.querySelector('[data-recording-view-select]').value, 'optical');
    await cleanup(); cleanup = undefined;
    cleanup = await mount(chart(), '', win => win.history.replaceState(null, '', copied));
    assert.equal(document.querySelector('[data-recording-view-select]').value, 'optical');
    assert.equal(document.querySelector('.pc-point-readout').textContent, '');
  } finally {
    if (cleanup) await cleanup();
    if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator;
  }
});

for (const [query, expected] of [
  ['recordingView=human-channels', 'human-channels'],
  ['recordingView=optical', 'optical'],
  ['recordingView=electrical', 'electrical'],
  ['recordingView=unknown', 'electrical'],
  ['recordingView=optical&recordingView=human-channels', 'electrical'],
  ['recordingView=optical&recordingView=optical', 'electrical'],
  ['recordingView=OPTICAL', 'electrical'],
  ['recordingView=optical%20', 'electrical'],
]) test(`fresh recording query ${query} resolves only an exact unambiguous view`, async () => {
  const cleanup = await mount(chart(), '', win => win.history.replaceState(null, '', `/field-velocity?${query}#simultaneously-recorded-neurons`));
  try {
    assert.equal(document.querySelector('[data-recording-view-select]').value, expected);
    assert.equal(window.location.search, `?${query}`, 'Mount never rewrites an invalid URL');
  } finally { await cleanup(); }
});


test('recording presentation names the measurement family, keeps actions first and preserves historical data separately', async () => {
  const cleanup = await mount(chart(), '#simultaneously-recorded-neurons');
  try {
    const modal = document.querySelector('dialog');
    assert.equal(modal.querySelector('h2').textContent, 'Simultaneous neural recordings');
    const active = modal.querySelector('[data-recording-view]');
    assert.equal(active.firstElementChild.hasAttribute('data-chart-actions'), true, 'Uniform sharing stays the first row below the modal header');
    const history = modal.querySelector('[data-recording-history]');
    assert.ok(history, 'All seven inherited benchmarks remain visibly accessible');
    assert.match(history.querySelector('summary').textContent, /Historical.*1957.*2014/);
    await click(history.querySelector('summary'));
    assert.equal(history.open, true);
    assert.deepEqual([...history.querySelectorAll('tbody tr')].map(row => [Number(row.dataset.historicalYear), Number(row.dataset.historicalValue)]), data.record.series.map(p => [p.x, p.y]));
    assert.match(history.textContent, /Approximately 3,200.*isolated.*mouse retina.*ex vivo/is);
    assert.match(history.textContent, /not.*human/i);
    assert.match(history.textContent, /inherited.*year.*experiment dates not established/i);
    assert.match(history.textContent, /Export SHA-256/);
    assert.equal(modal.querySelectorAll('[data-curve-point]').length, 3, 'Historical mixed-preparation values are never pooled into modern brain-unit points');
    await changeView('human-channels');
    assert.match(modal.textContent, /Neural activity was recorded from 256 electrodes/);
    assert.doesNotMatch(modal.querySelector('h2').textContent, /neurons/);
    await changeView('optical');
    assert.match(modal.textContent, /and 5.4×6×0.5 mm3, 5 μm spacing, at 2.2 Hz \(523,139 – 1,136,223 neurons\)./);
  } finally { await cleanup(); }
});


test('tap/click and keyboard expose the same recording evidence; changing view or reopening clears detail', async () => {
  const cleanup = await mount(chart(), '#simultaneously-recorded-neurons');
  try {
    let point = document.querySelector('dialog [data-curve-point]');
    await act(async () => point.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.equal(document.querySelector('.pc-point-readout').textContent, point.getAttribute('aria-label'), 'Touch-generated click explicitly inspects a point');
    assert.equal(point.getAttribute('role'), 'button');
    const control = document.querySelector('[data-recording-view-select]');
    await act(async () => control.focus());
    await changeView('human-channels');
    assert.ok(document.activeElement === control, 'Native selector retains focus after a keyboard or touch view change');
    assert.equal(document.querySelector('.pc-point-readout').textContent, '');
    point = document.querySelector('dialog [data-curve-point]');
    await act(async () => point.focus());
    const label = point.getAttribute('aria-label');
    assert.equal(document.querySelector('.pc-point-readout').textContent, label);
    await act(async () => point.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('.pc-point-readout').textContent, label);
    await changeView('electrical');
    assert.equal(document.querySelector('.pc-point-readout').textContent, '');
    await click(document.querySelector('.pc-modal-header button')); await settle();
    await click(document.querySelector('.pc-trigger'));
    assert.equal(document.querySelector('.pc-point-readout').textContent, '');
    const style = document.createElement('style'); style.textContent = readFileSync('src/components/performance-curves.css', 'utf8'); document.head.append(style);
    const select = document.querySelector('[data-recording-view-select]');
    assert.equal(getComputedStyle(select).minHeight, '44px');
    assert.equal(getComputedStyle(select).maxWidth, '100%');
    assert.equal(getComputedStyle(select).minWidth, '0px');
  } finally { await cleanup(); }
});


import { MetricsSection } from '../src/components/sections/metrics-section.tsx';
test('catalog search discovers the refreshed recording card by new source, modality and family title', async () => {
  const cleanup = await mount(React.createElement(MetricsSection, { performance: null, references: { recording: chart() } }));
  try {
    const input = document.querySelector('#metrics-search');
    for (const term of ['Neuralink', 'Manley', 'human implant channels', 'optical', 'Simultaneous neural recordings']) {
      await act(async () => { input.value = term; input.dispatchEvent(new Event('input', { bubbles: true })); });
      const card = document.querySelector('[data-performance-card="simultaneously-recorded-neurons"]');
      assert.ok(!card.closest('[hidden]'), `${term}: recording card is discoverable`);
      assert.ok(!card.closest('[inert]'), `${term}: recording card is interactive`);
    }
  } finally { await cleanup(); }
});
