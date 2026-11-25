import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createAtlasAnalytics } from '../src/lib/atlas-analytics.ts';
import { FIELD_VELOCITY_GRAPHS, graphPath } from '../src/data/field-velocity-links.ts';

const ID='G-ATLAS12345';
const views=win=>(win.dataLayer??[]).map(args=>Array.from(args)).filter(args=>args[0]==='event'&&args[1]==='page_view');
async function fixture(path,{origin='https://www.plneuro.xyz',choice='granted',eligible=true}={}) {
  const dom=new JSDOM('',{url:origin+path+'?password=private#secret'}),win=dom.window;
  win.localStorage.setItem('pl-ga-consent',choice);
  win.fetch=async()=>({ok:true,json:async()=>({eligible,measurementId:ID,consentRequired:true})});
  const controller=createAtlasAnalytics(win),disconnect=controller.connect(()=>{});
  await new Promise(resolve=>setTimeout(resolve,0));
  return {win,controller,close(){disconnect();win.close();}};
}

test('all25 canonical graph pages retain consent-gated path-only measurement without opening arbitrary paths',async()=>{
  const paths=FIELD_VELOCITY_GRAPHS.map(entry=>'/neuro-atlas'+graphPath(entry));
  const h=await fixture(paths[0]);
  try {
    const script=h.win.document.querySelector('script');
    assert.ok(script,'known standalone graph should remain eligible under existing production consent');
    script.dispatchEvent(new h.win.Event('load'));
    for(const path of paths.slice(1))h.win.history.pushState({},'',path+'?password=private#secret');
    assert.deepEqual(views(h.win).map(event=>event[2].page_location),paths.map(path=>'https://www.plneuro.xyz'+path));
    assert.doesNotMatch(JSON.stringify(views(h.win)),/private|secret|password/);
    for(const suffix of ['/private-free-form','/neuralink-brand-context','/citation-latency/child'])h.win.history.pushState({},'','/neuro-atlas/field-velocity'+suffix);
    assert.equal(views(h.win).length,25);
  }finally{h.close();}
});

test('graph pages retain preview, denial, server-eligibility and withdrawal privacy gates',async()=>{
  const path='/neuro-atlas'+graphPath(FIELD_VELOCITY_GRAPHS[0]);
  for(const options of [{origin:'https://preview.vercel.app'},{choice:'denied'},{eligible:false}]){
    const h=await fixture(path,options);try{assert.equal(h.win.document.querySelector('script'),null);}finally{h.close();}
  }
  const h=await fixture(path);
  try{
    h.win.document.querySelector('script')?.dispatchEvent(new h.win.Event('load'));
    h.win.document.cookie='_ga=graph-path;path='+path;
    h.controller.choose('denied');
    assert.equal(h.win['ga-disable-'+ID],true);
    assert.doesNotMatch(h.win.document.cookie,/_ga=/);
    h.win.history.pushState({},'', '/neuro-atlas'+graphPath(FIELD_VELOCITY_GRAPHS[1]));
    assert.equal(views(h.win).length,1);
  }finally{h.close();}
});

const sharedPath='/neuro-atlas/field-velocity/bci-information-transfer-over-time';
const tuple='utm_source=neuro_atlas&utm_medium=share&utm_campaign=chart_share&utm_content=bci-information-transfer-over-time';
async function sharedFixture(search=tuple,{choice='granted',eligible=true}={}) {
  const dom=new JSDOM('',{url:'https://www.plneuro.xyz'+sharedPath+'?'+search+'&password=private#secret'}),win=dom.window;
  if(choice) win.localStorage.setItem('pl-ga-consent',choice);
  win.fetch=async()=>({ok:true,json:async()=>({eligible,measurementId:ID,consentRequired:true})});
  const controller=createAtlasAnalytics(win),disconnect=controller.connect(()=>{});
  await new Promise(resolve=>setTimeout(resolve,0));
  return {win,controller,close(){disconnect();win.close();}};
}

test('bounded shared-link attribution survives delayed script load on its landing only, stripping every other value',async()=>{
  const h=await sharedFixture(tuple+'&chartHidden=bci-information-transfer-over-time:speech&utm_term=private');
  try{
    const script=h.win.document.querySelector('script');assert.ok(script);
    assert.equal(views(h.win).length,0);
    h.win.history.pushState({},'', '/neuro-atlas/funding?'+tuple);
    script.dispatchEvent(new h.win.Event('load'));
    assert.deepEqual(views(h.win).map(v=>v[2].page_location),['https://www.plneuro.xyz'+sharedPath+'?'+tuple,'https://www.plneuro.xyz/neuro-atlas/funding']);
    assert.doesNotMatch(JSON.stringify(h.win.dataLayer),/private|secret|chartHidden|utm_term/);
    h.win.history.pushState({},'',sharedPath+'?'+tuple);
    assert.equal(views(h.win).at(-1)[2].page_location,'https://www.plneuro.xyz'+sharedPath,'internal navigation cannot replay a referral');
  }finally{h.close();}
});

test('arbitrary, repeated and mismatched campaign input is not analytics data',async()=>{
  for(const search of [tuple.replace('neuro_atlas','private'),tuple+'&utm_source=neuro_atlas',tuple.replace('bci-information-transfer-over-time','citation-latency'),tuple.replace('chart_share','free-form')]){
    const h=await sharedFixture(search);try{
      h.win.document.querySelector('script').dispatchEvent(new h.win.Event('load'));
      assert.equal(views(h.win)[0][2].page_location,'https://www.plneuro.xyz'+sharedPath);
    }finally{h.close();}
  }
});

test('shared-link attribution never bypasses consent, server eligibility or revocation during delayed load',async()=>{
  for(const options of [{choice:'denied'},{eligible:false}]){
    const h=await sharedFixture(tuple,options);try{assert.equal(h.win.document.querySelector('script'),null);assert.equal(views(h.win).length,0);}finally{h.close();}
  }
  const h=await sharedFixture(tuple,{choice:null});try{
    assert.equal(h.win.document.querySelector('script'),null);
    h.controller.choose('granted');
    const script=h.win.document.querySelector('script');assert.ok(script);
    h.controller.choose('denied');script.dispatchEvent(new h.win.Event('load'));
    assert.equal(views(h.win).length,0);
    h.win.history.pushState({},'', '/neuro-atlas/funding');h.controller.choose('granted');
    assert.equal(views(h.win).length,1);
    assert.equal(views(h.win)[0][2].page_location,'https://www.plneuro.xyz/neuro-atlas/funding');
  }finally{h.close();}
});

test('a consented shared landing retains only fixed attribution when the visitor accepts the initial prompt',async()=>{
  const h=await sharedFixture(tuple,{choice:null});try{
    assert.equal(h.win.document.querySelector('script'),null);
    h.controller.choose('granted');h.win.document.querySelector('script').dispatchEvent(new h.win.Event('load'));
    assert.equal(views(h.win)[0][2].page_location,'https://www.plneuro.xyz'+sharedPath+'?'+tuple);
  }finally{h.close();}
});
