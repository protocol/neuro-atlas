import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreMerged151Copy } from './sitewide-copy-baseline.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const historicalPaths = new Set([
  'data/funding-index/rounds.csv',
  'data/funding-index/milestones.csv',
  'data/market-memo-q1-2026/milestones.csv',
  'src/data/funding-index.json',
]);

// Only archived assertions opt in. Exact reviewed copy reverses first; all
// unlisted fields/bytes survive to the unchanged historical field/hash goldens.
// Current generator-parity tests continue to read application data directly.
export function readCopyDataFileSync(file, options) {
  const resolved = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const relative = path.relative(root, resolved).split(path.sep).join('/');
  const raw = readFileSync(file);
  const bytes = historicalPaths.has(relative)
    ? Buffer.from(restoreMerged151Copy(raw.toString('utf8'), relative)) : raw;
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : bytes;
}
export const readCopyDataFile = async (file, options) => readCopyDataFileSync(file, options);
