import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useRef } from 'react';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
// React DOM probes input-event support at import time; establish a DOM first.
const bootstrap = new JSDOM('<!doctype html><body></body>');
globalThis.window = bootstrap.window; globalThis.document = bootstrap.window.document;
const { mount, click, settle } = await import('./modal-helpers.mjs');
bootstrap.window.close();
import { ChartModal } from '../src/components/chart-modal.tsx';
import { Feedback } from '../src/components/feedback/feedback.tsx';
globalThis.React = React;
const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
const byText = text => [...document.querySelectorAll('button')].find(x => x.textContent === text);
const key = async (value, extra = {}) => act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...extra })));
async function input(label, value) {
  const element = document.querySelector(`[aria-label="${label}"]`);
  const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
function ChartFixture() {
  const ref = useRef(null);
  return React.createElement(React.Fragment, null,
    React.createElement('button', { ref }, 'Chart origin'),
    React.createElement('article', { 'data-performance-card': 'tissue-mapped' }, React.createElement(ChartModal, { id: 'tissue-mapped', title: 'Tissue mapped', returnFocus: ref }, React.createElement('input', { defaultValue: 'PRIVATE DOM CANARY' }))),
    React.createElement(Feedback));
}

test('native chart survives selection → composer → chart Escape ordering, focus return and disabled draft retention', async () => {
  const cleanup = await mount(React.createElement(ChartFixture), '#tissue-mapped', win => { win.fetch = async () => json({ enabled: false, connected: false }); });
  try {
    const chart = document.querySelector('.pc-modal');
    const origin = document.activeElement;
    await key('f', { altKey: true, shiftKey: true });
    assert.ok(document.querySelector('[data-feedback-composer][open]'));
    await input('Private comment', 'Keep this private');
    await click(byText('Select area'));
    assert.ok(chart.open);
    assert.ok(document.querySelector('[data-feedback-selection][open]'));
    await key('Escape');
    assert.ok(chart.open); assert.ok(document.querySelector('[data-feedback-composer][open]'));
    assert.equal(document.querySelector('[aria-label="Private comment"]').value, 'Keep this private');
    assert.match(document.querySelector('[data-feedback-composer]').textContent, /disabled/i);
    await key('Escape');
    assert.ok(chart.open); assert.equal(document.activeElement, origin);
    await key('f', { altKey: true, shiftKey: true });
    assert.equal(document.querySelector('[aria-label="Private comment"]').value, 'Keep this private');
    assert.equal(document.querySelector('[data-feedback-submit]'), null);
    assert.equal(window.location.hash, '#tissue-mapped');
  } finally { await cleanup(); }
});

test('real client review separates private input, consent starts unchecked, failures retry same key, status/followup same ID', async () => {
  const calls = []; let popup; let failures = 1; let version = 1;
  const status = () => ({ id: 'fixture-id', state: 'needs_clarification', version, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', clarification: 'Please clarify the public task.' });
  const cleanup = await mount(React.createElement(Feedback), '', win => {
    Object.defineProperty(win, 'crypto', { value: webcrypto });
    win.open = () => popup = { closed: false, location: { href: '' }, close() { this.closed = true; } };
    win.fetch = async (url, options) => {
      calls.push({ url, ...options });
      if (url.endsWith('/config')) return json({ enabled: true, connected: true });
      if (url.endsWith('/start')) { const b = JSON.parse(options.body); return json({ authorizeUrl: `https://github.com/login/oauth/authorize?state=${b.state}&code_challenge=${b.codeChallenge}&code_challenge_method=S256` }); }
      if (url.endsWith('/finish')) return json({ session: 'fixture-session', expiresAt: new Date(Date.now() + 60000).toISOString(), actor: { githubId: 1, login: 'owner-fixture' } });
      if (options.method === 'POST') {
        if (failures-- > 0) throw Error('synthetic network loss');
        if (url.endsWith('/followups')) version++;
        return json({ id: 'fixture-id', state: 'needs_clarification', version }, 202);
      }
      return json(url.includes('?limit=20') ? { items: [status()] } : status());
    };
  });
  try {
    await click(byText('Feedback')); await settle();
    await input('Private comment', 'PRIVATE CANARY');
    await click(byText('Sign in with GitHub'));
    await settle();
    const state = new URL(popup.location.href).searchParams.get('state');
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'atlas-feedback-oauth', code: 'fixture-code', state } })));
    await settle();
    await click(byText('Review public task'));
    assert.equal(document.querySelector('[aria-label="Public summary"]').value, '');
    const consent = document.querySelector('[data-feedback-consent]');
    assert.equal(consent.checked, false);
    await input('Public title', 'Improve spacing'); await input('Public summary', 'Improve chart label spacing.'); await input('Acceptance criteria', 'Labels remain readable at 320px');
    assert.equal(document.querySelector('[data-feedback-submit]').disabled, true);
    await click(consent); await click(document.querySelector('[data-feedback-submit]'));
    assert.match(document.querySelector('[role="alert"]').textContent, /draft is still here/);
    await click(document.querySelector('[data-feedback-submit]')); await settle();
    const posts = calls.filter(x => x.method === 'POST' && !x.url.includes('/auth/'));
    assert.equal(posts.length, 2); assert.equal(posts[0].headers['Idempotency-Key'], posts[1].headers['Idempotency-Key']);
    const body = JSON.parse(posts[1].body);
    assert.equal(body.privateComment, 'PRIVATE CANARY');
    assert.equal(JSON.stringify(body.publicTask).includes('PRIVATE'), false);
    assert.equal(body.context.route, '/field-velocity');
    assert.equal(JSON.stringify(body.context).includes('review=1'), false);
    assert.match(document.querySelector('[data-feedback-composer]').textContent, /Please clarify/);
    await click(byText('Follow up'));
    await input('Private comment', 'Private followup'); await click(byText('Review public task'));
    assert.equal(document.querySelector('[data-feedback-consent]').checked, false);
    await input('Public title', 'Refine spacing'); await input('Public summary', 'Use clearer spacing.'); await input('Acceptance criteria', 'No overlap'); await click(document.querySelector('[data-feedback-consent]')); await click(document.querySelector('[data-feedback-submit]')); await settle();
    const follow = calls.find(x => x.url.endsWith('/fixture-id/followups'));
    assert.equal(JSON.parse(follow.body).expectedVersion, 1);
    assert.match(document.querySelector('[data-feedback-composer]').textContent, /Version 2/);
  } finally { await cleanup(); }
});


test('physical shortcut works with an Alt-composed key but never inside editable controls', async () => {
  const cleanup = await mount(React.createElement(ChartFixture), '#tissue-mapped', win => { win.fetch = async () => json({ enabled: false, connected: false }); });
  try {
    document.querySelector('.pc-modal input').focus();
    await key('ƒ', { code: 'KeyF', altKey: true, shiftKey: true });
    assert.equal(document.querySelector('[data-feedback-composer]'), null);
    document.querySelector('.pc-modal button').focus();
    await key('ƒ', { code: 'KeyF', altKey: true, shiftKey: true });
    assert.ok(document.querySelector('[data-feedback-composer][open]'));
  } finally { await cleanup(); }
});


test('status polling pauses while hidden and stops after closing/unmounting', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let popup; let reads = 0;
  const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Feedback)), '', win => {
    Object.defineProperty(win, 'crypto', { value: webcrypto });
    win.open = () => popup = { closed: false, location: { href: '' }, close() { this.closed = true; } };
    win.fetch = async (url, options) => {
      if (url.endsWith('/config')) return json({ enabled: true, connected: true });
      if (url.endsWith('/start')) { const b = JSON.parse(options.body); return json({ authorizeUrl: `https://github.com/login/oauth/authorize?state=${b.state}&code_challenge=${b.codeChallenge}&code_challenge_method=S256` }); }
      if (url.endsWith('/finish')) return json({ session: 'fixture-only', expiresAt: new Date(Date.now() + 60000).toISOString(), actor: { githubId: 1, login: 'fixture' } });
      reads++; return json({ items: [{ id: 'fixture-id', version: 1, state: 'working', createdAt: '', updatedAt: '' }] });
    };
  });
  try {
    await click(byText('Feedback')); await click(byText('Sign in with GitHub')); await settle();
    const state = new URL(popup.location.href).searchParams.get('state');
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'atlas-feedback-oauth', state, code: 'fixture' } })));
    await settle(); const before = reads;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => t.mock.timers.tick(5001)); assert.equal(reads, before);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => document.dispatchEvent(new Event('visibilitychange'))); assert.ok(reads > before);
    await key('Escape'); const after = reads;
    await act(async () => t.mock.timers.tick(15000)); assert.equal(reads, after);
  } finally { await cleanup(); }
});
