import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const revision = 'c5a18cfb03746c0e048e425fac82259488d089a4';

test('real immutable download route returns exact verified bundled JSON/CSV and rejects arbitrary paths/revisions', async () => {
  const { GET } = await import('../src/app/api/google-trends/[revision]/[file]/route.ts');
  for (const file of ['google-trends.json', 'neurotech.csv', 'neuralink.csv']) {
    const response = await GET(new Request(`https://atlas.example/api/google-trends/${revision}/${file}`), { params: Promise.resolve({ revision, file }) });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), readFileSync(`public/data/google-trends/${file}`, 'utf8'));
    assert.match(response.headers.get('Content-Disposition'), /attachment/);
  }
  for (const params of [{ revision: 'main', file: 'neurotech.csv' }, { revision, file: 'package.json' }, { revision, file: '../neurotech.csv' }]) {
    const response = await GET(new Request('https://atlas.example/api/google-trends/invalid/invalid'), { params: Promise.resolve(params) });
    assert.equal(response.status, 404);
  }
});


test('latest response exposes only the validated snapshot and its immutable revision', async () => {
  const { trendsLatestResponse, verifiedBundledTrends } = await import('../src/lib/field-velocity/google-trends-server.ts');
  const response = await trendsLatestResponse(async () => verifiedBundledTrends);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { revision: verifiedBundledTrends.revision, snapshot: verifiedBundledTrends.snapshot });
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});
