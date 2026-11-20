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
