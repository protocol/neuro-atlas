import { z } from 'zod';
import type { InstrumentRecord } from './schema';
import { ideaVintageDirection, windowMeans } from '../../../scripts/vendor/vintage-direction.mjs';

export const CITATION_QUERY = 'brain-computer interface|connectome|neural implant|whole brain emulation';
export const CITATION_METHOD = 'openalex-neurotech-reference-age-v1';
export const CITATION_SOURCE_REVISION = '0d91734795f7a62394d2047a8f95384bbeae41f4';
export const CITATION_GENERATOR_BLOB = '87a4e15fa4f957ca980a056d949b72cfc353b615';
export const CITATION_DIRECTION_BLOB = 'a63c91f2a196f8a542e9341f30eefcaeefe2ccec';
export const CITATION_SETTINGS = {
  query: CITATION_QUERY, fromYear: 2000, through: 'acquisition-year', worksPerYear: 80,
  maxRefsPerWork: 50, sampleSeed: 42, batchSize: 50, clusterIterations: 500,
  clusterSeed: 42, referenceFromYear: 1900, referenceThrough: 'publication-year',
  reliableRule: 'year < acquisition-year - 2',
} as const;
export const CITATION_HEADER = 'year,field_works,all_works,corpus_share_per_100k,first_time_authors,idea_vintage_median_years,vintage_ci_lo,vintage_ci_hi,n_refs_sampled,n_works_sampled,reliable';
const SAMPLE = 'works_per_year=80; max_refs_per_work=50; cluster=title_and_abstract.search; ci=cluster_bootstrap(resample=works,iters=500,seed=42); note=first_time_authors intentionally blank (needs per-author history)';
const iso = z.iso.datetime({ offset: true }).refine(s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|\+00:00)$/.test(s) && new Date(s).toISOString().slice(0, 10) === s.slice(0, 10), 'Real UTC timestamp required');
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const settings = z.object(Object.fromEntries(Object.entries(CITATION_SETTINGS).map(([k,v]) => [k, z.literal(v)]))).strict();
export const citationProvenanceSchema = z.object({
  version: z.literal(1), method: z.literal(CITATION_METHOD), sourceRevision: z.literal(CITATION_SOURCE_REVISION),
  generatorBlob: z.literal(CITATION_GENERATOR_BLOB), directionBlob: z.literal(CITATION_DIRECTION_BLOB), settings,
  startedAt: iso, finishedAt: iso, generatedAt: iso, manifestSha256: hash, csvSha256: hash,
  receiptCount: z.number().int().positive().max(100000), complete: z.literal(true),
}).strict();
export const citationBundleSchema = z.object({ version: z.literal(1), csv: z.string().min(1).max(100000), provenance: citationProvenanceSchema }).strict();
export type CitationBundle = z.infer<typeof citationBundleSchema>;
export type CitationRow = { year: number; fieldWorks: number; allWorks: number; corpusShare: number; median: number | null; lo: number | null; hi: number | null; refs: number; works: number; reliable: boolean };
export async function citationHash(text: string) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
function reject(message: string): never { throw new Error(`Invalid citation feed: ${message}`); }
function number(text: string, integer = false): number {
  if (!(integer ? /^(0|[1-9]\d*)$/ : /^(0|[1-9]\d*)(?:\.\d+)?$/).test(text)) reject('numeric cell');
  const value = Number(text);
  if (!Number.isFinite(value) || (integer && !Number.isSafeInteger(value))) reject('finite cell');
  return value;
}

/** Strict unattended boundary. Missing references and zero ages are different. */
export function parseCitationCsv(csv: string, now = new Date()) {
  if (csv.length > 100000 || csv.includes('\r')) reject('CSV encoding/size');
  const lines = csv.split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length < 8) reject('empty CSV');
  const generatedAt = iso.parse(lines[0].replace(/^# generated: /, ''));
  if (Date.parse(generatedAt) > now.getTime()) reject('future generation');
  const year = new Date(generatedAt).getUTCFullYear();
  if (year < 2009 || year > now.getUTCFullYear()) reject('year');
  const expected = [`# generated: ${generatedAt}`, '# source: OpenAlex (https://openalex.org, CC0)', `# query: ${CITATION_QUERY}`, '# from_year: 2000', `# reliable_cutoff_year: ${year - 2}`, `# sample: ${SAMPLE}`, CITATION_HEADER];
  if (lines.slice(0, 7).join('\n') !== expected.join('\n') || lines.length !== 7 + year - 1999) reject('provenance/header/full-year coverage');
  const rows: CitationRow[] = lines.slice(7).map((line, i) => {
    const c = line.split(',');
    if (c.length !== 11 || c[4] !== '' || !['0', '1'].includes(c[10])) reject('column shape/first authors/reliability');
    const row: CitationRow = { year: number(c[0], true), fieldWorks: number(c[1], true), allWorks: number(c[2], true), corpusShare: number(c[3]), median: c[5] === '' ? null : number(c[5]), lo: c[6] === '' ? null : number(c[6]), hi: c[7] === '' ? null : number(c[7]), refs: number(c[8], true), works: number(c[9], true), reliable: c[10] === '1' };
    if (row.year !== 2000 + i || row.reliable !== (row.year < year - 2)) reject('year order/reliability');
    if (row.fieldWorks > row.allWorks || row.works > Math.min(80, row.fieldWorks) || row.refs > row.works * 50 || row.refs < row.works || ((row.refs === 0) !== (row.works === 0))) reject('sample/count plausibility');
    const share = row.allWorks ? row.fieldWorks / row.allWorks * 100000 : 0;
    if (Math.abs(share - row.corpusShare) > .000501) reject('corpus share');
    if ((row.refs === 0) !== (row.median === null) || ((row.works < 8) !== (row.lo === null && row.hi === null)) || ((row.lo === null) !== (row.hi === null))) reject('missing references/interval');
    if ([row.median,row.lo,row.hi].some(v=>v!==null&&!Number.isInteger(v*2))) reject('integer reference-year median/bootstrap precision');
    if ([row.median, row.lo, row.hi].some(v => v !== null && v > row.year - 1900) || (row.lo !== null && (row.lo > row.median! || row.hi! < row.median!))) reject('reference age/interval order');
    return row;
  });
  if (!rows.some(r => r.reliable && r.median !== null)) reject('no reliable observations');
  return { rows, generatedAt, year };
}

export async function validateCitationBundle(input: unknown, now = new Date()) {
  const bundle = citationBundleSchema.parse(input);
  const parsed = parseCitationCsv(bundle.csv, now);
  const p = bundle.provenance;
  if (p.generatedAt !== parsed.generatedAt || Date.parse(p.startedAt) > Date.parse(p.generatedAt) || Date.parse(p.generatedAt) > Date.parse(p.finishedAt) || Date.parse(p.finishedAt) > now.getTime() || p.startedAt.slice(0, 10) !== p.finishedAt.slice(0, 10) || p.csvSha256 !== await citationHash(bundle.csv)) reject('acquisition interval/hash');
  const years = parsed.rows.length;
  if (p.receiptCount < years * 3 || p.receiptCount > years * 83) reject('source request coverage');
  return { bundle, ...parsed };
}
export type ValidatedCitation = Awaited<ReturnType<typeof validateCitationBundle>>;

/** Exact PLRD toPayload/withOpenAlex idea-vintage mapping; no other record writes. */
export function projectCitationRecord(data: ValidatedCitation, original: InstrumentRecord): InstrumentRecord {
  if (original.instrument !== 'idea_vintage') reject('projection target');
  const points = data.rows.filter(r => r.median !== null);
  const reliable = points.filter(r => r.reliable);
  const latest = reliable.at(-1)!;
  const wm = reliable.length >= 2 ? windowMeans(reliable.map(r => ({ x: r.year, y: r.median! })), 3) : null;
  return {
    instrument: 'idea_vintage', state: 'reading', metric: 'median age of references in new work (years)',
    value: `${latest.median!.toFixed(1)} years (${latest.year})`,
    trend: wm && wm.earlyRange[1] !== wm.lateRange[0] ? `${wm.early.toFixed(1)}y avg (${wm.earlyRange[0]}–${wm.earlyRange[1]}) → ${wm.late.toFixed(1)}y avg (${wm.lateRange[0]}–${wm.lateRange[1]}); lower = fresher ideas` : 'a falling median means the field is building on fresher ideas',
    direction: ideaVintageDirection(reliable.map(r => ({x:r.year,y:r.median!}))),
    window: `${reliable[0].year}–${latest.year}`, measuredAt: `${latest.year}-12-31`, checkedAt: data.generatedAt,
    series: points.map(r => ({ x:r.year, y:r.median!, lo:r.lo ?? undefined, hi:r.hi ?? undefined, reliable:r.reliable })),
    seriesScale: 'linear', provenance: { query:CITATION_QUERY, generated:data.generatedAt },
    sources: [{label:'OpenAlex (CC0)',url:'https://openalex.org'}, {label:'scripts/velocity/field_velocity_openalex.py',url:`https://github.com/protocol/plrd.org/blob/${CITATION_SOURCE_REVISION}/scripts/velocity/field_velocity_openalex.py`}],
    patentVintage: original.patentVintage,
  };
}

/** Only chart semantics: generated/check dates, receipt IDs and API-count context excluded. */
export async function citationFingerprint(data: ValidatedCitation) {
  return citationHash(JSON.stringify({ method:CITATION_METHOD, settings:CITATION_SETTINGS, rows:data.rows.map(r => [r.year,r.median,r.lo,r.hi,r.reliable]) }));
}
