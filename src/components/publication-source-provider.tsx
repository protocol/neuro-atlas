"use client";
import React,{createContext,useContext,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {z} from 'zod';
import {atlasPath} from '@/lib/atlas-path';
import {assertPublicationScienceCoverage,parsePublicationSnapshot,type PublicationSnapshot} from '@/lib/publication-data';
import BUNDLED from '@/data/publications/publication-charts.snapshot.json';

const MAX_BYTES=2_100_000;
type ClientOptions={parser?:(input:unknown)=>unknown;allowTestOnly?:boolean;now?:()=>Date};
const boundary=z.object({schemaVersion:z.literal(2),source:z.object({url:z.literal('https://api.openalex.org'),
 testOnly:z.boolean(),capturedAt:z.string().datetime({offset:true})}).passthrough()}).passthrough();
function validated(input:unknown,options:ClientOptions={}) {
 const value=boundary.parse(input);
 if(value.source.testOnly!==false&&!(options.allowTestOnly&&value.source.testOnly))throw new Error('Test-only snapshot refused');
 return (options.parser??parsePublicationSnapshot)(input) as PublicationSnapshot;
}
function bundled() {try{return validated(BUNDLED);}catch{return undefined;}}
const INITIAL=bundled();
export const PublicationSourceContext=createContext<PublicationSnapshot|undefined>(INITIAL);
const Context=PublicationSourceContext;
export function usePublicationSource() {return useContext(Context);}

type NavigationState={key:string;pending?:Promise<PublicationSnapshot|undefined>;lastGood?:PublicationSnapshot};
const navigations=new WeakMap<object,NavigationState>();
async function responseText(response:Response) {
 if(response.status!==200||response.redirected||!response.body||!/^application\/json(;|$)/i.test(response.headers.get('content-type')??''))throw new Error('Invalid publication response');
 const length=response.headers.get('content-length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)){await response.body.cancel();throw new Error('Publication response too large');}
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new Error('Publication response too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function latest(fetcher:typeof fetch,options:ClientOptions) {
 const response=await fetcher(atlasPath('/api/publications'),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(35000)});
 const envelope=z.object({revision:z.string().regex(/^(?:bundled|[a-f0-9]{40})$/),snapshotSha256:z.string().regex(/^[a-f0-9]{64}$/),snapshot:z.unknown()}).strict().parse(JSON.parse(await responseText(response)));
 const bytes=new TextEncoder().encode(JSON.stringify(envelope.snapshot,null,2)+'\n');
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(actual!==envelope.snapshotSha256)throw new Error('Publication response hash mismatch');
 const snapshot=validated(envelope.snapshot,options);
 const age=(options.now?.()??new Date()).getTime()-Date.parse(snapshot.source.capturedAt);
 if(!Number.isFinite(age)||age < -300000||age > 14*86400000)throw new Error('Publication source freshness refused');
 return snapshot;
}
/** One bounded fetch per active pathname/document, including StrictMode remounts. */
export function loadNavigationPublication(document:object,key:string,fallback:PublicationSnapshot|undefined=INITIAL,fetcher:typeof fetch=fetch,options:ClientOptions={}) {
 let state=navigations.get(document);
 if(!state){state={key,lastGood:fallback};navigations.set(document,state);}
 if(state.key!==key||!state.pending){
  state.key=key;const current=state;
  current.pending=latest(fetcher,options).then(next=>{
   assertPublicationScienceCoverage(next,current.lastGood??fallback);
   if(!current.lastGood||Date.parse(next.source.capturedAt)>=Date.parse(current.lastGood.source.capturedAt))current.lastGood=next;
   return current.lastGood;
  }).catch(()=>current.lastGood??fallback);
 }
 return state.pending!;
}
export function PublicationSourceProvider({children}:{children:React.ReactNode}) {
 const [snapshot,setSnapshot]=useState<PublicationSnapshot|undefined>(INITIAL);
 const pathname=usePathname()??'/';
 useEffect(()=>{
  let active=true;
  loadNavigationPublication(document,pathname,INITIAL).then(next=>{
   if(active&&next)setSnapshot(previous=>!previous||Date.parse(next.source.capturedAt)>=Date.parse(previous.source.capturedAt)?next:previous);
  });
  return ()=>{active=false;};
 },[pathname]);
 return <Context.Provider value={snapshot}>{children}</Context.Provider>;
}
