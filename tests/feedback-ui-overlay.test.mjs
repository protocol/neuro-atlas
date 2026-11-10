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

test('one visitor field sends without sign-in, retains exact failed retry and clears only on confirmed Linear receipt', async () => {
  const calls=[];let failures=1;
  const cleanup=await mount(React.createElement(Feedback),'',win=>{
    Object.defineProperty(win,'crypto',{value:webcrypto});
    win.open=()=>{throw Error('Visitors never sign in');};
    win.fetch=async(url,options)=>{
      calls.push({url,...options});
      if(url.endsWith('/config'))return json({enabled:true,connected:true});
      if(options.method==='POST') {if(failures-->0)throw Error('synthetic network loss');return json({saved:true},202);}
      throw Error('No history/status endpoint is allowed');
    };
  });
  try {
    await click(byText('Feedback'));await click(byText('General page'));await settle();
    const composer=document.querySelector('[data-feedback-composer]');
    assert.equal(composer.querySelectorAll('textarea').length,1);assert.equal(composer.querySelectorAll('input').length,0);
    assert.match(composer.textContent,/logged in Linear/i);assert.match(composer.textContent,/workspace\/team members/i);
    assert.doesNotMatch(composer.textContent,/sign in|GitHub|draft PR|History|Account/i);
    const heading=document.createElement('h1');document.body.append(heading);
    heading.getBoundingClientRect=()=>({left:50,top:80,right:350,bottom:120,width:300,height:40});
    document.elementFromPoint=()=>heading;
    await click(byText('Select element'));
    await act(async()=>heading.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:90,clientY:100})));
    await input('Feedback','PRIVATE CANARY');document.querySelector('[aria-label="Feedback"]').focus();
    assert.equal(document.querySelector('[data-feedback-submit]').disabled,false,'visitor can send immediately');
    await key('Enter',{shiftKey:true});await key('Enter',{isComposing:true});await key('Enter',{keyCode:229});
    assert.equal(calls.filter(c=>c.method==='POST').length,0);
    await key('Enter');
    assert.match(document.querySelector('[role="alert"]').textContent,/draft is still here/);
    assert.equal(document.querySelector('[aria-label="Feedback"]').value,'PRIVATE CANARY');
    Object.defineProperty(window,'innerWidth',{value:390,configurable:true});
    document.body.prepend(document.createElement('h1'));
    const underlying=document.createElement('dialog');document.body.append(underlying);underlying.showModal();
    await click(document.querySelector('[data-feedback-submit]'));await settle();
    const posts=calls.filter(c=>c.method==='POST');assert.equal(posts.length,2);
    assert.equal(posts[0].url,'/api/feedback/public');assert.equal(posts[0].headers['Idempotency-Key'],posts[1].headers['Idempotency-Key']);assert.equal(posts[0].body,posts[1].body);
    const body=JSON.parse(posts[1].body);assert.deepEqual(Object.keys(body).sort(),['context','feedback']);
    assert.equal(body.feedback,'PRIVATE CANARY');assert.equal(body.context.route,'/field-velocity');
    assert.equal(body.context.element.tagName,'h1');assert.equal(body.context.element.selector,'html:nth-of-type(1) > body:nth-of-type(1) > h1:nth-of-type(1)');
    assert.equal(body.context.element.label,undefined);assert.equal(JSON.stringify(body.context).includes('review=1'),false);
    assert.equal(document.querySelector('[data-feedback-composer]'),null);
    const toast=document.querySelector('[data-feedback-toast]');assert.ok(toast);assert.equal(toast.parentElement,underlying);assert.equal(toast.getAttribute('popover'),'manual');assert.match(toast.textContent,/Logged in Linear/i);
    await click(byText('Feedback'));await click(byText('General page'));
    assert.equal(document.querySelector('[aria-label="Feedback"]').value,'');
    assert.equal(document.querySelector('[data-feedback-outline]'),null,'next note does not retain a previous saved note target');
    assert.ok(calls.every(c=>c.url==='/api/feedback/public'||c.url==='/api/feedback/public/config'));
  } finally {await cleanup();}
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


test('public composer never loads history or polls another visitor feedback', async t => {
  t.mock.timers.enable({apis:['setInterval']});
  const calls=[];
  const cleanup=await mount(React.createElement(React.StrictMode,null,React.createElement(Feedback)),'',win=>{
    win.fetch=async(url,options)=>{calls.push({url,...options});return json({enabled:true,connected:true});};
  });
  try {
    await click(byText('Feedback'));await click(byText('General page'));await settle();
    assert.doesNotMatch(document.querySelector('[data-feedback-composer]').textContent,/sign in|history|account|PR ready/i);
    const before=calls.length;await act(async()=>t.mock.timers.tick(15000));
    assert.equal(calls.length,before);assert.ok(calls.every(c=>c.url==='/api/feedback/public/config'));
    await key('Escape');await act(async()=>t.mock.timers.tick(15000));assert.equal(calls.length,before);
  }finally{await cleanup();}
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


test('narrow composition anchors below the picked element when room exists and clamps after keyboard-sized resize', async () => {
  const cleanup = await mount(React.createElement(Feedback), '', win => { win.fetch = async () => json({ enabled:false, connected:false }); });
  try {
    Object.defineProperty(window, 'innerWidth', {value:390, configurable:true});
    Object.defineProperty(window, 'innerHeight', {value:1000, configurable:true});
    const target = document.createElement('h2'); target.textContent = 'Middle of the page'; document.body.append(target);
    target.getBoundingClientRect = () => ({left:40,top:478,right:350,bottom:522,width:310,height:44});
    document.elementFromPoint = () => target;
    await click(byText('Feedback'));
    await act(async () => target.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true,clientX:90,clientY:500})));
    const d = document.querySelector('[data-feedback-composer]');
    d.getBoundingClientRect = () => { const left=parseFloat(d.style.left)||0,top=parseFloat(d.style.top)||0;return {left,top,right:left+320,bottom:top+208,width:320,height:208}; };
    await act(async () => window.dispatchEvent(new Event('resize')));
    assert.equal(parseFloat(d.style.top),530,'use the actual element bottom + 8 when the narrow viewport has room');
    assert.equal(parseFloat(d.style.left),40,'horizontal placement is element-relative within viewport bounds');
    Object.defineProperty(window, 'innerHeight', {value:320, configurable:true});
    await act(async () => window.dispatchEvent(new Event('resize')));
    assert.ok(parseFloat(d.style.top)>=10 && parseFloat(d.style.top)+208<=310,'keyboard-sized viewport keeps composer reachable');
  } finally { await cleanup(); }
});
