import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
const data = selectPerformance(parseFeed(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'))));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));

import { mount, click, settle } from './modal-helpers.mjs';

test('chart opens in a named modal, locks scroll, traps focus, closes visibly and restores trigger without scrolling', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }));
  try {
    const trigger = document.querySelector('[data-performance-card="tissue-mapped"] button[aria-haspopup="dialog"]');
    assert.ok(trigger, 'Compact chart needs a dialog trigger, not inline expansion');
    trigger.focus();
    await click(trigger);
    const dialog = document.querySelector('dialog[open]');
    assert.ok(dialog);
    assert.ok(dialog.getAttribute('aria-labelledby'));
    assert.equal(window.location.hash, '#selected-tissue-volume-checkpoints');
    assert.equal(document.body.style.overflow, 'hidden');
    const close = dialog.querySelector('button[aria-label^="Close"]');
    assert.equal(document.activeElement, close);
    await act(async () => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert.ok(dialog.contains(document.activeElement));
    assert.notEqual(document.activeElement, close, 'Shift-Tab wraps to last dialog control');
    await click(close); await settle();
    assert.equal(document.querySelector('dialog[open]'), null);
    assert.equal(document.activeElement, trigger);
    assert.equal(document.body.style.overflow, '');
    assert.equal(window.location.href, 'https://atlas.example/field-velocity?review=1');
    await act(async () => window.history.forward());
    // History events are asynchronous in jsdom. Wait for the retained modal
    // state rather than one fixed settle window under parallel suite load.
    for (let attempt = 0; attempt < 60 && !document.querySelector('dialog[open]'); attempt++) await settle();
    assert.ok(document.querySelector('dialog[open]'), 'Forward restores modal');
    await act(async () => document.querySelector('dialog[open]').dispatchEvent(new Event('cancel', { cancelable: true })));
    await settle();
    assert.equal(document.querySelector('dialog[open]'), null);
  } finally { await cleanup(); }
});

for (const [id, count] of [['simultaneously-recorded-neurons', 3], ['tissue-mapped', 7], ['neural-recording-hours', 11]]) test(`${id} fresh URL mounts only its selected source observations; backdrop closes`, async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#' + id);
  try {
    const dialog = document.querySelector('dialog[open]');
    assert.ok(dialog);
    assert.equal(dialog.querySelectorAll('[data-source-observation]').length, count);
    assert.equal(document.querySelectorAll('[data-curve-point]').length, count);
    assert.match(dialog.textContent, /Definition(?:s)? (?:&|and) methodology/);
    if (id === 'neural-recording-hours') assert.match(dialog.textContent, /More than 100 hours/);
    if (id === 'tissue-mapped') assert.match(dialog.textContent, /0.00819/);
    await click(dialog);
    assert.equal(document.querySelector('dialog[open]'), null);
    assert.equal(window.location.hash, '#metrics');
    assert.equal(document.activeElement, document.querySelector(`[data-performance-card="${id}"] .pc-trigger`));
  } finally { await cleanup(); }
});

test('modal navigation disables browser automatic history scrolling while mounted', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }));
  try { assert.equal(window.history.scrollRestoration, 'manual'); }
  finally { await cleanup(); }
});

test('close returns to the original fragment and opening preserves framework history state', async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance }), '#original-section');
  try {
    window.history.replaceState({ framework: 'preserved' }, '', window.location.href);
    const trigger = document.querySelector('[data-performance-card="neural-recording-hours"] .pc-trigger');
    await click(trigger);
    assert.equal(window.history.state.framework, 'preserved');
    await click(document.querySelector('dialog .pc-modal-header button')); await settle();
    assert.equal(window.location.href, 'https://atlas.example/field-velocity?review=1#original-section');
    assert.equal(window.history.state.framework, 'preserved');
  } finally { await cleanup(); }
});
