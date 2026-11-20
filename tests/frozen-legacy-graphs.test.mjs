import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fieldVelocityLink, fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { legacyGraphDestination } from '../src/lib/field-velocity/graph-navigation.ts';

// Frozen independently from main b6f99ef before the graph implementation.
// Do not generate these expectations from the candidate registry itself.
const baseline = JSON.parse(readFileSync(new URL('./fixtures/legacy-graph-fragments.json', import.meta.url), 'utf8'));

test('every published old fragment keeps its exact identity and explicit fallback', () => {
  assert.equal(baseline.length, 150);
  for (const old of baseline) {
    const link = fieldVelocityLink(old.anchor);
    assert.ok(link, `lost published identity #${old.anchor}`);
    assert.equal(link.slug, old.slug, old.anchor);
    assert.equal(link.target, old.target, old.anchor);
    assert.equal(link.kind, old.kind, old.anchor);
    assert.equal(link.fallback ?? null, old.fallback, old.anchor);
  }
});

test('frozen legacy graph fragments translate to their exact same chart at root and public mount', () => {
  for (const base of ['', '/neuro-atlas']) {
    for (const old of baseline) {
      const url = `https://preview.invalid${base}/field-velocity?review=1&review=2#${old.anchor}`;
      const actual = legacyGraphDestination(url, base);
      if (old.kind === 'chart' && !old.fallback) {
        assert.equal(actual, `${base}/field-velocity/${old.slug}?review=1&review=2`, old.anchor);
        assert.equal(fieldVelocityGraph(old.anchor)?.slug, old.slug);
      } else {
        assert.equal(actual, null, `must retain overview/tab/retired destination: ${old.anchor}`);
      }
    }
  }
});
