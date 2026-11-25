import assert from 'node:assert/strict';
import { beforeMergeChinaFunding, beforeMergeChinaCatalog } from './financing-merge-baseline.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const delta = JSON.parse(readFileSync(new URL('../fixtures/paradromics-funding-20261124.json', import.meta.url)));
const reportedDelta = JSON.parse(readFileSync(new URL('../fixtures/paradromics-reported-total-20261124.json', import.meta.url)));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Historical goldens remain frozen. Prove the COMPLETE exact later Paradromics
// records first (including notes, dates, evidence, hold and extra-field absence),
// then restore only that reviewed delta in a clone. Unrelated values still reach
// the original hashes; this helper cannot bless another company's changes.
export function beforeParadromicsRows(rows, collection) {
  if (!['fundingRounds', 'canonicalRounds'].includes(collection)) return structuredClone(rows);
  const key = collection === 'canonicalRounds' ? 'company_slug' : 'companySlug';
  assert.deepEqual(rows.filter(row => row[key] === 'paradromics'), delta.after[collection], 'exact reviewed Paradromics delta');
  let next = 0;
  const result = [];
  for (const row of rows) {
    if (row[key] === 'paradromics') {
      if (next < delta.before[collection].length) result.push(structuredClone(delta.before[collection][next++]));
    } else {
      const clone = structuredClone(row);
      if (collection === 'canonicalRounds') {
        assert.equal(clone.capital_treatment, '', 'no unrelated capital treatment allowed');
        delete clone.capital_treatment;
      }
      result.push(clone);
    }
  }
  return result;
}

export function beforeParadromicsFunding(input) {
  const funding = beforeMergeChinaFunding(input);
  const restored = structuredClone(funding);
  assert.deepEqual(restored.reportedTotals, reportedDelta.reportedTotals, 'exact reviewed public company-total metadata');
  delete restored.reportedTotals;
  restored.rounds = beforeParadromicsRows(funding.rounds, 'fundingRounds');
  assert.deepEqual(funding.summary, delta.after.summary);
  assert.deepEqual(funding.methodology, delta.after.methodology);
  restored.summary = structuredClone(delta.before.summary);
  restored.methodology = structuredClone(delta.before.methodology);
  for (const change of delta.investorChanges) {
    assert.deepEqual(restored.investors[change.index], change.after, 'exact offering-associated capital delta');
    restored.investors[change.index] = structuredClone(change.before);
  }
  assert.equal(hash(restored.investors), delta.beforeInvestorsSha256, 'all other investor counts, capital, names and order stay frozen');
  return restored;
}

export function beforeParadromicsCatalog(input) {
  const catalog = beforeMergeChinaCatalog(input);
  const restored = structuredClone(catalog);
  for (const [category, items] of Object.entries(reportedDelta.catalogAdditions)) {
    for (const pair of items) {
      assert.deepEqual(restored[category].filter(([url]) => url === pair[0]), [pair], 'exact public interview classification');
    }
    const urls = new Set(items.map(([url]) => url));
    restored[category] = restored[category].filter(([url]) => !urls.has(url));
  }
  for (const [category, items] of Object.entries(delta.catalogAdditions)) {
    for (const pair of items) {
      assert.deepEqual(restored[category].filter(([url]) => url === pair[0]), [pair], 'exact source classification');
    }
    const urls = new Set(items.map(([url]) => url));
    restored[category] = restored[category].filter(([url]) => !urls.has(url));
  }
  assert.equal(hash(restored), delta.beforeCatalogSha256, 'preserve every unrelated source classification');
  return restored;
}
