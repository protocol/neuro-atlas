import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
const cases = JSON.parse(readFileSync(new URL('./fixtures/source-audit-records-20261116.json', import.meta.url)));
for (const item of cases) {
  test(item.id + ': ' + item.title, () => {
    for (const change of item.changes) {
      const rows = parseCsv(readFileSync(new URL('../' + change.path, import.meta.url), 'utf8'));
      const row = rows[change.rowNumber - 2];
      assert.ok(row, change.recordId);
      assert.equal(row.company ?? row.company_slug, change.company, 'exact record identity');
      for (const [field, expected] of Object.entries(change.after)) assert.equal(row[field], expected, `${change.recordId}.${field}`);
    }
    assert.ok(item.evidence.length > 0, 'reviewed source evidence is retained with the correction');
  });
}
