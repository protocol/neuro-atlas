import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { readOverviewReturn, claimGraphOrigin } from '../src/lib/field-velocity/overview-return.ts';
const overview=atlasPath('/field-velocity');
const good=()=>({href:overview,query:'H01',groups:{'Mapping Scale':'full'},rails:{'metric-category-0-charts':193},scrollY:410,anchor:'idea_vintage'});
const broken=[null,[],{href:123},{href:overview},{...good(),query:[]},{...good(),groups:null},{...good(),groups:{'Mapping Scale':'private'}},{...good(),rails:null},{...good(),rails:{'metric-category-0-charts':'193'}},{...good(),rails:{'metric-category-0-charts':Infinity}},{...good(),scrollY:-1},{...good(),scrollY:NaN},{...good(),anchor:'not-a-chart'},{...good(),href:'//outside.invalid/field-velocity'}];

test('malformed history restoration is ignored without throwing or applying partial state',()=>{
  const dom=new JSDOM('',{url:'https://preview.invalid'+overview});
  try{
    for(const snapshot of broken){
      dom.window.history.replaceState({atlasOverviewReturn:snapshot},'');
      assert.equal(readOverviewReturn(dom.window),null,JSON.stringify(snapshot));
    }
    dom.window.history.replaceState({atlasOverviewReturn:good()},'');
    assert.deepEqual(readOverviewReturn(dom.window),good());
  }finally{dom.window.close();}
});

test('matching local tickets require complete snapshots and a finite, unexpired, nonfuture timestamp',()=>{
  const dom=new JSDOM('',{url:'https://preview.invalid'+overview});
  try{
    for(const snapshot of broken){
      dom.window.sessionStorage.setItem('atlasGraphReturnTicket',JSON.stringify({kind:'overview',href:overview,snapshot,time:Date.now()}));
      assert.equal(readOverviewReturn(dom.window),null,JSON.stringify(snapshot));
    }
    for(const time of [null,'tomorrow',Date.now()+60_000,Date.now()-121_000]){
      dom.window.sessionStorage.setItem('atlasGraphReturnTicket',JSON.stringify({kind:'overview',href:overview,snapshot:good(),time}));
      assert.equal(readOverviewReturn(dom.window),null,String(time));
    }
    dom.window.sessionStorage.setItem('atlasGraphReturnTicket','{"bad');
    assert.equal(readOverviewReturn(dom.window),null);
  }finally{dom.window.close();}
});

test('unavailable session storage preserves valid entry history and rejects malformed graph origin',()=>{
  const dom=new JSDOM('',{url:'https://preview.invalid'+overview});
  try{
    Object.defineProperty(dom.window,'sessionStorage',{get(){throw new Error('unavailable');}});
    dom.window.history.replaceState({atlasOverviewReturn:good(),atlasOverviewOrigin:{href:12}},'');
    assert.deepEqual(readOverviewReturn(dom.window),good());
    assert.equal(claimGraphOrigin(dom.window),null);
  }finally{dom.window.close();}
});
