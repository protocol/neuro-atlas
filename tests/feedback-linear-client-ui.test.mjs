import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const bootstrap=new JSDOM('<!doctype html><body></body>');
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {mount,click,settle}=await import('./modal-helpers.mjs');bootstrap.window.close();
import {Feedback} from '../src/components/feedback/feedback.tsx';
globalThis.React=React;
const json=(value,status=200)=>Response.json(value,{status});
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);

test('single-field composer labels Linear sign-in and audience, sends only the Linear policy without changing picker',async()=>{
  const posts=[];let popup;
  const cleanup=await mount(React.createElement(Feedback),'',win=>{
    Object.defineProperty(win,'crypto',{value:webcrypto});
    win.open=()=>popup={closed:false,location:{href:''},close(){this.closed=true;}};
    win.fetch=async(url,options)=>{
      if(url.endsWith('/config'))return json({enabled:true,connected:true,provider:'linear',policyVersion:'atlas-feedback-linear-v1'});
      if(url.endsWith('/start')){const b=JSON.parse(options.body);return json({provider:'linear',transaction:'A'.repeat(100),expiresAt:new Date(Date.now()+300000).toISOString(),authorizeUrl:`https://linear.app/oauth/authorize?state=${b.state}&code_challenge=${b.codeChallenge}&code_challenge_method=S256&scope=read,issues:create,comments:create&actor=user&response_type=code`});}
      if(url.endsWith('/finish'))return json({provider:'linear',session:'synthetic-sealed-session',expiresAt:new Date(Date.now()+60000).toISOString(),actor:{linearId:'11111111-1111-4111-8111-111111111111',workspaceId:'22222222-2222-4222-8222-222222222222',login:'Synthetic owner'}});
      if(options.method==='DELETE')return new Response(null,{status:204});
      if(options.method==='POST'){posts.push(JSON.parse(options.body));return json({id:'synthetic-record',state:'received',version:1},202);}
      if(url.includes('?limit'))return json({items:[]});
      return json({id:'synthetic-record',state:'received',version:1,createdAt:'',updatedAt:''});
    };
  });
  try {
    await click(button('Feedback'));assert(document.querySelector('[data-feedback-selection]'));await click(button('General page'));await settle();
    assert(button('Sign in with Linear'));
    assert.equal(document.querySelectorAll('textarea').length,1);assert.equal(document.querySelectorAll('input').length,0);
    const disclosure=document.querySelector('.atlas-feedback-note').textContent;
    assert.match(disclosure,/Linear/);assert.match(disclosure,/members with issue access/);assert.match(disclosure,/designated private review channel/);assert.match(disclosure,/only after human approval/);
    await click(button('Sign in with Linear'));await settle();
    await act(async()=>window.dispatchEvent(new window.MessageEvent('message',{origin:window.location.origin,source:popup,data:{type:'atlas-feedback-oauth',code:'synthetic-code',state:new URL(popup.location.href).searchParams.get('state')}})));
    await settle();
    const field=document.querySelector('textarea');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(field,'Private note');field.dispatchEvent(new Event('input',{bubbles:true}));});
    await click(document.querySelector('[data-feedback-submit]'));await settle();
    assert.equal(posts.length,1);assert.equal(posts[0].processingConsent.policyVersion,'atlas-feedback-linear-v1');assert.equal(posts[0].feedback,'Private note');assert.equal(posts[0].publicTask,undefined);
  }finally{await cleanup();}
});
