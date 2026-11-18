import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
import { beforeNeuroWideMilestones } from './helpers/neuro-wide-milestones-baseline.mjs';

const canonicalText = readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8');
const collections = {
  canonicalMilestones: parseCsv(canonicalText),
  milestones: JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url))),
};
const sources = [
  'https://untappedventures.substack.com/p/untapped-ventures-invests-in-eon',
  'https://www.calcalistech.com/ctechnews/article/rjentgbege',
  'https://paradromics.com/news/neom-investment-fund-partners-with-paradromics-to-drive-innovation-in-neurotechnology-healthcare/',
];
const digest = text => createHash('sha256').update(text).digest('hex');

test('the historical baseline helper removes only the three complete exact-value additions', () => {
  for (const [kind, rows] of Object.entries(collections)) {
    const key = kind === 'canonicalMilestones' ? 'source_url' : 'sourceUrl';
    const original = structuredClone(rows);
    const expected = rows.filter(row => !sources.includes(row[key]));
    assert.equal(rows.length, 94);
    assert.equal(expected.length, 91);
    assert.deepEqual(beforeNeuroWideMilestones(rows, kind), expected);
    assert.deepEqual(rows, original, 'The helper must not mutate its input');
    for (const source of sources) {
      const index = rows.findIndex(row => row[key] === source);
      for (const field of Object.keys(rows[index])) {
        const changed = structuredClone(rows);
        changed[index][field] = 'unreviewed change';
        assert.throws(() => beforeNeuroWideMilestones(changed, kind), assert.AssertionError, `${kind}: ${source}: ${field}`);
      }
      const extra = structuredClone(rows);
      extra[index].unreviewed = true;
      assert.throws(() => beforeNeuroWideMilestones(extra, kind), assert.AssertionError, 'No unreviewed fields may be hidden');
      assert.throws(() => beforeNeuroWideMilestones(rows.filter((_, i) => i !== index), kind), assert.AssertionError, 'No missing addition');
      assert.throws(() => beforeNeuroWideMilestones([...rows, rows[index]], kind), assert.AssertionError, 'No duplicate addition');
    }
    const unreviewed = { ...rows.at(-1), [key]: 'https://example.org/unreviewed' };
    assert.deepEqual(beforeNeuroWideMilestones([...rows, unreviewed], kind), [...expected, unreviewed],
      'Unlisted records must survive to the original historical digest');
  }
  const untouched = [{ sourceUrl: sources[0], amountUsdM: 999 }];
  assert.deepEqual(beforeNeuroWideMilestones(untouched, 'fundingRounds'), untouched, 'The exclusion never applies to Funding Index records');
});

test('all pre-addition canonical bytes and generated milestone objects retain their base hashes', () => {
  const originalText = canonicalText.split('\n').filter(line => !sources.some(source => line.includes(source))).join('\n');
  assert.equal(digest(originalText), '86959830ed1cade57d8496e136c74199dfb9dfa2c4bfc672e3bcf3dcc18310c4');
  assert.equal(digest(JSON.stringify(beforeNeuroWideMilestones(collections.milestones, 'milestones'), null, 2)),
    '88ee2f8e3eaba66ba555b7f93deea53144b4a6857df5250bc6485606a87a5641');
});
