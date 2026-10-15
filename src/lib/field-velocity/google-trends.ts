import { z } from 'zod';

export type TrendsOptions = { terms: string[]; start: string; end: string; capturedAt: string };
export type TrendsRow = { date: string; values: (number | null)[]; displayValues: string[]; partial: boolean };
export type TrendsData = TrendsOptions & { rows: TrendsRow[] };

const responseSchema = z.object({ default: z.object({ timelineData: z.array(z.object({
  time: z.string().regex(/^\d+$/),
  value: z.array(z.number().int().min(0).max(100)),
  formattedValue: z.array(z.string()),
  hasData: z.array(z.boolean()),
  isPartial: z.boolean().optional(),
})).min(1) }) });

/** Google's downloaded widget response has an XSSI prefix; values are already normalized. */
export function parseGoogleTrends(raw: string, options: TrendsOptions): TrendsData {
  const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  const start = Date.parse(options.start), end = Date.parse(options.end), captured = Date.parse(options.capturedAt);
  if (!validDate(options.start) || !validDate(options.end) || options.start.slice(5) !== options.end.slice(5) || Number(options.end.slice(0, 4)) - Number(options.start.slice(0, 4)) !== 3 || !Number.isFinite(captured) || captured < end || !options.terms.length || new Set(options.terms).size !== options.terms.length) {
    throw new Error('Invalid Google Trends 36-month window or metadata');
  }
  const parsed = responseSchema.safeParse(JSON.parse(raw.replace(/^\)\]\}',?\r?\n/, '')));
  if (!parsed.success) throw new Error('Invalid Google Trends response');
  const source = parsed.data.default.timelineData;
  const week = 7 * 86400000;
  return { ...options, rows: source.map((row, index) => {
    const time = Number(row.time) * 1000;
    if (!Number.isSafeInteger(time) || time % 86400000 !== 0 || new Date(time).getUTCDay() !== 0 || time > end || time + week <= start || (index === 0 && time > start) || (index > 0 && time - Number(source[index - 1].time) * 1000 !== week) || (index === source.length - 1 && time + week <= end) || (row.isPartial && index !== source.length - 1)) {
      throw new Error('Invalid Google Trends weekly dates or coverage');
    }
    if ([row.value, row.formattedValue, row.hasData].some(a => a.length !== options.terms.length) || row.value.some((v, i) => row.formattedValue[i] !== String(v) && !(v === 0 && row.formattedValue[i] === '<1'))) {
      throw new Error('Invalid Google Trends values');
    }
    return {
      date: new Date(time).toISOString().slice(0, 10),
      values: row.value.map((value, i) => row.hasData[i] ? value : null),
      displayValues: row.formattedValue.map((value, i) => row.hasData[i] ? value : 'Unavailable'),
      partial: row.isPartial === true || time < start || time + week > Math.min(end + 86400000, captured),
    };
  }) };
}
