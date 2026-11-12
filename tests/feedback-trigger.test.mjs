import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import Home from '../src/app/page.tsx';
import * as Nav from '../src/components/site-nav.tsx';
import {PlateHero} from '../src/components/plate-header.tsx';
import {Feedback} from '../src/components/feedback/feedback.tsx';
const bootstrap=new JSDOM('<!doctype html><body></body>');
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {mount,click}=await import('./modal-helpers.mjs');bootstrap.window.close();
globalThis.React=React;
const moduleValue=value=>value.default??value;
const hero=()=>React.createElement(PlateHero,{kicker:'Plate',title:'Test plate',description:'Description',stats:[]});
for(const [name,Component] of [['sidebar',moduleValue(Nav).SideNav],['mobile',moduleValue(Nav).MobileBar],['landing',moduleValue(Home)],['plate',hero]])test(`${name} Feedback sits with the PR action and shares its styling`,()=>{
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(Component)));
  try{
    const trigger=dom.window.document.querySelector('[data-feedback-trigger]');assert.ok(trigger,'relocated Feedback is present');
    const pr=[...trigger.parentElement.children].find(element=>element.tagName==='A'&&element.href.includes('github.com/protocol/neuro-atlas/'));
    assert.ok(pr,'Feedback and Contribute via PR are direct siblings');
    assert.equal(trigger.className,pr.className,'both actions use the same presentation');
    assert.ok(trigger.querySelector('svg[aria-hidden="true"]'),'compact decorative chat icon');
    assert.equal(trigger.textContent.trim(),'Feedback');assert.equal(trigger.type,'button');
    assert.equal(trigger.getAttribute('aria-haspopup'),'dialog');
  }finally{dom.window.close();}
});

test('controller has no floating launch button; relocated trigger starts and cancels selection',async()=>{
  const cleanup=await mount(React.createElement(React.Fragment,null,hero(),React.createElement(Feedback)),'',win=>{win.fetch=async()=>Response.json({enabled:false,connected:false});});
  try{
    assert.equal(document.querySelector('.atlas-feedback-launch'),null);
    const trigger=document.querySelector('[data-feedback-trigger]');assert.ok(trigger);trigger.focus();
    await click(trigger);assert.ok(document.querySelector('[data-feedback-selection]'));
    await click(trigger);assert.equal(document.querySelector('[data-feedback-selection]'),null);
    assert.equal(document.querySelector('[data-feedback-composer]'),null);
    assert.equal(document.activeElement,trigger,'mobile-safe cancel returns focus to the trigger');
    await click(trigger);assert.ok(document.querySelector('[data-feedback-selection]'));
    await act(async()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    assert.equal(document.activeElement,trigger);
  }finally{await cleanup();}
});
