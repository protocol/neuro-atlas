import test from 'node:test';
import assert from 'node:assert/strict';

const launch = Date.parse('2026-11-19T14:00:00Z');

test('real GET uses server state, ignores request overrides, and forbids caching', async () => {
  const { GET, dynamic } = await import('../src/app/api/analytics-context/route.ts');
  const saved = { env: process.env.VERCEL_ENV, id: process.env.NEXT_PUBLIC_ATLAS_GA_ID };
  const originalNow = Date.now;
  try {
    process.env.VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_ATLAS_GA_ID = 'G-ATLAS12345';
    Date.now = () => launch - 1;
    const request = new Request('https://www.plneuro.xyz/neuro-atlas/api/analytics-context?eligible=true&now=9999999999999');
    const before = await GET(request);
    assert.deepEqual(await before.json(), { eligible: false, consentRequired: true });
    assert.match(before.headers.get('cache-control'), /no-store/);
    assert.equal(dynamic, 'force-dynamic');
    Date.now = () => launch;
    assert.deepEqual(await (await GET(request)).json(), { eligible: true, measurementId: 'G-ATLAS12345', consentRequired: true });
    const open = new Request(request.url, { headers: { 'x-atlas-consent-region': 'open' } });
    assert.equal((await (await GET(open)).json()).consentRequired, false);
    process.env.VERCEL_ENV = 'preview';
    assert.equal((await (await GET(open)).json()).eligible, false);
  } finally {
    Date.now = originalNow;
    for (const [key, value] of [['VERCEL_ENV', saved.env], ['NEXT_PUBLIC_ATLAS_GA_ID', saved.id]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('server eligibility is launch-, production-, and dedicated-ID-gated', async () => {
  const { analyticsContext } = await import('../src/lib/atlas-analytics-server.ts');
  const valid = 'G-ATLAS12345';
  assert.deepEqual(analyticsContext(launch, 'production', valid), { eligible: true, measurementId: valid });
  for (const [now, env, id] of [
    [launch - 1, 'production', valid], [launch, 'preview', valid],
    [launch, undefined, valid], [launch, 'production', undefined],
    [launch, 'production', 'G-XPSNFVNHGB'], [launch, 'production', 'G-bad?password=secret'],
    [NaN, 'production', valid],
  ]) assert.deepEqual(analyticsContext(now, env, id), { eligible: false });
});
