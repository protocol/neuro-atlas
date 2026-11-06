import test from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import { mount } from './modal-helpers.mjs';
import { CitationLatencyProvider, loadDocumentCitation } from '../src/components/citation-latency-provider.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
import { BUNDLED_CITATION_REVISION, bundledCitation } from '../src/lib/field-velocity/citation-latency-bundled.ts';
import snapshot from '../src/data/field-velocity/neurotech.snapshot.json' with {type:'json'};

const rev = '1'.repeat(40);

test('one immutable accepted release per document, even across remounts/focus/StrictMode', async () => {
 const doc = {}; let calls=0;
 const fetcher = async () => { calls++; return Response.json({revision:rev,bundle:bundledCitation.bundle}); };
 const [a,b] = await Promise.all([loadDocumentCitation(doc,fetcher),loadDocumentCitation(doc,fetcher)]);
 assert.equal(a,b); assert.equal(calls,1);
 await loadDocumentCitation(doc,fetcher); assert.equal(calls,1);
 await loadDocumentCitation({},fetcher); assert.equal(calls,2);
});

test('Pace adopts only vintage, pins CSV/JSON exports, retains translation evidence and fresh bundle on failure', async () => {
 const oldFetch = globalThis.fetch;
 const data = selectPace(parseFeed(snapshot));
 const before = JSON.stringify(data);
 let calls=0;
 globalThis.fetch = async () => {calls++; return Response.json({revision:rev,bundle:bundledCitation.bundle});};
 const cleanup = await mount(React.createElement(React.StrictMode,null,React.createElement(CitationLatencyProvider,null,React.createElement(PaceReadings,{data,flat:true}))), '#idea_vintage');
 try {
  const deadline = Date.now()+3000;
  while (!document.querySelector(`a[href$="/${rev}/citation-latency.csv"]`) && Date.now()<deadline) await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
  const modal = document.querySelector('dialog[open]'); assert.ok(modal);
  assert.ok(modal.querySelector(`a[href$="/${rev}/citation-latency.csv"]`));
  assert.ok(modal.querySelector(`a[href$="/${rev}/citation-latency.json"]`));
  assert.match(modal.textContent,/9.0 years \(2023\)/);
  assert.equal(modal.querySelectorAll('[data-source-observation]').length,27);
  assert.equal(calls,1); assert.equal(JSON.stringify(data),before);
 } finally { await cleanup(); globalThis.fetch=oldFetch; }
 globalThis.fetch = async()=>{throw new Error('SYNTHETIC_SOURCE_FAILURE');};
 const cleanupFailure = await mount(React.createElement(CitationLatencyProvider,null,React.createElement(PaceReadings,{data})), '#idea_vintage');
 try {
  const modal = document.querySelector('dialog[open]');
  assert.match(modal.textContent,/9.0 years \(2023\)/);
  assert.ok(modal.querySelector(`a[href$="/${BUNDLED_CITATION_REVISION}/citation-latency.csv"]`));
  assert.doesNotMatch(modal.textContent,/fallback|outage/i);
 } finally {await cleanupFailure();globalThis.fetch=oldFetch;}
});
