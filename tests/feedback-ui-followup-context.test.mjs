import test from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const bootstrap = new JSDOM('<!doctype html><body></body>');
globalThis.window = bootstrap.window; globalThis.document = bootstrap.window.document;
const {mount, click, settle} = await import('./modal-helpers.mjs');
bootstrap.window.close();
import {Feedback} from '../src/components/feedback/feedback.tsx';
globalThis.React = React;
const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'content-type':'application/json'}});
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim()===text);
async function fill(value) {
  const field=document.querySelector('[aria-label="Feedback"]');
  await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});
}
async function escape() {
  await act(async()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
}
async function pin(tag) {
  const target=document.createElement(tag);target.textContent=`Actual ${tag} target`;document.body.append(target);
  target.getBoundingClientRect=()=>({left:40,top:200,right:340,bottom:240,width:300,height:40});
  document.elementFromPoint=()=>target;
  await act(async()=>target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:90,clientY:220})));
  return target;
}

for (const cancellation of ['Back','Escape']) test(`historical follow-up ${cancellation} cancels unresolved context after two real saves, route change and remount`,async()=>{
  const posts=[],rows=[];let popup,cleanup;
  const setup=win=>{
    Object.defineProperty(win,'crypto',{value:webcrypto});
    win.open=()=>popup={closed:false,location:{href:''},close(){this.closed=true;}};
    win.fetch=async(url,options)=>{
      if(url.endsWith('/config'))return json({enabled:true,connected:true});
      if(url.endsWith('/start')){const body=JSON.parse(options.body);return json({authorizeUrl:`https://github.com/login/oauth/authorize?state=${body.state}&code_challenge=${body.codeChallenge}&code_challenge_method=S256`});}
      if(url.endsWith('/finish'))return json({session:'synthetic-owner-session',expiresAt:new Date(Date.now()+60000).toISOString(),actor:{githubId:1,login:'synthetic-owner'}});
      if(options.method==='POST'){
        const body=JSON.parse(options.body);posts.push({url,body});
        const id=url.endsWith('/record-a/followups')?'record-a':rows.length===0?'record-a':'record-b';
        const previous=rows.find(row=>row.id===id);
        const row={id,state:'needs_clarification',version:previous?previous.version+1:1,createdAt:'',updatedAt:''};
        if(previous)Object.assign(previous,row);else rows.push(row);
        return json(row,202);
      }
      if(url.includes('?limit=20'))return json({items:[...rows].reverse()});
      return json(rows.find(row=>url.endsWith('/'+row.id)));
    };
  };
  const authenticate=async()=>{
    await click(button('Sign in with GitHub'));await settle();
    const state=new URL(popup.location.href).searchParams.get('state');
    await act(async()=>window.dispatchEvent(new window.MessageEvent('message',{origin:window.location.origin,source:popup,data:{type:'atlas-feedback-oauth',code:'synthetic-code',state}})));
    await settle();
  };
  const historyA=async()=>{
    await click(button('History'));await settle();
    const details=[...document.querySelectorAll('summary')].find(node=>node.textContent==='My recent feedback');
    await click(details);
    await click([...document.querySelectorAll('[data-feedback-composer] button')].find(node=>node.textContent.includes('record-a')));await settle();
  };
  const cancelFollowup=async()=>{
    await click(button('Follow up'));
    assert.ok(document.querySelector('[data-feedback-selection]'));
    if(cancellation==='Back')await click(button('Back'));else await escape();
    assert.equal(!!document.querySelector('[aria-label="Feedback"]'),false,'canceling is not an implicit General page choice; return to history instead');
    assert.match(document.querySelector('[data-feedback-composer]').textContent,/Saved · record-a/);
    assert.equal(posts.length,2,'cancellation must not submit or silently widen a historical request');
  };
  try{
    cleanup=await mount(React.createElement(Feedback),'',setup);
    await click(button('Feedback'));await pin('h1');await authenticate();await fill('First element feedback');await click(document.querySelector('[data-feedback-submit]'));await settle();
    await click(button('Feedback'));await click(button('Select element'));await pin('h2');await fill('Second element feedback');await click(document.querySelector('[data-feedback-submit]'));await settle();
    assert.deepEqual(posts.map(post=>post.body.context.element.tagName),['h1','h2'],'fixture actually saves two differently targeted records');
    window.history.pushState(null,'','/funding');
    await click(button('Feedback'));await historyA();await cancelFollowup();
    await cleanup();cleanup=undefined;

    cleanup=await mount(React.createElement(Feedback),'',win=>{setup(win);win.history.replaceState(null,'','/funding');});
    await click(button('Feedback'));await click(button('General page'));await authenticate();await historyA();await cancelFollowup();
    await click(button('Follow up'));
    let selected;
    if(cancellation==='Back')await click(button('General page'));else selected=await pin('h1');
    await fill('Explicitly chosen follow-up context');await click(document.querySelector('[data-feedback-submit]'));await settle();
    assert.equal(posts.length,3);
    const last=posts.at(-1);assert.ok(last.url.endsWith('/record-a/followups'));
    assert.equal(last.body.expectedVersion,1);assert.equal(last.body.context.route,'/funding');
    if(selected){assert.equal(last.body.context.element.tagName,'h1');assert.equal(document.querySelector(last.body.context.element.selector),selected);}
    else assert.equal(last.body.context.element,undefined,'page-only context requires the explicit General page action');
  }finally{if(cleanup)await cleanup();}
});
