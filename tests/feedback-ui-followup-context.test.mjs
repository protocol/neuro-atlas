// The mounted public logger intentionally has no authenticated history/follow-up UI.
// Preserve real A/H1 + B/H2 saves, route/remount, Back/Escape and fresh-target coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const bootstrap=new JSDOM('<!doctype html><body></body>');
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {mount,click,settle}=await import('./modal-helpers.mjs');bootstrap.window.close();
import {Feedback} from '../src/components/feedback/feedback.tsx';
globalThis.React=React;
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
async function fill(value){const field=document.querySelector('[aria-label="Feedback"]');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});}
async function key(value,extra={}){await act(async()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra})));}
async function pin(tag){
  const target=document.createElement(tag);target.textContent=`Local ${tag} target`;document.body.append(target);
  target.getBoundingClientRect=()=>({left:40,top:200,right:340,bottom:240,width:300,height:40});document.elementFromPoint=()=>target;
  await act(async()=>target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:90,clientY:220})));return target;
}
for(const cancellation of ['Back','Escape'])test(`public ${cancellation} after two real targeted saves and route/remount cannot expose history or inherit saved context`,async()=>{
  const posts=[];let cleanup;
  const setup=win=>{
    Object.defineProperty(win,'crypto',{value:webcrypto});
    win.fetch=async(url,options)=>{
      if(url.endsWith('/public/config'))return Response.json({enabled:true,connected:true});
      assert.equal(url,'/api/feedback/public');assert.equal(options.method,'POST');
      posts.push({body:JSON.parse(options.body),key:options.headers['Idempotency-Key']});return Response.json({saved:true},{status:202});
    };
  };
  try{
    cleanup=await mount(React.createElement(Feedback),'',setup);
    await click(button('Feedback'));await pin('h1');await fill('First note');await click(document.querySelector('[data-feedback-submit]'));await settle();
    await click(button('Feedback'));assert.ok(document.querySelector('[data-feedback-selection]'));await pin('h2');await fill('Second note');await click(document.querySelector('[data-feedback-submit]'));await settle();
    assert.deepEqual(posts.map(p=>p.body.context.element.tagName),['h1','h2']);assert.notEqual(posts[0].key,posts[1].key);
    window.history.pushState(null,'','/funding');
    await click(button('Feedback'));assert.ok(document.querySelector('[data-feedback-selection]'));
    if(cancellation==='Back')await click(button('Back'));else await key('Escape');
    assert.equal(document.querySelector('[data-feedback-outline]'),null);assert.equal(document.querySelector('[aria-label="Feedback"]').value,'');assert.equal(document.querySelector('[data-feedback-submit]').disabled,true);
    assert.doesNotMatch(document.querySelector('[data-feedback-composer]').textContent,/history|account|follow up/i);assert.equal(posts.length,2);
    await cleanup();cleanup=undefined;
    cleanup=await mount(React.createElement(Feedback),'',win=>{setup(win);win.history.replaceState(null,'','/funding');});
    await click(button('Feedback'));assert.ok(document.querySelector('[data-feedback-selection]'));
    if(cancellation==='Back')await click(button('Back'));else await key('Escape');
    assert.equal(document.querySelector('[data-feedback-outline]'),null);assert.equal(document.querySelector('[data-feedback-submit]').disabled,true);assert.equal(posts.length,2);
    await click(button('Select element'));
    if(cancellation==='Back')await click(button('General page'));else await pin('h1');
    await fill('Fresh chosen context');await click(document.querySelector('[data-feedback-submit]'));await settle();
    assert.equal(posts.length,3);assert.equal(posts[2].body.context.route,'/funding');
    assert.equal(posts[2].body.expectedVersion,undefined);
    if(cancellation==='Back')assert.equal(posts[2].body.context.element,undefined);else assert.equal(posts[2].body.context.element.tagName,'h1');
  }finally{if(cleanup)await cleanup();}
});

test('visible-control Tab wrapping stays inside the single-field public composer at a short mobile viewport',async()=>{
  const cleanup=await mount(React.createElement(Feedback),'',win=>{win.fetch=async()=>Response.json({enabled:true,connected:true});Object.defineProperty(win,'innerWidth',{value:320,configurable:true});Object.defineProperty(win,'innerHeight',{value:320,configurable:true});});
  try{
    await click(button('Feedback'));await click(button('General page'));await fill('A note');
    const close=document.querySelector('[data-feedback-close]'),send=document.querySelector('[data-feedback-submit]');
    close.focus();await key('Tab',{shiftKey:true});assert.equal(document.activeElement,send);
    await key('Tab');assert.equal(document.activeElement,close);
    assert.equal(document.querySelector('[data-feedback-composer]').style.maxHeight,'300px');
  }finally{await cleanup();}
});
