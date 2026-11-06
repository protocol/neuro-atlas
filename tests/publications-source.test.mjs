import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const fixture=()=>({schemaVersion:2,source:{url:'https://api.openalex.org',testOnly:true,
 capturedAt:'2026-11-06T09:00:00Z',paperAsOf:'2026-11-06',authorAsOf:'2026-11-06',methodSha256:'a'.repeat(64)},
 tables:{},audit:{},matchedGrowth:{rows:[],evidence:{}}});
const options={parser:v=>v,allowTestOnly:true,now:()=>new Date('2026-11-07T09:00:00Z')};

test('server uses bounded feed seam, retains actual dates/last-good and API fails closed without a real v2 initial snapshot',async()=>{
 const path=resolve('src/lib/publication-feed-server.ts');assert.ok(existsSync(path),'production server seam missing');
 const m=await import(path);const initial=fixture();let fail=false,calls=0;
 const newer=fixture();newer.source.capturedAt='2026-11-07T08:00:00Z';
 const server=m.createPublicationSourceServer(initial,async()=>{calls++;if(fail)throw Error('source invalid');return {revision:'b'.repeat(40),snapshot:newer};},options);
 const [a,b]=await Promise.all([server(),server()]);assert.equal(a,b);assert.equal(calls,1);
 assert.equal(a.snapshot.source.capturedAt,'2026-11-07T08:00:00Z');fail=true;
 assert.equal(await server(),a);
 const response=await m.publicationSourceResponse(server);assert.equal(response.status,200);
 const envelope=await response.json();assert.deepEqual(envelope.snapshot,newer);
 assert.equal(envelope.snapshotSha256,createHash('sha256').update(JSON.stringify(newer,null,2)+'\n').digest('hex'));
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 const unavailable=await m.publicationSourceResponse(async()=>{throw Error('private internals');});
 assert.equal(unavailable.status,503);assert.doesNotMatch(await unavailable.text(),/private internals/);
 const route=await import(resolve('src/app/api/publications/route.ts'));assert.equal(route.runtime,'nodejs');
 const old=m.createPublicationSourceServer({...fixture(),schemaVersion:1},async()=>{throw Error('must not call feed for invalid initial');},options);
 assert.equal((await m.publicationSourceResponse(old)).status,503,'legacy shape must not masquerade as v2');
 assert.match(readFileSync(resolve('src/app/api/publications/route.ts'),'utf8'),/publicationSourceResponse/);
 const code=readFileSync(path,'utf8');assert.match(code,/fetchLatestPublication/);assert.match(code,/retainingPublicationReader/);
});


test('client provider deduplicates per navigation, validates hash/size/freshness and never imports publisher code',async()=>{
 const path=resolve('src/components/publication-source-provider.tsx');assert.ok(existsSync(path),'client provider missing');
 const m=await import(path),initial=fixture(),next=fixture();next.source.capturedAt='2026-11-07T08:00:00Z';
 const envelope=snapshot=>({revision:'b'.repeat(40),snapshot,
  snapshotSha256:createHash('sha256').update(JSON.stringify(snapshot,null,2)+'\n').digest('hex')});
 let calls=0,body=envelope(next),status=200;
 const fetcher=async(url,opts)=>{calls++;assert.ok(url.endsWith('/api/publications'));assert.equal(opts.redirect,'error');return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});};
 const document={},a=m.loadNavigationPublication(document,'/metrics',initial,fetcher,options),b=m.loadNavigationPublication(document,'/metrics',initial,fetcher,options);
 assert.equal(a,b);assert.deepEqual(await a,next);assert.equal(calls,1);
 body={...envelope(next),snapshotSha256:'0'.repeat(64)};
 assert.deepEqual(await m.loadNavigationPublication(document,'/research',initial,fetcher,options),next);
 assert.equal(calls,2);
 const future=fixture();future.source.capturedAt='2099-01-01T00:00:00Z';body=envelope(future);
 assert.deepEqual(await m.loadNavigationPublication(document,'/metrics',initial,fetcher,options),next);
 status=503;assert.deepEqual(await m.loadNavigationPublication(document,'/unavailable',initial,fetcher,options),next);
 const oversized=async()=>new Response('x'.repeat(2_100_001),{headers:{'Content-Type':'application/json'}});
 assert.deepEqual(await m.loadNavigationPublication({},'/large',initial,oversized,options),initial);
 assert.equal(typeof m.usePublicationSource,'function');
 const code=readFileSync(path,'utf8');assert.doesNotMatch(code,/weekly-publications-feed|node:fs|child_process|publication-feed-server/);
 assert.match(code,/usePathname/);
});
