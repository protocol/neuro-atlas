import BUNDLED from '../data/publications/publication-charts.snapshot.json';
import {assertPublicationScienceCoverage} from './publication-data';
import {fetchLatestPublication,retainingPublicationReader,validatePublicationSnapshot,publicationHash,
 type PublicationData,type ValidationOptions} from '../../scripts/weekly-publications-feed';

export type PublicationSource={revision:string;snapshot:PublicationData};
/** Fresh candidates may replace last-good; stale fallback dates are never relabeled. */
export function assertPublicationFreshness(snapshot:PublicationData,now=new Date()) {
 const age=now.getTime()-Date.parse(snapshot.source.capturedAt);
 if(!Number.isFinite(age)||age < -300000||age > 14*86400000)throw new Error('Publication source freshness refused');
}
/** Lazy initialization keeps the page synchronous and coalesces concurrent API calls. */
export function createPublicationSourceServer(initial:unknown,load:()=>Promise<PublicationSource>=fetchLatestPublication,options:ValidationOptions={}) {
 let reader:Promise<()=>Promise<PublicationSource>>|undefined;
 let pending:Promise<PublicationSource>|undefined;
 return async()=>{
  reader??=(async()=>{
   const snapshot=await validatePublicationSnapshot(initial,options);
   return retainingPublicationReader(async()=>{
    const next=await load();
    if(!/^[a-f0-9]{40}$/.test(next.revision))throw new Error('Invalid publication revision');
    const snapshot=await validatePublicationSnapshot(next.snapshot,options);
    assertPublicationFreshness(snapshot,options.now?.()??new Date());
    assertPublicationScienceCoverage(snapshot,initial);
    return {revision:next.revision,snapshot};
   },{revision:'bundled',snapshot});
  })();
  const retained=await reader;
  if(!pending)pending=retained().finally(()=>{pending=undefined;});
  return pending;
 };
}
export const getPublicationSource=createPublicationSourceServer(BUNDLED);
export async function publicationSourceResponse(load:()=>Promise<PublicationSource>=getPublicationSource) {
 try {
  const release=await load();
  return Response.json({...release,snapshotSha256:publicationHash(JSON.stringify(release.snapshot,null,2)+'\n')},
   {headers:{'Cache-Control':'private, no-store','X-Publication-Revision':release.revision,'X-Content-Type-Options':'nosniff'}});
 }catch{
  return Response.json({error:'Publication source temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
