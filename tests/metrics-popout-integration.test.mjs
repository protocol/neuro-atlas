import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, StrictMode } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('the default recording card opens one source-qualified detail popup at its generic URL', async () => {
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)));
  try {
    const trigger = document.querySelector('[data-draft-popout-trigger="metric-recording-hours"]');
    assert.ok(trigger, 'real recording chart is a popup trigger');
    const card = document.getElementById('draft-recording-hours');
    assert.equal(card.querySelectorAll('[data-draft-preview] svg.draft-plot-svg').length, 1);
    assert.equal(card.querySelectorAll('[data-draft-preview] [data-source-observation]').length, 12);
    trigger.focus(); await click(trigger); await settle();
    const modal = document.querySelector('dialog[open]');
    assert.ok(modal);
    assert.equal(window.location.hash, '#metric-recording-hours');
    assert.equal(modal.querySelectorAll('svg.draft-plot-svg').length, 1);
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, 12);
    assert.equal(modal.querySelectorAll('.draft-plot-inspector').length, 1);
    assert.equal(modal.querySelector('.draft-plot-inspector').textContent, '');
    assert.equal(modal.querySelectorAll('[data-copy-chart="metric-recording-hours"]').length, 1);
    assert.match(modal.querySelector('.draft-plot-data').textContent, />50,000/);
    assert.match(modal.querySelector('.draft-plot-data').textContent, />100/);
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    assert.equal(new Set(ids).size, ids.length);
    await click(modal.querySelector('.pc-modal-header button')); await settle(); await settle();
    assert.equal(document.querySelectorAll('dialog[open]').length, 0);
    assert.equal(document.activeElement === trigger, true);
    await act(async () => window.history.forward()); await settle(); await settle();
    assert.equal(document.querySelectorAll('dialog[open]').length, 1);
  } finally { await cleanup(); }
});


test('related measurement links leave focus inside the popup and restore their own Expectations origin', async () => {
  const cleanup = await mount(React.createElement(StrictMode, null, React.createElement(Page)), '#expectations', win => { win.HTMLElement.prototype.scrollIntoView = () => {}; });
  try {
    const link = document.querySelector('[data-related-measurement="metric-recording-hours"]');
    link.focus(); await click(link); await settle(); await settle();
    let modal = document.querySelector('dialog[open]');
    assert.ok(modal);
    assert.equal(document.activeElement === modal.querySelector('.pc-modal-header button'), true, 'background heading must not steal popup focus');
    await click(modal.querySelector('.pc-modal-header button')); await settle(); await settle();
    assert.equal(window.location.hash, '#expectations');
    assert.equal(document.activeElement === link, true);
    await act(async () => window.history.forward()); await settle(); await settle();
    modal = document.querySelector('dialog[open]');
    assert.equal(document.activeElement === modal.querySelector('.pc-modal-header button'), true);
  } finally { await cleanup(); }
});
