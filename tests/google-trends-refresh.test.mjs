import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('refresh reproduces checked-in public JSON/CSV from real captures and rejects wrong search scope before writing', () => {
  assert.ok(existsSync('scripts/refresh-google-trends.ts'), 'Google Trends refresh mechanism is missing');
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync('.qa/trends-refresh-');
  try {
    cpSync('docs/google-trends/source', `${dir}/source`, { recursive: true });
    const run = () => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/refresh-google-trends.ts', '--source', `${dir}/source`, '--out', `${dir}/output`], { encoding: 'utf8' });
    let result = run(); assert.equal(result.status, 0, result.stderr);
    const snapshot = JSON.parse(readFileSync(`${dir}/output/google-trends.json`, 'utf8'));
    assert.equal(snapshot.start, '2023-10-15'); assert.equal(snapshot.end, '2026-10-15');
    assert.equal(snapshot.groups.length, 2);
    assert.deepEqual(snapshot.groups.map(g => [g.id, g.rows.length]), [['neurotech', 157], ['neuralink', 157]]);
    for (const file of ['google-trends.json', 'neurotech.csv', 'neuralink.csv']) assert.equal(readFileSync(`${dir}/output/${file}`, 'utf8'), readFileSync(`public/data/google-trends/${file}`, 'utf8'));
    assert.match(readFileSync(`${dir}/output/neurotech.csv`, 'utf8'), /2026-10-11,6,3,true/);
    const before = readFileSync(`${dir}/output/google-trends.json`, 'utf8');
    const requestPath = `${dir}/source/neurotech.request.json`;
    const original = JSON.parse(readFileSync(requestPath, 'utf8'));
    for (const mutate of [r => r.exploreRequest.property = 'youtube', r => r.exploreRequest.comparisonItem[0].geo = 'US', r => r.widgetRequest.comparisonItem[0].complexKeywordsRestriction.keyword[0].type = 'ENTITY', r => r.widgetRequest.time = '2025-10-15 2026-10-15']) {
      const changed = structuredClone(original); mutate(changed); writeFileSync(requestPath, JSON.stringify(changed));
      result = run(); assert.notEqual(result.status, 0, 'scope mismatch must fail');
      assert.equal(readFileSync(`${dir}/output/google-trends.json`, 'utf8'), before);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
