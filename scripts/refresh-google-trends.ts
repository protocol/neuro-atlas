import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { parseGoogleTrends } from '../src/lib/field-velocity/google-trends';

const { values } = parseArgs({ options: { source: { type: 'string', default: 'docs/google-trends/source' }, out: { type: 'string', default: 'public/data/google-trends' }, check: { type: 'boolean', default: false } } });
const groups = [
  { id: 'neurotech', title: 'Neurotech search terms', terms: ['neurotechnology', 'brain-computer interface'] },
  { id: 'neuralink', title: 'Neuralink · brand context', terms: ['Neuralink'] },
];
const requestSchema = z.object({
  capturedAt: z.string(),
  exploreRequest: z.object({ comparisonItem: z.array(z.object({ keyword: z.string(), geo: z.literal(''), time: z.string() })), category: z.literal(0), property: z.literal('') }),
  widgetRequest: z.object({
    time: z.string(), resolution: z.literal('WEEK'), locale: z.literal('en-US'),
    comparisonItem: z.array(z.object({ geo: z.object({}).strict(), complexKeywordsRestriction: z.object({ keyword: z.array(z.object({ type: z.literal('BROAD'), value: z.string() })).length(1) }) })),
    requestOptions: z.object({ property: z.literal(''), category: z.literal(0) }),
  }),
});
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
// Validate both complete captures before any destination is touched. No network or fallback data here.
const data = groups.map(group => {
  const raw = readFileSync(`${values.source}/${group.id}.raw.json`, 'utf8');
  const request = readFileSync(`${values.source}/${group.id}.request.json`, 'utf8');
  const meta = requestSchema.parse(JSON.parse(request));
  const period = meta.widgetRequest.time;
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
if (values.check) {
  for (const [name, content] of outputs) if (readFileSync(`${values.out}/${name}`, 'utf8') !== content) throw new Error(`Stale Google Trends output: ${name}`);
} else {
  mkdirSync(values.out!, { recursive: true });
  for (const [name, content] of outputs) {
    const path = `${values.out}/${name}`;
    writeFileSync(path + '.tmp', content); renameSync(path + '.tmp', path);
  }
}
console.log(`${values.check ? 'Verified' : 'Generated'} Google Trends: ${snapshot.start}–${snapshot.end}; ${data.map(g => `${g.id}: ${g.rows.filter(r => !r.partial).length} complete / ${g.rows.filter(r => r.partial).length} partial weeks`).join('; ')}`);
