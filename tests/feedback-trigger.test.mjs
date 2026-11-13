import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import Home from '../src/app/page.tsx';
import * as Nav from '../src/components/site-nav.tsx';
import {SiteFooter} from '../src/components/site-footer.tsx';
import {PlateHero} from '../src/components/plate-header.tsx';
import {Feedback} from '../src/components/feedback/feedback.tsx';
const bootstrap=new JSDOM('<!doctype html><body></body>');
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {mount,click}=await import('./modal-helpers.mjs');bootstrap.window.close();
globalThis.React=React;
const moduleValue=value=>value.default??value;
const hero=()=>React.createElement(PlateHero,{kicker:'Plate',title:'Test plate',description:'Description',stats:[]});
const sidebar=moduleValue(Nav).SideNav;
for(const [name,Component] of [['sidebar',sidebar],['mobile footer',SiteFooter]])test(`${name} retains Feedback without a contribution action`,()=>{
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(Component)));
  try{
    const triggers=dom.window.document.querySelectorAll('[data-feedback-trigger]');assert.equal(triggers.length,1);
    const trigger=triggers[0];
    assert.equal(dom.window.document.querySelector('a[href*="/pulls"],a[href*="/compare"]'),null);
    assert.ok(trigger.querySelector('svg[aria-hidden="true"]'),'compact decorative chat icon');
    assert.equal(trigger.textContent.trim(),'Feedback');assert.equal(trigger.type,'button');
    assert.equal(trigger.getAttribute('aria-haspopup'),'dialog');
  }finally{dom.window.close();}
});
for(const [name,Component] of [['mobile header',moduleValue(Nav).MobileBar],['landing',moduleValue(Home)],['plate',hero]])test(`${name} has no duplicate Feedback or contribution action`,()=>{
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(Component)));
  try{
    assert.equal(dom.window.document.querySelector('[data-feedback-trigger]'),null);
    assert.equal(dom.window.document.querySelector('a[href*="github.com/protocol/neuro-atlas/"]'),null);
    assert.doesNotMatch(dom.window.document.body.textContent,/Contribute via PR/);
  }finally{dom.window.close();}
});

test('controller has no floating launch button; retained trigger starts and cancels selection',async()=>{
  const cleanup=await mount(React.createElement(React.Fragment,null,React.createElement(SiteFooter),React.createElement(Feedback)),'',win=>{win.fetch=async()=>Response.json({enabled:false,connected:false});});
  try{
    assert.equal(document.querySelector('.atlas-feedback-launch'),null);
    const trigger=document.querySelector('[data-feedback-trigger]');assert.ok(trigger);trigger.focus();
    await click(trigger);assert.ok(document.querySelector('[data-feedback-selection]'));
    await click(trigger);assert.equal(document.querySelector('[data-feedback-selection]'),null);
    assert.equal(document.querySelector('[data-feedback-composer]'),null);
    assert.equal(document.activeElement,trigger,'cancel returns focus to the trigger');
    await click(trigger);assert.ok(document.querySelector('[data-feedback-selection]'));
    await act(async()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    assert.equal(document.activeElement,trigger);
  }finally{await cleanup();}
});
