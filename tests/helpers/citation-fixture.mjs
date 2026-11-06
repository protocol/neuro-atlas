import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CITATION_SETTINGS} from '../../src/lib/field-velocity/citation-latency-feed.ts';
export const csv = readFileSync(new URL('../fixtures/citation-latency/neurotech-20261028.csv', import.meta.url), 'utf8');
const sha = s => createHash('sha256').update(s).digest('hex');
// Real historical CSV; synthetic receipt provenance for contract tests only.
export function fixture(text = csv) { return { version: 1, csv: text, provenance: {
  version: 1, method: 'openalex-neurotech-reference-age-v1', sourceRevision: '0d91734795f7a62394d2047a8f95384bbeae41f4',
  generatorBlob: '87a4e15fa4f957ca980a056d949b72cfc353b615', directionBlob: 'a63c91f2a196f8a542e9341f30eefcaeefe2ccec',
  settings: CITATION_SETTINGS, startedAt: '2026-10-28T10:00:00+00:00', generatedAt: '2026-10-28T10:49:13+00:00', finishedAt: '2026-10-28T10:50:00+00:00',
  manifestSha256: 'a'.repeat(64), csvSha256: sha(text), receiptCount: 951, complete: true,
} }; }
