import { readFileSync } from 'node:fs';
import { unstable_cache } from 'next/cache';
import { validateTrendsBundle } from './google-trends-feed';
import { BUNDLED_TRENDS_REVISION, bundledTrends } from './google-trends-default';
import { fetchLatestTrends, fetchTrendsRevision, retainingTrendsReader, type RevisionTrends, TRENDS_REVISION } from './google-trends-reader';

// Literal paths keep original captures in Next's output-file tracing. Validate, do not trust casts.
const archived = validateTrendsBundle({ version: 1, sources: {
  neurotech: {
    raw: readFileSync(process.cwd() + '/docs/google-trends/source/neurotech.raw.json', 'utf8'),
    request: readFileSync(process.cwd() + '/docs/google-trends/source/neurotech.request.json', 'utf8'),
  },
  neuralink: {
    raw: readFileSync(process.cwd() + '/docs/google-trends/source/neuralink.raw.json', 'utf8'),
    request: readFileSync(process.cwd() + '/docs/google-trends/source/neuralink.request.json', 'utf8'),
  },
} });
const bundled = validateTrendsBundle({ version: 1, sources: {
  neurotech: {
    raw: readFileSync(process.cwd() + '/docs/google-trends/bundled-20261106/source/neurotech.raw.json', 'utf8'),
    request: readFileSync(process.cwd() + '/docs/google-trends/bundled-20261106/source/neurotech.request.json', 'utf8'),
  },
  neuralink: {
    raw: readFileSync(process.cwd() + '/docs/google-trends/bundled-20261106/source/neuralink.raw.json', 'utf8'),
    request: readFileSync(process.cwd() + '/docs/google-trends/bundled-20261106/source/neuralink.request.json', 'utf8'),
  },
} });
if (JSON.stringify(bundled.snapshot) !== JSON.stringify(bundledTrends.snapshot)) throw new Error('Bundled Trends provenance mismatch');
export const verifiedBundledTrends = { ...bundled, revision: BUNDLED_TRENDS_REVISION };
const cachedRevision = unstable_cache(fetchTrendsRevision, ['google-trends-immutable-v1'], { revalidate: false });
export async function getTrendsRevision(revision: string) {
  if (!TRENDS_REVISION.test(revision)) throw new Error('Invalid Trends revision');
  if (revision === 'c5a18cfb03746c0e048e425fac82259488d089a4') return { ...archived, revision };
  return revision === BUNDLED_TRENDS_REVISION ? verifiedBundledTrends : cachedRevision(revision);
}

// Only successful, validated full bundles enter Next's durable Data Cache. Failed
// revalidation leaves the preceding cached value; process/cold-start fallback is verified too.
const cachedLatest = unstable_cache(() => fetchLatestTrends(), ['google-trends-latest-v1'], { revalidate: 3600 });
export const getLatestTrends = retainingTrendsReader(cachedLatest, verifiedBundledTrends);
export async function trendsLatestResponse(load: () => Promise<RevisionTrends> = getLatestTrends) {
  const { revision, snapshot } = await load();
  return Response.json({ revision, snapshot }, { headers: { 'Cache-Control': 'private, no-store', 'X-Trends-Revision': revision } });
}
