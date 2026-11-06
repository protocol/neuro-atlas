import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const view = () => ({ revision: 'c5a18cfb03746c0e048e425fac82259488d089a4', snapshot: JSON.parse(readFileSync('public/data/google-trends/google-trends.json', 'utf8')) });

test('browser view accepts exact complete source and rejects changed identity, missingness and partial flags', async () => {
  const { parseTrendsView } = await import('../src/lib/field-velocity/google-trends-view.ts');
  assert.deepEqual(parseTrendsView(view()), view());
  for (const mutate of [
    v => { v.revision = 'main'; },
    v => { v.snapshot.groups.pop(); },
    v => { v.snapshot.groups[1].terms[0] = 'BCI'; },
    v => { v.snapshot.groups[1].end = '2026-10-30'; },
    v => { v.snapshot.groups[1].rows.at(-1).partial = false; },
    v => { v.snapshot.groups[0].rows[5].values[0] = null; },
    v => { v.snapshot.groups[1].rows[5].partial = true; },
    v => { v.snapshot.groups[1].rows[5].displayValues[0] = '999'; },
  ]) { const input = view(); mutate(input); assert.throws(() => parseTrendsView(input)); }
});
