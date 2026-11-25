import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
globalThis.React=React;

test('standalone BCI filters and scenario switches precede the long visible source key',()=>{
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(FieldVelocityGraphDetail,{entry:fieldVelocityGraph('bci-information-transfer-over-time')})));
  try{
    const doc=dom.window.document,key=doc.querySelector('.draft-point-annotations');
    assert.ok(key);
    assert.equal(key.querySelectorAll('[data-point-annotation]').length,14);
    assert.equal(key.closest('details'),null,'standalone evidence stays visible');
    for(const selector of ['[data-exploration-series]','[data-exploration-fit-toggle]','[data-sensory-toggle]']){
      const control=doc.querySelector(selector);assert.ok(control,selector);
      assert.ok(control.compareDocumentPosition(key)&4,`${selector} must precede the long source key`);
    }
  }finally{dom.window.close();}
});
