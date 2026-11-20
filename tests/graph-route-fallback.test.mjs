import test from 'node:test';
import assert from 'node:assert/strict';
import * as route from '../src/app/field-velocity/[slug]/page.tsx';

test('unknown graph paths reach explicit notFound instead of Next NoFallback rerouting into legacy redirects', async () => {
  // Next16 with basePath can re-enter custom routing on a fallback:false miss.
  // Keep the curated SSG list, but let unknown paths reach the lookup/404 guard.
  assert.equal(route.dynamicParams, true);
  const render = typeof route.default === 'function' ? route.default : route.default.default;
  for (const slug of ['not-a-real-graph', 'neuralink-brand-context', 'idea_vintage']) {
    await assert.rejects(render({params:Promise.resolve({slug})}), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404', slug);
  }
});
