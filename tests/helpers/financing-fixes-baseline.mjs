import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFinancingFixesReader, validateFinancingFixesFixture } from './financing-fixes-reader.mjs';

// A missing final reviewed fixture is a hard error, never a no-op fallback.
export const FINANCING_FIXES_DELTA = validateFinancingFixesFixture(JSON.parse(readFileSync(new URL('../fixtures/financing-fixes-20261125.json', import.meta.url), 'utf8')));
const reader = createFinancingFixesReader(FINANCING_FIXES_DELTA, fileURLToPath(new URL('../../', import.meta.url)));
export const beforeFinancingFixesFile = reader.beforeFile;
export const readFinancingFixesBaselineFileSync = reader.readFileSync;
export const readFinancingFixesBaselineFile = reader.readFile;
