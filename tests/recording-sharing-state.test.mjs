import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const chart = () => React.createElement(PerformanceCurves, { data, provenance, flat: true, selection: ['simultaneously-recorded-neurons'] });
const changeView = async value => act(async () => {
  const select = document.querySelector('[data-recording-view-select]');
  select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
});

test('copy-link recovery and success state cannot outlive the selected recording view', async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let denied = true, attempts = 0, copied;
  const installClipboard = () => Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => {
    attempts++; if (denied) throw new Error('Clipboard denied'); copied = text;
  } } } });
  let cleanup;
  try {
    cleanup = await mount(chart(), '#simultaneously-recorded-neurons');
    installClipboard();
    await changeView('human-channels');
    await click(document.querySelector('dialog [data-copy-draft-link]'));
    let fallback = document.querySelector('dialog .chart-link-fallback');
    assert.equal(new URL(fallback.querySelector('input').value).searchParams.get('recordingView'), 'human-channels');
    const beforeChange = attempts;
    await changeView('optical');
    assert.equal(Boolean(document.querySelector('dialog .chart-link-fallback')), false, 'Do not relabel a previous-view fallback as the current chart');
    assert.equal(attempts, beforeChange, 'Changing a view never writes to the clipboard');
    await click(document.querySelector('dialog [data-copy-draft-link]'));
    fallback = document.querySelector('dialog .chart-link-fallback');
    const recipientUrl = fallback.querySelector('input').value;
    assert.equal(fallback.querySelector('a').href, recipientUrl);
    assert.equal(new URL(recipientUrl).searchParams.get('recordingView'), 'optical');
    await cleanup(); cleanup = undefined;
    cleanup = await mount(chart(), '', win => win.history.replaceState(null, '', recipientUrl));
    assert.equal(document.querySelector('[data-recording-view]').dataset.recordingView, 'optical');
    denied = false;
    await changeView('electrical');
    await click(document.querySelector('dialog [data-copy-draft-link]'));
    assert.equal(new URL(copied).searchParams.get('recordingView'), 'electrical');
    assert.equal(document.querySelector('dialog [data-copy-draft-link]').parentElement.querySelector('[role=status]').textContent, 'Copied');
    const afterCopy = attempts;
    await changeView('human-channels');
    assert.equal(document.querySelector('dialog [data-copy-draft-link]').parentElement.querySelector('[role=status]').textContent, '', 'A new view must not claim that its link was already copied');
    assert.equal(attempts, afterCopy);
  } finally {
    if (cleanup) await cleanup();
    if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator;
  }
});
