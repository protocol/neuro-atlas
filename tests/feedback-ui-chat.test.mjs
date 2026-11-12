import test from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const bootstrap=new JSDOM('<!doctype html><body></body>');
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {mount,click}=await import('./modal-helpers.mjs');bootstrap.window.close();
import {Feedback,FEEDBACK_OPEN_EVENT} from '../src/components/feedback/feedback.tsx';
globalThis.React=React;
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
const open=()=>act(async()=>window.dispatchEvent(new window.CustomEvent(FEEDBACK_OPEN_EVENT)));
const key=(value,extra={})=>act(async()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra})));
async function fill(value){const field=document.querySelector('[aria-label="Feedback"]');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});}
async function pin(tag='h1'){
  const element=document.createElement(tag);element.textContent=`Selected ${tag}`;document.body.append(element);
  element.getBoundingClientRect=()=>({left:40,top:200,right:280,bottom:240,width:240,height:40});document.elementFromPoint=()=>element;
  await act(async()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:90,clientY:220})));
  return element;
}
const connected=win=>{Object.defineProperty(win,'crypto',{value:webcrypto});win.fetch=async()=>Response.json({enabled:true,connected:true});};

test('picker only highlights: no floating instructions/buttons, Escape cancels a fresh selection',async()=>{
  const cleanup=await mount(React.createElement(Feedback),'',connected);
  try{
    await open();
    const picker=document.querySelector('[data-feedback-selection]');assert.ok(picker);
    assert.equal(picker.querySelectorAll('button').length,0,'the entire old toolbar is removed');
    assert.equal(document.querySelector('[data-selection-controls]'),null);
    assert.equal(document.querySelector('[data-feedback-composer]'),null);
    await key('Escape');
    assert.equal(document.querySelector('[data-feedback-selection]'),null);
    assert.equal(document.querySelector('[data-feedback-composer]'),null,'cancel is not implicit General page');
  }finally{await cleanup();}
});

for(const exit of ['Close','Escape'])test(`${exit} clears a selected element; retained text requires fresh selection`,async()=>{
  const cleanup=await mount(React.createElement(Feedback),'',connected);
  try{
    await open();await pin();await fill('Keep only this unsent text');
    await click(button('Select element'));await key('Escape');
    assert.match(document.querySelector('.atlas-feedback-target').textContent,/Selected h1/,'canceling reselect returns to the still-active pin');
    if(exit==='Close')await click(document.querySelector('[data-feedback-close]'));else await key('Escape');
    assert.equal(document.querySelector('[data-feedback-outline]'),null);
    await open();assert.ok(document.querySelector('[data-feedback-selection]'),'true exit always requires fresh selection');
    assert.equal(document.querySelector('[data-feedback-composer]'),null);
    await key('Escape');assert.equal(document.querySelector('[data-feedback-composer]'),null,'retained text cannot bypass selection on cancel');
    await open();await pin('h2');
    assert.equal(document.querySelector('[aria-label="Feedback"]').value,'Keep only this unsent text');
    assert.match(document.querySelector('.atlas-feedback-target').textContent,/Selected h2/);
  }finally{await cleanup();}
});

test('compact chat removes the helper entirely, keeps one growing field and no clear-to-General-page shortcut',async()=>{
  const cleanup=await mount(React.createElement(Feedback),'',connected);
  try{
    await open();await pin();
    const composer=document.querySelector('[data-feedback-composer]');
    assert.equal(composer.querySelectorAll('textarea').length,1);assert.equal(composer.querySelectorAll('input').length,0);
    assert.doesNotMatch(document.body.innerHTML,/On Send, feedback is logged|workspace\/team members|No automatic code changes|atlas-feedback-note/,'no replacement, tooltip or relocated helper');
    assert.equal(button('Clear'),undefined,'clearing cannot bypass intentional context choice');
  }finally{await cleanup();}
});

test('confirmed success remains in place beyond six seconds; Done clears selection and next feedback starts picking',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const cleanup=await mount(React.createElement(Feedback),'',win=>{connected(win);win.fetch=async(url)=>url.endsWith('/config')?Response.json({enabled:true,connected:true}):Response.json({saved:true},{status:202});});
  try{
    await open();await pin();await fill('A confirmed note');await key('Enter');
    const composer=document.querySelector('[data-feedback-composer]'),success=document.querySelector('[data-feedback-success]');
    assert.ok(success);assert.equal(success.getAttribute('role'),'status');
    await act(async()=>t.mock.timers.tick(60000));
    assert.equal(document.querySelector('[data-feedback-success]')===success,true,'no auto-dismiss or polling');
    const close=document.querySelector('[data-feedback-close]'),done=button('Done');
    close.focus();await key('Tab',{shiftKey:true});assert.equal(document.activeElement===done,true);
    await key('Tab');assert.equal(document.activeElement===close,true);
    await click(done);assert.equal(document.querySelector('[data-feedback-composer]'),null);
    await open();assert.ok(document.querySelector('[data-feedback-selection]'));assert.equal(document.querySelector('[data-feedback-outline]'),null);
    await pin('h2');assert.equal(document.querySelector('[aria-label="Feedback"]').value,'');
    assert.notEqual(document.querySelector('[data-feedback-composer]'),composer);
  }finally{await cleanup();}
});

for(const [name,response] of [['HTTP 200',()=>Response.json({saved:true})],['unconfirmed 202',()=>Response.json({saved:false},{status:202})],['extra fields',()=>Response.json({saved:true,id:'not-for-visitors'},{status:202})],['server error',()=>Response.json({saved:true},{status:503})],['transport loss',()=>{throw Error('Synthetic loss');}]])test(`${name} never shows confirmation or clears the draft`,async()=>{
  const posts=[];
  const cleanup=await mount(React.createElement(Feedback),'',win=>{connected(win);win.fetch=async(url,options)=>{if(url.endsWith('/config'))return Response.json({enabled:true,connected:true});posts.push(options);return response();};});
  try{
    await open();await pin();await fill('Keep uncertain note');await key('Enter');
    assert.equal(document.querySelector('[data-feedback-success]'),null);assert.ok(document.querySelector('[role="alert"]'));
    assert.equal(document.querySelector('[aria-label="Feedback"]').value,'Keep uncertain note');
    await key('Enter');assert.equal(posts.length,2);assert.equal(posts[0].body,posts[1].body);assert.equal(posts[0].headers['Idempotency-Key'],posts[1].headers['Idempotency-Key']);
  }finally{await cleanup();}
});

test('pending save fences duplicate sends and reselection; exit cannot attach its old snapshot to a new element',async()=>{
  const posts=[];let resolve;
  const cleanup=await mount(React.createElement(Feedback),'',win=>{connected(win);win.fetch=async(url,options)=>{if(url.endsWith('/config'))return Response.json({enabled:true,connected:true});posts.push(options);return new Promise(done=>{resolve=done;});};});
  try{
    await open();await pin();await fill('An uncertain note');await key('Enter');await key('Enter');
    const field=document.querySelector('[aria-label="Feedback"]');
    assert.equal(posts.length,1);assert.equal(field.disabled,false,'pending Enter must not blur the native field');
    assert.equal(field.readOnly,true,'pending note stays immutable without losing keyboard focus');
    assert.equal(document.activeElement,field);
    assert.equal(button('Select element').disabled,true);
    await click(document.querySelector('[data-feedback-close]'));await open();
    assert.equal(document.querySelector('[data-feedback-selection]'),null,'reopening cannot race an in-flight operation');
    await act(async()=>resolve(Response.json({saved:false},{status:202})));
    await open();assert.ok(document.querySelector('[data-feedback-selection]'));assert.equal(document.querySelector('[data-feedback-outline]'),null);
    await pin('h2');assert.equal(document.querySelector('[aria-label="Feedback"]').value,'An uncertain note');
    await key('Enter');assert.equal(posts.length,2);
    assert.notEqual(posts[0].headers['Idempotency-Key'],posts[1].headers['Idempotency-Key'],'explicit new target starts a new operation');
    assert.equal(JSON.parse(posts[1].body).context.element.tagName,'h2','newly chosen context, not the exited h1 snapshot');
    await act(async()=>resolve(Response.json({saved:true},{status:202})));
  }finally{await cleanup();}
});

test('fresh selection of a replacement node with the same structural path cannot reuse an exited retry snapshot',async()=>{
  const posts=[];
  const cleanup=await mount(React.createElement(Feedback),'',win=>{connected(win);win.fetch=async(url,options)=>{if(url.endsWith('/config'))return Response.json({enabled:true,connected:true});posts.push(options);return Response.json({saved:false},{status:202});};});
  try{
    await open();const original=await pin();await fill('Retained text');await key('Enter');
    await click(document.querySelector('[data-feedback-close]'));original.remove();window.history.pushState(null,'','/funding');
    await open();await pin();await key('Enter');
    assert.equal(posts.length,2);assert.notEqual(posts[0].headers['Idempotency-Key'],posts[1].headers['Idempotency-Key']);
    assert.equal(JSON.parse(posts[1].body).context.route,'/funding');
  }finally{await cleanup();}
});

test('explicitly choosing the unchanged original element after exit preserves the genuine retry UUID and full original snapshot',async()=>{
  const posts=[];
  const cleanup=await mount(React.createElement(Feedback),'',win=>{connected(win);win.fetch=async(url,options)=>{if(url.endsWith('/config'))return Response.json({enabled:true,connected:true});posts.push(options);return Response.json({saved:false},{status:202});};});
  try{
    await open();const original=await pin();await fill('Retained text');await key('Enter');
    await click(document.querySelector('[data-feedback-close]'));
    Object.defineProperty(window,'innerWidth',{value:390,configurable:true});document.documentElement.classList.add('dark');
    await open();assert.equal(document.querySelector('[data-feedback-outline]'),null);
    document.elementFromPoint=()=>original;
    await act(async()=>original.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:90,clientY:220})));
    await key('Enter');
    assert.equal(posts.length,2);assert.equal(posts[0].headers['Idempotency-Key'],posts[1].headers['Idempotency-Key']);assert.equal(posts[0].body,posts[1].body);
    assert.equal(JSON.parse(posts[1].body).context.theme,'system');
  }finally{await cleanup();}
});
