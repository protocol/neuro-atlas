import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useInsertionEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

globalThis.React=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

test('Next-style history changes during insertion effects never synchronously schedule consent UI updates',async()=>{
 const {AtlasAnalytics}=await import('../src/components/atlas-analytics.tsx');
 const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'https://www.plneuro.xyz/neuro-atlas'});
 const old={window:globalThis.window,document:globalThis.document};Object.assign(globalThis,{window:dom.window,document:dom.window.document});
 dom.window.fetch=async()=>({ok:true,json:async()=>({eligible:true,measurementId:'G-SYNTHETIC1',consentRequired:true})});
 const errors=[];const original=console.error;console.error=(...args)=>errors.push(args.map(String).join(' '));
 const root=createRoot(document.getElementById('root'));
 function NextHistory({navigate}){useInsertionEffect(()=>{if(navigate)window.history.pushState({},'', '/neuro-atlas/milestones')},[navigate]);return null;}
 const tree=navigate=>React.createElement(AtlasAnalytics,null,React.createElement(NextHistory,{navigate}));
 try{
  await act(async()=>root.render(tree(false)));
  assert.ok(document.querySelector('[aria-label="Analytics cookies"]'));
  await act(async()=>root.render(tree(true)));
  assert.equal(dom.window.location.pathname,'/neuro-atlas/milestones');
  assert.equal(errors.filter(x=>x.includes('useInsertionEffect must not schedule updates')).length,0,errors.join('\n'));
 }finally{await act(async()=>root.unmount());console.error=original;dom.window.close();Object.assign(globalThis,old);}
});
