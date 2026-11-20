import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasSources, buildCatalog } from '../src/lib/ai/catalog.ts';
import { recordMarkdown } from '../src/lib/ai/markdown.ts';

test('private source text cannot survive in record envelopes or Markdown', () => {
  const input = structuredClone(atlasSources);
  input.snapshot.measurementSeries[0].coverage = '[Private](https://www.plrd.org/impact-preview-REVIEW_SENTINEL/)';
  const result = buildCatalog(input);
  assert.doesNotMatch(JSON.stringify(result), /REVIEW_SENTINEL/);
  assert.doesNotMatch(result.records.map(recordMarkdown).join('\n'), /REVIEW_SENTINEL/);
});

test('timeline bounds use only the visible event cohort', () => {
  const input = structuredClone(atlasSources);
  const original = buildCatalog().sections.find(s => s.id === 'milestones').dates;
  input.milestones.push({ ...input.milestones[0], date: '2099-12-31', hidden: true });
  const result = buildCatalog(input);
  assert.deepEqual(result.sections.find(s => s.id === 'milestones').dates, original);
  assert.doesNotMatch(JSON.stringify(result), /2099-12-31/);
});

test('a hidden constituent withholds its dependent reading, not only the point', () => {
  const input = structuredClone(atlasSources);
  const reading = input.snapshot.records.find(r => r.instrument === 'idea_vintage');
  reading.series.find(p => p.x === 2023).hidden = true;
  const result = buildCatalog(input);
  assert.ok(!result.records.some(r => r.id === 'reading-idea-vintage'));
  assert.ok(buildCatalog().records.some(r => r.id === 'reading-idea-vintage'));
});
