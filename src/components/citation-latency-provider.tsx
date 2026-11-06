"use client";
import React, {createContext,useContext,useEffect,useState} from 'react';
import {atlasPath} from '@/lib/atlas-path';
import {bundledCitationView,parseCitationView,type CitationView} from '@/lib/field-velocity/citation-latency-view';
const Context = createContext<CitationView>(bundledCitationView);
const documents = new WeakMap<object,Promise<CitationView>>();
export function useCitationView() {return useContext(Context);}

/** One request/adoption per actual document, including StrictMode and route remounts. */
export function loadDocumentCitation(document:object, fetcher:typeof fetch = fetch) {
  let pending = documents.get(document);
  if (!pending) {
    pending = (async()=> {
      const response = await fetcher(atlasPath('/api/citation-latency/latest'),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(35000)});
      if (response.status !== 200 || response.redirected || !/^application\/json(;|$)/i.test(response.headers.get('content-type')??'')) throw new Error('Invalid citation response');
      const text = await response.text();
      if (text.length > 1_100_000) throw new Error('Citation response too large');
      const next = await parseCitationView(JSON.parse(text));
      if (!next.data || Date.parse(next.data.generatedAt) < Date.parse(bundledCitationView.data!.generatedAt)) throw new Error('Stale citation response');
      return next;
    })().catch(()=>bundledCitationView);
    documents.set(document,pending);
  }
  return pending;
}
export function CitationLatencyProvider({children}:{children:React.ReactNode}) {
  const [view,setView] = useState(bundledCitationView);
  useEffect(()=> {
    let active=true;
    loadDocumentCitation(document).then(next=> {if(active)setView(next);});
    return ()=> {active=false;};
  },[]);
  return <Context.Provider value={view}>{children}</Context.Provider>;
}
