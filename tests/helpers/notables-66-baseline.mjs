import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/notables-66.json', import.meta.url)));

// Narrowly reconstruct earlier goldens; every newly reviewed field is frozen
// separately. Unlisted rows survive, so this never hides unrelated changes.
export function beforeNotables66(rows, collection) {
  const original = structuredClone(rows);
  if (!['canonicalMilestones', 'milestones'].includes(collection)) return original;
  const canonical = collection === 'canonicalMilestones';
  const key = canonical ? 'source_url' : 'sourceUrl';
  const expected = canonical ? fixture.expectedMilestones : fixture.expectedGeneratedMilestones;
  for (const row of expected) {
    const matches = original.filter(candidate => candidate[key] === row[key]);
    assert.equal(matches.length, 1, `${collection}: exact one Notables 66 source ${row[key]}`);
    assert.deepEqual(matches[0], row, `${collection}: complete reviewed Notables 66 row`);
  }
  return original.filter(row => !expected.some(added => added[key] === row[key]));
}
