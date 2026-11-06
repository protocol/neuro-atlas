import { z } from 'zod';
import { validateCitationBundle, type CitationBundle } from './citation-latency-feed';
import { ARCHIVED_CITATION_GENERATED } from './citation-latency-default';

export const CITATION_REPOSITORY = 'protocol/neuro-atlas';
export const CITATION_BRANCH = 'data/openalex-citation-latency-feed';
export const CITATION_FEED_PATH = 'feed/openalex-citation-latency/feed.json';
export const CITATION_REVISION = /^[a-f0-9]{40}$/;
export type CitationFetch = (url: string, options: RequestInit) => Promise<Response>;
export type RevisionCitation = { revision: string; bundle: CitationBundle | null };
export const citationReleaseDate = (release: RevisionCitation) => release.bundle?.provenance.generatedAt ?? ARCHIVED_CITATION_GENERATED;

async function readJson(url: string, fetcher: CitationFetch) {
  const response = await fetcher(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' } });
  if (response.status !== 200 || response.redirected || !/^(application\/(json|vnd.github\+json)|text\/plain)(;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid Citation source HTTP response');
  if (!response.body) throw new Error('Empty Citation body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_100_000) { await reader.cancel(); throw new Error('Citation source too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function fetchCitationRevision(revision: string, fetcher: CitationFetch = fetch): Promise<RevisionCitation> {
  if (!CITATION_REVISION.test(revision)) throw new Error('Invalid Citation revision');
  const bundle = await readJson(`https://raw.githubusercontent.com/${CITATION_REPOSITORY}/${revision}/${CITATION_FEED_PATH}`, fetcher);
  const data = await validateCitationBundle(bundle);
  return { bundle: data.bundle, revision };
}

export async function fetchLatestCitation(fetcher: CitationFetch = fetch, loadRevision?: (revision:string)=>Promise<RevisionCitation>): Promise<RevisionCitation> {
  const ref = z.object({ object: z.object({ sha: z.string().regex(CITATION_REVISION) }) }).parse(await readJson(`https://api.github.com/repos/${CITATION_REPOSITORY}/git/ref/heads/${CITATION_BRANCH}`, fetcher));
  return loadRevision ? loadRevision(ref.object.sha) : fetchCitationRevision(ref.object.sha, fetcher);
}

/** Wrap a validated, cached loader; never cache an error-shaped replacement. */
export function retainingCitationReader(load: () => Promise<RevisionCitation>, fallback: RevisionCitation) {
  let lastGood = fallback;
  return async () => {
    try {
      const next = await load();
      if (Date.parse(citationReleaseDate(next)) >= Date.parse(citationReleaseDate(lastGood))) lastGood = next;
    } catch { /* Keep the previous complete source. */ }
    return lastGood;
  };
}
