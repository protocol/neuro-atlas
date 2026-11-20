import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const delta = JSON.parse(readFileSync(new URL('../fixtures/link-repair-delta-20261120.json', import.meta.url)));

// Preserve earlier issue goldens: first prove the exact reviewed later values,
// then restore ONLY those fields in a clone. Unlisted fields still hit the old
// hashes. Original source/date review records remain immutable evidence.
export function beforeLinkRepairs(rows, collection) {
  const restored = structuredClone(rows);
  for (const change of delta.collections[collection]?.changes ?? []) {
    const row = restored[change.index];
    assert.equal(row.slug ?? row.companySlug ?? row.company ?? row.company_slug, change.identity, `${collection}: link-repair identity`);
    for (const [field, expected] of Object.entries(change.after)) assert.deepEqual(row[field], expected, `${collection}[${change.index}].${field}: reviewed link repair`);
    for (const field of change.removed) assert.equal(Object.hasOwn(row, field), false);
    for (const field of change.added) delete row[field];
    for (const [field, previous] of Object.entries(change.before)) row[field] = structuredClone(previous);
  }
  return restored;
}
