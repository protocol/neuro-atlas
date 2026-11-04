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
    assert.ok(document.querySelector('[data-feedback-selection]'));
    await click(byText('General page'));
    Object.defineProperty(document.querySelector('[aria-label="Feedback"]'), 'scrollHeight', {value:95, configurable:true});
    await input('Feedback', 'Keep this private');
    assert.equal(document.querySelector('[aria-label="Feedback"]').style.height, '95px', 'one field grows for longer feedback');
    await click(byText('Select element'));
    assert.ok(chart.open);
    assert.ok(document.querySelector('[data-feedback-selection]'));
    await key('Escape');
    assert.ok(chart.open); assert.ok(document.querySelector('[data-feedback-composer][open]'));
    assert.equal(document.querySelector('[aria-label="Feedback"]').value, 'Keep this private');
    assert.match(document.querySelector('[data-feedback-composer]').textContent, /disabled/i);
    await key('Escape');
    assert.ok(chart.open); assert.equal(document.activeElement, origin);
    await key('f', { altKey: true, shiftKey: true });
    assert.equal(document.querySelector('[aria-label="Feedback"]').value, 'Keep this private');
    assert.equal(document.querySelector('[data-feedback-submit]').disabled, true);
    assert.equal(window.location.hash, '#tissue-mapped');
  } finally { await cleanup(); }
});

test('picker hovers exact DOM, intercepts full activation sequence and pins above an existing native chart', async () => {
  const cleanup = await mount(React.createElement(ChartFixture), '#tissue-mapped', win => { win.fetch = async () => json({enabled:false,connected:false}); });
  try {
    const chart = document.querySelector('.pc-modal');
    const button = document.createElement('button'); button.innerHTML = '<span><svg><path /></svg></span>'; chart.append(button);
    button.getBoundingClientRect = () => ({left:50,top:60,right:170,bottom:100,width:120,height:40});
    document.elementFromPoint = () => button.querySelector('path');
    const activated = [];
    for (const type of ['pointerdown','pointerup','mousedown','mouseup','click']) button.addEventListener(type, () => activated.push(type));
    await key('f', {altKey:true,shiftKey:true});
    const picker = document.querySelector('[data-feedback-selection]');
    assert.notEqual(picker.tagName, 'DIALOG', 'picker must not make the real page inert');
    assert.equal(picker.parentElement, chart, 'picker controls live in the native modal so they remain interactive');
    assert.equal(document.querySelector('[data-feedback-composer]'), null);
    await key('Tab');
    assert.equal(document.activeElement.textContent, 'General page', 'picker Tab stays in toolbar, not native chart controls');
    await key('Tab', {shiftKey:true});
    assert.equal(document.activeElement.textContent, 'Back');
    await act(async () => button.dispatchEvent(new window.MouseEvent('pointermove', {bubbles:true,clientX:80,clientY:80})));
    const outline = document.querySelector('[data-feedback-outline]');
    assert.ok(outline, 'hover draws a real DOM outline');
    assert.equal(outline.style.left, '50px'); assert.equal(outline.style.width, '120px');
    for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
      const event = new window.MouseEvent(type, {bubbles:true,cancelable:true,clientX:80,clientY:80});
      await act(async () => button.querySelector('path').dispatchEvent(event));
      assert.equal(event.defaultPrevented, true, `${type} default prevented`);
    }
    assert.deepEqual(activated, []);
    assert.ok(document.querySelector('[data-feedback-composer][open]'));
    assert.match(document.querySelector('.atlas-feedback-target').textContent, /button/);
    assert.equal(chart.open, true);
    assert.equal(document.activeElement.getAttribute('aria-label'), 'Feedback');
    await click(byText('Select element')); await key('Escape');
    assert.match(document.querySelector('.atlas-feedback-target').textContent, /button/, 'cancel keeps pinned reference');
    await click(byText('Clear'));
    assert.equal(document.querySelector('.atlas-feedback-target').textContent, 'General page');
    await key('Escape'); assert.ok(chart.open);
  } finally { await cleanup(); }
});

test('one private field sends directly, retains exact failed retry and follows up on the same versioned ID', async () => {
  const calls = []; let popup; let failures = 1; let version = 1;
  const status = () => ({ id: 'fixture-id', state: 'needs_clarification', version, createdAt: '', updatedAt: '', clarification: 'Please clarify.' });
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
    await click(byText('Feedback')); await click(byText('General page')); await settle();
    assert.equal(document.querySelectorAll('[data-feedback-composer] textarea').length, 1);
    assert.equal(document.querySelectorAll('[data-feedback-composer] input').length, 0);
    assert.ok(document.querySelector('[aria-label="Feedback"]'), 'the only editing field is Feedback');
    assert.match(document.querySelector('[data-feedback-composer]').textContent, /Sent privately to the agent/);
    const heading = document.createElement('h1'); document.body.append(heading);
    heading.getBoundingClientRect = () => ({left:50,top:80,right:350,bottom:120,width:300,height:40});
    document.elementFromPoint = () => heading;
    await click(byText('Select element'));
    await act(async () => heading.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,clientX:90,clientY:100})));
    await input('Feedback', 'PRIVATE CANARY');
    await click(byText('Sign in with GitHub')); await settle();
    const state = new URL(popup.location.href).searchParams.get('state');
    await act(async () => window.dispatchEvent(new window.MessageEvent('message', { origin: window.location.origin, source: popup, data: { type: 'atlas-feedback-oauth', code: 'fixture-code', state } })));
    await settle();
    document.querySelector('[aria-label="Feedback"]').focus();
    await key('Enter', {shiftKey:true});
    await key('Enter', {isComposing:true});
    await key('Enter', {keyCode:229});
    assert.equal(calls.filter(x => x.method==='POST' && !x.url.includes('/auth/')).length, 0);
    await key('Enter');
    assert.match(document.querySelector('[role="alert"]').textContent, /draft is still here/);
    assert.equal(document.querySelector('[aria-label="Feedback"]').value, 'PRIVATE CANARY');
    Object.defineProperty(window, 'innerWidth', {value:390, configurable:true});
    document.body.prepend(document.createElement('h1'));
    const underlying = document.createElement('dialog'); document.body.append(underlying); underlying.showModal();
    await click(document.querySelector('[data-feedback-submit]')); await settle();
    const posts = calls.filter(x => x.method === 'POST' && !x.url.includes('/auth/'));
    assert.equal(posts.length, 2); assert.equal(posts[0].headers['Idempotency-Key'], posts[1].headers['Idempotency-Key']);
    assert.equal(posts[0].body, posts[1].body);
    const body = JSON.parse(posts[1].body);
    assert.deepEqual(Object.keys(body).sort(), ['context', 'feedback', 'processingConsent']);
    assert.equal(body.feedback, 'PRIVATE CANARY');
    assert.deepEqual(body.processingConsent, {approved:true, policyVersion:'atlas-feedback-simple-v1'});
    assert.equal(body.context.route, '/field-velocity');
    assert.equal(body.context.element.tagName, 'h1');
    assert.equal(body.context.element.selector, 'html:nth-of-type(1) > body:nth-of-type(1) > h1:nth-of-type(1)');
    assert.equal(body.context.element.label, undefined);
    assert.equal(JSON.stringify(body.context).includes('review=1'), false);
    assert.equal(document.querySelector('[data-feedback-composer]'), null, 'close only after a confirmed receipt');
    const toast = document.querySelector('[data-feedback-toast]');
    assert.ok(toast, 'receipt has saved indication');
    assert.equal(toast.parentElement, underlying, 'saved indication lives in retained native modal');
    assert.equal(toast.getAttribute('popover'), 'manual', 'saved indication uses the actual top layer');
    assert.match(toast.textContent, /Feedback saved/);
    await click(byText('Feedback')); await click(byText('History')); await settle();
    assert.match(document.querySelector('[data-feedback-composer]').textContent, /Please clarify/);
    await click(byText('Follow up'));
    await input('Feedback', 'Private followup'); await click(document.querySelector('[data-feedback-submit]')); await settle();
    const follow = calls.find(x => x.url.endsWith('/fixture-id/followups'));
    assert.equal(JSON.parse(follow.body).expectedVersion, 1);
    assert.equal(JSON.parse(follow.body).feedback, 'Private followup');
    assert.equal(JSON.parse(follow.body).publicTask, undefined);
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
    assert.ok(document.querySelector('[data-feedback-selection]'));
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
    await click(byText('Feedback')); await click(byText('General page')); await click(byText('Sign in with GitHub')); await settle();
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

test('fresh untargeted launch starts hover picking; General page opens the single field', async () => {
 const cleanup=await mount(React.createElement(Feedback),'',win=>{win.fetch=async()=>json({enabled:false,connected:false});});
 try {
  await click(byText('Feedback'));
  assert.ok(document.querySelector('[data-feedback-selection]'), 'fresh note starts with hover picker');
  assert.equal(document.querySelector('[data-feedback-composer]'),null);
  await click(byText('General page'));
  assert.ok(document.querySelector('[aria-label="Feedback"]'));
  await input('Feedback','Retain draft'); await key('Escape');
  await click(byText('Feedback'));
  assert.equal(document.querySelector('[aria-label="Feedback"]').value,'Retain draft');
 } finally {await cleanup();}
});
