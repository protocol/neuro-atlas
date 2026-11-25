import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount } from './modal-helpers.mjs';
import { ChartActions } from '../src/components/chart-actions.tsx';
import { ChartExplorationContext } from '../src/components/chart-exploration-context.ts';
import { InlineChartDetail } from '../src/components/chart-modal-slots.tsx';
globalThis.React=React;

test('selected-view image guidance is a full-width block below the Copy link grid, never a max-content action track', async()=>{
 const close=await mount(React.createElement(ChartExplorationContext.Provider,{value:{settings:{hidden:['Speech decoding']},update(){}}},
  React.createElement(InlineChartDetail.Provider,{value:true},React.createElement(ChartActions,{anchor:'metric-panel-bci-bitrate',title:'BCI communication rates'},React.createElement('button',{type:'button','data-image-fixture':true},'Image fixture')))));
 try{
  const row=document.querySelector('[data-chart-actions]'),note=document.querySelector('[data-exploration-export-disabled]');
  assert.ok(row && note);
  assert.equal(row.querySelectorAll('[data-copy-draft-link]').length,1);
  assert.equal(document.querySelector('[data-image-fixture]'),null);
  assert.ok(!row.contains(note),'long guidance must not expand max-content grid tracks on narrow screens');
  assert.ok(row.compareDocumentPosition(note)&window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.match(note.textContent,/Use Copy link to share this view/);
 }finally{await close();}
});
