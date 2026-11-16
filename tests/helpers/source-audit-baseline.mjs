import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export const SOURCE_AUDIT_DELTA = JSON.parse(readFileSync(new URL('../fixtures/source-audit-delta-20261116.json', import.meta.url)));

// Historical issue goldens stay pinned. Assert each reviewed later field first,
// then restore ONLY that field in a clone. Every unlisted field survives to the
// original digest and therefore still rejects unrelated changes.
export function beforeSourceAudit(rows, collection) {
  const allowance = SOURCE_AUDIT_DELTA.collections[collection];
  assert.ok(allowance, collection);
  assert.ok(rows.length >= allowance.length, `${collection}: historical rows were removed`);
  const restored = structuredClone(rows);
  for (const change of allowance.changes) {
    const row = restored[change.index];
    assert.equal(row.slug ?? row.companySlug ?? row.company ?? row.company_slug, change.identity, `${collection}: row identity`);
    for (const [field, expected] of Object.entries(change.after)) assert.deepEqual(row[field], expected, `${collection}[${change.index}].${field}: reviewed correction`);
    for (const field of change.removed) assert.equal(Object.hasOwn(row, field), false);
    for (const field of change.added) delete row[field];
    for (const [field, previous] of Object.entries(change.before)) row[field] = structuredClone(previous);
  }
  return restored;
}
