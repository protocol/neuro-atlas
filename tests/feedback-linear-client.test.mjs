import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {webcrypto,randomUUID} from 'node:crypto';
import {FeedbackClient} from '../src/lib/feedback-client.ts';
import {fixture,input} from './feedback-linear-server-fixture.test.mjs';

test('actual HTTP Linear PKCE client binds popup origin/source/state and sealed proof; one-field submit uses separate policy',async t=>{
  const f=await fixture(t),dom=new JSDOM('',{url:f.api.url+'/field-velocity'}),calls=[];
  const popup={closed:false,location:{href:''},close(){this.closed=true;}};
  dom.window.open=()=>{calls.push('open');return popup;};
  const client=new FeedbackClient({window:dom.window,crypto:webcrypto,fetch:async(url,init)=>{
    calls.push({url,...init});return fetch(f.api.url+url,{...init,headers:{...init.headers,Origin:f.api.url}});
  }});
  t.after(()=>{client.dispose();dom.window.close();});
  assert.equal((await client.config()).provider,'linear');
  const promise=client.signIn();
  for(let i=0;i<100&&!popup.location.href;i++)await new Promise(r=>setTimeout(r,5));
  assert(popup.location.href,'Linear authorize URL was accepted');
  const url=new URL(popup.location.href);
  const message=(patch={},origin=f.api.url,source=popup)=>dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin,source,data:{type:'atlas-feedback-oauth',state:url.searchParams.get('state'),code:randomUUID(),...patch}}));
  message({},'https://evil.example');message({},undefined,{});message({state:'wrong'});
  assert.equal(calls.filter(r=>r.url?.endsWith('/finish')).length,0);
  message();message();popup.close();
  const auth=await promise;assert.equal(auth.provider,'linear');assert.equal(calls.filter(r=>r.url?.endsWith('/finish')).length,1);
  const finish=JSON.parse(calls.find(r=>r.url?.endsWith('/finish')).body);assert.equal(typeof finish.transaction,'string');
  assert.equal((await client.submit(input(),randomUUID())).state,'received');
  const post=calls.find(r=>r.method==='POST'&&!r.url.includes('/auth/'));
  assert.equal(post.headers.Authorization,undefined);assert.equal(post.headers['X-Atlas-Feedback-Session'],auth.session);assert.equal(post.cache,'no-store');
  assert.equal(dom.window.localStorage.length,0);assert.equal(dom.window.sessionStorage.length,0);assert.equal(dom.window.document.cookie,'');
  await client.signOut();assert.equal(f.state.revoked,true);assert.equal(client.getSession(),null);
});


test('disposal aborts and revokes a late HTTP Linear finish instead of retaining an upstream capability',async t=>{
  const f=await fixture(t),dom=new JSDOM('',{url:f.api.url}),popup={closed:false,location:{href:''},close(){this.closed=true;}};
  let opens=0,release,ready=false,signal;
  const gate=new Promise(resolve=>{release=resolve;});
  dom.window.open=()=>{opens++;return popup;};
  const client=new FeedbackClient({window:dom.window,crypto:webcrypto,fetch:async(url,init)=>{
    // Deliberately simulate a response already completed just before browser abort.
    const response=await fetch(f.api.url+url,{...init,signal:undefined,headers:{...init.headers,Origin:f.api.url}});
    if(url.endsWith('/finish')){signal=init.signal;ready=true;await gate;}
    return response;
  }});
  t.after(()=>{release();client.dispose();dom.window.close();});
  await client.config();const result=client.signIn().then(value=>({value}),error=>({error}));
  for(let i=0;i<100&&!popup.location.href;i++)await new Promise(r=>setTimeout(r,5));
  dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin:f.api.url,source:popup,data:{type:'atlas-feedback-oauth',state:new URL(popup.location.href).searchParams.get('state'),code:randomUUID()}}));
  for(let i=0;i<100&&!ready;i++)await new Promise(r=>setTimeout(r,5));assert(ready);
  client.dispose();assert.equal((await result).error.code,'auth_cancelled');assert.equal(signal.aborted,true);
  release();for(let i=0;i<100&&!f.state.revoked;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(f.state.revoked,true);assert.equal(client.getSession(),null);
  await assert.rejects(client.signIn(),e=>e.code==='closed');assert.equal(opens,1);
});
