import { z } from 'zod';
import { validateTrendsBundle } from './google-trends-feed';

export const TRENDS_REPOSITORY = 'protocol/neuro-atlas';
export const TRENDS_BRANCH = 'data/google-trends-feed';
export const TRENDS_FEED_PATH = 'feed/google-trends/feed.json';
export const TRENDS_REVISION = /^[a-f0-9]{40}$/;
export type TrendsFetch = (url: string, options: RequestInit) => Promise<Response>;
export type RevisionTrends = ReturnType<typeof validateTrendsBundle> & { revision: string };

async function readJson(url: string, fetcher: TrendsFetch) {
  const response = await fetcher(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' } });
  if (response.status !== 200 || response.redirected || !/^(application\/(json|vnd.github\+json)|text\/plain)(;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid Trends source HTTP response');
  if (!response.body) throw new Error('Empty Trends body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_100_000) { await reader.cancel(); throw new Error('Trends source too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function fetchTrendsRevision(revision: string, fetcher: TrendsFetch = fetch): Promise<RevisionTrends> {
  if (!TRENDS_REVISION.test(revision)) throw new Error('Invalid Trends revision');
  const bundle = await readJson(`https://raw.githubusercontent.com/${TRENDS_REPOSITORY}/${revision}/${TRENDS_FEED_PATH}`, fetcher);
  return { ...validateTrendsBundle(bundle), revision };
}

export async function fetchLatestTrends(fetcher: TrendsFetch = fetch): Promise<RevisionTrends> {
  const ref = z.object({ object: z.object({ sha: z.string().regex(TRENDS_REVISION) }) }).parse(await readJson(`https://api.github.com/repos/${TRENDS_REPOSITORY}/git/ref/heads/${TRENDS_BRANCH}`, fetcher));
  return fetchTrendsRevision(ref.object.sha, fetcher);
}

/** Wrap a validated, cached loader; never cache an error-shaped replacement. */
export function retainingTrendsReader(load: () => Promise<RevisionTrends>, fallback: RevisionTrends) {
  let lastGood = fallback;
  return async () => {
    try {
      const next = await load();
      if (next.snapshot.end >= lastGood.snapshot.end) lastGood = next;
    } catch { /* Keep the previous complete source. */ }
    return lastGood;
  };
}
