import { readFileSync } from 'node:fs';
import { unstable_cache } from 'next/cache';
import ARCHIVE_PROVENANCE from '../../data/field-velocity/neurotech.snapshot.json.provenance.json';
import { archivedCitation, archivedCitationRecord, ARCHIVED_CITATION_REVISION } from './citation-latency-default';
import { bundledCitation, BUNDLED_CITATION_REVISION, verifiedBundledCitation } from './citation-latency-bundled';
import { citationHash, parseCitationCsv } from './citation-latency-feed';
import { fetchLatestCitation, fetchCitationRevision, retainingCitationReader, CITATION_REVISION, type RevisionCitation } from './citation-latency-reader';

// Literal path is traced into the server output. The original shared archive is untouched.
const archiveCsv = readFileSync(process.cwd() + '/docs/citation-latency/archive-20260804.csv','utf8');
export async function verifiedArchivedCitation() {
  if (await citationHash(archiveCsv) !== '5d63643adb25233f5ed9b4ddcb1f7b930fefadd87788e57d8eeb4301b2badcc6') throw new Error('Archived citation CSV hash mismatch');
  const parsed = parseCitationCsv(archiveCsv);
  const series = parsed.rows.filter(r=>r.median!==null).map(r=>({x:r.year,y:r.median,lo:r.lo??undefined,hi:r.hi??undefined,reliable:r.reliable}));
  if (JSON.stringify(series) !== JSON.stringify(archivedCitationRecord.series) || parsed.generatedAt !== archivedCitationRecord.provenance?.generated) throw new Error('Archived citation source/snapshot mismatch');
  return archivedCitation;
}
const cachedRevision = unstable_cache(fetchCitationRevision,['citation-latency-immutable-v1'],{revalidate:false});
const cachedLatest = unstable_cache(()=>fetchLatestCitation(fetch,cachedRevision),['citation-latency-latest-v1'],{revalidate:3600});
const retained = retainingCitationReader(cachedLatest,bundledCitation);
const accepted = new Map<string,RevisionCitation>();
export async function getLatestCitation() {
  await verifiedBundledCitation();
  const release = await retained();
  accepted.set(release.revision,release);
  if(accepted.size>32)accepted.delete(accepted.keys().next().value!);
  return release;
}
export async function getCitationRevision(revision:string):Promise<RevisionCitation> {
  if(!CITATION_REVISION.test(revision))throw new Error('Invalid citation revision');
  if(revision===BUNDLED_CITATION_REVISION)return verifiedBundledCitation();
  if(revision===ARCHIVED_CITATION_REVISION)return verifiedArchivedCitation();
  return accepted.get(revision)??cachedRevision(revision);
}
export async function citationLatestResponse(load:()=>Promise<RevisionCitation> = getLatestCitation) {
  const release = await load();
  return Response.json(release,{headers:{'Cache-Control':'private, no-store','X-Citation-Revision':release.revision}});
}
export async function citationFileResponse(revision:string,file:string,load:(revision:string)=>Promise<RevisionCitation> = getCitationRevision) {
  if(!CITATION_REVISION.test(revision)||!['citation-latency.csv','citation-latency.json'].includes(file))return new Response('Not found',{status:404});
  try {
    const release = await load(revision);
    if(release.revision!==revision)throw new Error('Revision mismatch');
    let bytes:string;
    if(release.bundle)bytes=file.endsWith('.csv')?release.bundle.csv:JSON.stringify(release.bundle,null,2)+'\n';
    else {
      if(revision!==ARCHIVED_CITATION_REVISION)throw new Error('Unknown archive');
      await verifiedArchivedCitation();
      bytes=file.endsWith('.csv')?archiveCsv:JSON.stringify({revision,record:archivedCitationRecord,archiveProvenance:ARCHIVE_PROVENANCE,csvSha256:'5d63643adb25233f5ed9b4ddcb1f7b930fefadd87788e57d8eeb4301b2badcc6'},null,2)+'\n';
    }
    return new Response(bytes,{headers:{'Content-Type':file.endsWith('.csv')?'text/csv; charset=utf-8':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${file}"`,'Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','X-Citation-Revision':revision}});
  }catch{return new Response('This exact source revision is temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}
}
