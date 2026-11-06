import { createHash } from 'node:crypto';
import { z } from 'zod';
import { parseGoogleTrends } from './google-trends';

import { trendsGroups } from './google-trends-view';
// This allowlist validates the exact retained request bytes; unknown metadata must
// fail closed rather than being stripped from the parsed copy by Zod.
const requestSchema = z.object({
  capturedAt: z.string(),
  exploreRequest: z.object({ comparisonItem: z.array(z.object({ keyword: z.string(), geo: z.literal(''), time: z.string() }).strict()), category: z.literal(0), property: z.literal('') }).strict(),
  widgetRequest: z.object({
    time: z.string(), resolution: z.literal('WEEK'), locale: z.literal('en-US'),
    comparisonItem: z.array(z.object({ geo: z.object({}).strict(), complexKeywordsRestriction: z.object({ keyword: z.array(z.object({ type: z.literal('BROAD'), value: z.string() }).strict()).length(1) }).strict() }).strict()),
    requestOptions: z.object({ property: z.literal(''), category: z.literal(0), backend: z.literal('IZG').optional() }).strict(),
    userConfig: z.object({ userType: z.literal('USER_TYPE_SCRAPER') }).strict().optional(),
  }).strict(),
}).strict();
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

const sourceSchema = z.object({ raw: z.string().min(1).max(500_000), request: z.string().min(1).max(30_000) }).strict();
const bundleSchema = z.object({ version: z.literal(1), sources: z.object({ neurotech: sourceSchema, neuralink: sourceSchema }).strict() }).strict();
export type TrendsBundle = z.infer<typeof bundleSchema>;

export function validateTrendsBundle(input: unknown) {
  const bundle = bundleSchema.parse(input);
  // Validate both complete captures before any destination is touched. No network or fallback data here.
  const data = trendsGroups.map(group => {
    const raw = bundle.sources[group.id as keyof typeof bundle.sources].raw;
    const request = bundle.sources[group.id as keyof typeof bundle.sources].request;
    const metadata = JSON.parse(request, (key, value) => {
      if (/token|cookie|header|authorization|password|secret/i.test(key)) throw new Error('Disallowed Google Trends metadata field');
      return value;
    });
    const meta = requestSchema.parse(metadata);
    if (!z.iso.datetime({ offset: true }).safeParse(meta.capturedAt).success || Date.parse(meta.capturedAt) > Date.now()) throw new Error('Invalid Google Trends capture date');
    const period = meta.widgetRequest.time;
    if (!/^\d{4}-\d{2}-\d{2} \d{4}-\d{2}-\d{2}$/.test(period)) throw new Error('Invalid Google Trends period');
    const [start, end] = period.split(' ');
    if (meta.exploreRequest.comparisonItem.length !== group.terms.length || meta.widgetRequest.comparisonItem.length !== group.terms.length || meta.exploreRequest.comparisonItem.some((r, i) => r.keyword !== group.terms[i] || r.time !== period) || meta.widgetRequest.comparisonItem.some((r, i) => r.complexKeywordsRestriction.keyword[0].value !== group.terms[i])) throw new Error('Google Trends request scope mismatch');
    const parsed = parseGoogleTrends(raw, { terms: group.terms, start, end, capturedAt: meta.capturedAt });
    const params = new URLSearchParams({ date: period, q: group.terms.join(','), hl: 'en-US' });
    return { ...group, ...parsed, sourceUrl: `https://trends.google.com/trends/explore?${params}`, rawSha256: sha(raw), requestSha256: sha(request) };
  });
  if (data.some(g => g.start !== data[0].start || g.end !== data[0].end)) throw new Error('Google Trends capture periods differ');
  const snapshot = { version: 1, geography: 'Worldwide', property: 'Web Search', category: 'All categories', resolution: 'Weekly (UTC)', start: data[0].start, end: data[0].end, groups: data };
  const outputs = new Map<string, string>([['google-trends.json', JSON.stringify(snapshot, null, 2) + '\n']]);
  for (const group of data) outputs.set(`${group.id}.csv`, [
    `# Google Trends; Worldwide; Web Search; All categories; ${group.start} to ${group.end}; captured ${group.capturedAt}`,
    `# ${group.id === 'neurotech' ? 'Joint normalization for the two search terms' : 'Independent normalization for brand context'}; index 0-100, not search counts. Unavailable is a gap. Partial rows excluded from charts/latest.`,
    ['week_start_utc', ...group.terms, 'partial'].join(','),
    ...group.rows.map(row => [row.date, ...row.displayValues, row.partial].join(',')),
  ].join('\n') + '\n');
  return { bundle, snapshot, files: Object.fromEntries(outputs) };
}
export type ValidatedTrends = ReturnType<typeof validateTrendsBundle>;
export type TrendsSnapshot = ValidatedTrends['snapshot'];

/** Chart semantics, separate from exact-source hashes. Timestamp/format-only
 * checks are quiet; window, values, literal bounds, gaps and partial rows count. */
export function trendsFingerprints({ snapshot }: ValidatedTrends): Record<string, string> {
  return Object.fromEntries(snapshot.groups.map(group => [group.id, sha(JSON.stringify({
    method: 'google-trends-broad-weekly-v1', version: snapshot.version,
    geography: snapshot.geography, property: snapshot.property,
    category: snapshot.category, resolution: snapshot.resolution,
    id: group.id, terms: group.terms, start: group.start, end: group.end,
    normalization: group.id === 'neurotech' ? 'joint-request' : 'independent-request',
    rows: group.rows,
  }))]));
}
