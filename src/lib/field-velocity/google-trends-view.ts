import { z } from 'zod';
import { parseGoogleTrends } from './google-trends';

export const trendsGroups = [
  { id: 'neurotech', title: 'Neurotech search terms', terms: ['neurotechnology', 'brain-computer interface'] },
  { id: 'neuralink', title: 'Neuralink · brand context', terms: ['Neuralink'] },
];
const rowSchema = z.object({ date: z.string(), values: z.array(z.number().int().min(0).max(100).nullable()), displayValues: z.array(z.string()), partial: z.boolean() }).strict();
const groupSchema = z.object({
  id: z.string(), title: z.string(), terms: z.array(z.string()), start: z.string(), end: z.string(), capturedAt: z.iso.datetime({ offset: true }),
  rows: z.array(rowSchema).min(1).max(160), sourceUrl: z.string(), rawSha256: z.string().regex(/^[a-f0-9]{64}$/), requestSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const viewSchema = z.object({ revision: z.string().regex(/^[a-f0-9]{40}$/), snapshot: z.object({
  version: z.literal(1), geography: z.literal('Worldwide'), property: z.literal('Web Search'), category: z.literal('All categories'), resolution: z.literal('Weekly (UTC)'),
  start: z.string(), end: z.string(), groups: z.array(groupSchema).length(2),
}).strict() }).strict();
export type TrendsView = z.infer<typeof viewSchema>;

/** A second, browser-safe boundary for our own API response. No values are repaired. */
export function parseTrendsView(input: unknown): TrendsView {
  const view = viewSchema.parse(input);
  view.snapshot.groups.forEach((group, index) => {
    const identity = trendsGroups[index];
    const sourceUrl = `https://trends.google.com/trends/explore?${new URLSearchParams({ date: `${group.start} ${group.end}`, q: identity.terms.join(','), hl: 'en-US' })}`;
    if (group.id !== identity.id || group.title !== identity.title || JSON.stringify(group.terms) !== JSON.stringify(identity.terms) || group.start !== view.snapshot.start || group.end !== view.snapshot.end || group.sourceUrl !== sourceUrl || Date.parse(group.capturedAt) > Date.now()) throw new Error('Invalid Trends view identity');
    for (const row of group.rows) {
      if (row.values.length !== group.terms.length || row.displayValues.length !== group.terms.length || row.values.some((v, i) => (v === null) !== (row.displayValues[i] === 'Unavailable'))) throw new Error('Invalid Trends view missingness');
    }
    const parsed = parseGoogleTrends(JSON.stringify({ default: { timelineData: group.rows.map((row, i) => ({
      time: String(Date.parse(row.date) / 1000), value: row.values.map(v => v ?? 0),
      formattedValue: row.values.map((v, j) => v === null ? '0' : row.displayValues[j]), hasData: row.values.map(v => v !== null),
      isPartial: i === group.rows.length - 1 && row.partial,
    })) } }), group);
    if (JSON.stringify(parsed.rows) !== JSON.stringify(group.rows) || !group.rows.some(row => !row.partial)) throw new Error('Invalid Trends view dates or partial flags');
  });
  return view;
}
