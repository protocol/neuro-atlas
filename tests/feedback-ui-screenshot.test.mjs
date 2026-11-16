import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const bootstrap=new JSDOM('<body></body>');globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {mount,click}=await import('./modal-helpers.mjs');bootstrap.window.close();
import {Feedback,FEEDBACK_OPEN_EVENT} from '../src/components/feedback/feedback.tsx';
globalThis.React=React;
const image={status:'captured',mimeType:'image/png',width:200,height:100,data:'synthetic-png'};
async function setup(capture){
 const posts=[];
 const cleanup=await mount(React.createElement(Feedback,{capture}),'',win=>{Object.defineProperty(win,'crypto',{value:webcrypto});win.fetch=async(url,options)=>{if(url.endsWith('/config'))return Response.json({enabled:true,connected:true});posts.push(options);return Response.json({error:'unavailable'},{status:503});};});
 await act(async()=>window.dispatchEvent(new window.CustomEvent(FEEDBACK_OPEN_EVENT)));
 const element=document.createElement('h1');element.textContent='Target';document.body.append(element);element.getBoundingClientRect=()=>({left:20,top:100,right:300,bottom:140,width:280,height:40});document.elementFromPoint=()=>element;
 await act(async()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:100,clientY:120})));
 const field=document.querySelector('[aria-label="Feedback"]');
 await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(field,'Synthetic note');field.dispatchEvent(new Event('input',{bubbles:true}));});
 return {cleanup,posts,field};
}
const enter=field=>act(async()=>field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));
test('selection freezes screenshot once and retries preserve exact image, context and request key',async()=>{
 let count=0;const {cleanup,posts,field}=await setup(async()=>{count++;return image;});
 try{await enter(field);await enter(field);assert.equal(count,1);assert.equal(posts.length,2);assert.deepEqual(JSON.parse(posts[0].body).screenshot,image);assert.equal(posts[0].body,posts[1].body);assert.deepEqual(posts[0].headers,posts[1].headers);}finally{await cleanup();}
});
test('failed screenshot does not silently send: Enter is blocked until explicit send-without-image gesture',async()=>{
 const {cleanup,posts,field}=await setup(async()=>({status:'unavailable',reason:'capture_failed'}));
 try{await enter(field);assert.equal(posts.length,0);assert.match(document.body.textContent,/Screenshot unavailable/);const fallback=[...document.querySelectorAll('button')].find(b=>b.textContent==='Send without screenshot');assert.ok(fallback);await click(fallback);assert.equal(posts.length,1);assert.deepEqual(JSON.parse(posts[0].body).screenshot,{status:'unavailable',reason:'capture_failed'});}finally{await cleanup();}
});
