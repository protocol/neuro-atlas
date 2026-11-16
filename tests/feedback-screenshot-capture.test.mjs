import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {freezeFeedbackRegion} from '../src/components/feedback/screenshot.ts';
import {readFile} from 'node:fs/promises';
test('screenshot preview has explicit CSS width/height/flex bounds despite the global image reset',async()=>{
 const css=await readFile(new URL('../src/components/feedback/feedback.css',import.meta.url),'utf8');
 const rule=css.match(/\.atlas-feedback-capture img\s*\{([^}]+)\}/)?.[1]??'';
 assert.match(rule,/width:\s*72px/);assert.match(rule,/height:\s*48px/);assert.match(rule,/flex:\s*none/);assert.match(rule,/object-fit:\s*contain/);
});
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
test('freeze only bounded selected card crop; preserve current SVG state and exclude editable/feedback/private content synchronously',()=>{
 const dom=new JSDOM('<!doctype html><body><p id="outside">Outside private content</p><article data-performance-card="x"><h2>Chart title</h2><svg><circle cx="20" cy="30" r="9" fill="blue"/></svg><input value="secret"><textarea>private draft</textarea><div data-atlas-feedback>Transient overlay</div></article></body>');
 const {document}=dom.window,card=document.querySelector('article'),target=document.querySelector('circle');
 Object.defineProperty(dom.window,'innerWidth',{value:390});Object.defineProperty(dom.window,'innerHeight',{value:700});
 card.getBoundingClientRect=()=>rect(10,120,370,500);target.getBoundingClientRect=()=>rect(40,240,18,18);
 const frozen=freezeFeedbackRegion(target);target.setAttribute('fill','red');
 assert.ok(frozen.width<=390&&frozen.height<=700);assert.match(frozen.node.outerHTML,/fill="blue"/);assert.doesNotMatch(frozen.node.outerHTML,/Outside private content|secret|private draft|Transient overlay/);
 assert.equal(document.querySelectorAll('[data-feedback-snapshot]').length,0,'snapshot never mounted on real page');
 assert.ok(frozen.highlight.width>=18);dom.window.close();
});
test('loaded same-origin logos and an existing canvas freeze into PNG bytes instead of failing the whole chart',()=>{
 const dom=new JSDOM('<body><article><img src="/logo.png"><canvas></canvas><svg><circle/></svg></article></body>',{url:'http://127.0.0.1:35643'}),doc=dom.window.document;
 const image=doc.querySelector('img'),canvas=doc.querySelector('canvas'),card=doc.querySelector('article');
 card.getBoundingClientRect=()=>rect(10,120,370,500);image.getBoundingClientRect=()=>rect(40,240,18,18);
 Object.defineProperties(image,{complete:{value:true},naturalWidth:{value:32},naturalHeight:{value:32}});
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
 dom.window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,FROZEN';
 canvas.width=32;canvas.height=32;
 const frozen=freezeFeedbackRegion(image);
 assert.match(frozen.node.outerHTML,/src="data:image\/png;base64,FROZEN"/);assert.equal(frozen.node.querySelectorAll('canvas').length,0);
 image.src='/changed-logo.png';assert.doesNotMatch(frozen.node.outerHTML,/changed-logo/);dom.window.close();
});
test('body/full-page selections and offscreen elements fail instead of capturing unrelated content',()=>{
 const dom=new JSDOM('<body><h1>Heading</h1></body>'),doc=dom.window.document;
 doc.body.getBoundingClientRect=()=>rect(0,0,390,2000);
 assert.throws(()=>freezeFeedbackRegion(doc.body));
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');doc.body.append(svg);svg.getBoundingClientRect=()=>rect(20,40,200,100);
 assert.notEqual(freezeFeedbackRegion(svg).root,doc.body,'an SVG directly under body cannot widen capture to the page');
 doc.querySelector('h1').getBoundingClientRect=()=>rect(0,-500,300,40);
 assert.throws(()=>freezeFeedbackRegion(doc.querySelector('h1')));dom.window.close();
});
