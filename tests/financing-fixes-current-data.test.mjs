import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFundingIndex, loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';
import { countedCapital } from '../src/lib/funding-capital.mjs';
import { validateCurrentContract } from './helpers/financing-copy-contract.mjs';

// No historical reader imports: raw 53-path M lock and independently pinned A
// economics/source conservation are separate from reconstruction allowances.
const lock = JSON.parse(readFileSync(new URL('./fixtures/financing-copy-current-revision-20261125.json', import.meta.url), 'utf8'));
test('all captured real financing and copy files match the frozen integrated checkpoint and independent parents', () => {
  validateCurrentContract(lock, file => readFileSync(new URL('../' + file, import.meta.url)));
});

test('the unprojected current funding payload retains canonical builder and real capital-accounting parity', async () => {
  const sources = await loadFundingIndexSources(new URL('../data/funding-index/', import.meta.url).pathname);
  const built = buildFundingIndex(sources);
  const current = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url), 'utf8'));
  assert.deepEqual(current.companies.map(company => Object.fromEntries(Object.entries(company).filter(([key]) => key !== 'logo'))), built.companies);
  for (const key of ['rounds', 'milestones', 'investors', 'portfolioDisclosures', 'reportedTotals']) {
    assert.deepEqual(current[key], built[key], key);
  }
  assert.equal(current.summary.selectedCompanies, built.companies.length);
  assert.equal(current.summary.indexedRounds, built.rounds.length);
  assert.equal(current.summary.regulatoryMilestones, built.milestones.length);
  assert.equal(current.summary.observedCapitalUsdM, Number(built.rounds.reduce((sum, round) => sum + countedCapital(round), 0).toFixed(2)));
});
