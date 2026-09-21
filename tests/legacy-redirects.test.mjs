import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

function responses(paths, settings = {}) {
  const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import 'next/dist/server/node-environment.js';
    import imported from './next.config.ts';
    import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server.js';
    const nextConfig = imported.default ?? imported;
    const results = [];
    for (const path of ${JSON.stringify(paths)}) {
      const response = await unstable_getResponseFromNextConfig({
        url: 'https://legacy.example.test' + path, nextConfig,
      });
      results.push({status: response.status, location: response.headers.get('location')});
    }
    console.log(JSON.stringify(results));
  `], { encoding: 'utf8', env: {
    ...process.env, NEXT_PUBLIC_BASE_PATH: '/neuro-atlas',
    ATLAS_SITE_URL: 'https://www.plrd.org', ATLAS_INDEXABLE: 'false', ...settings,
  } });
  return JSON.parse(output);
}

// This evaluates Next's compiled custom-route matching, not a hand-written matcher.
test('old Atlas entry points temporarily redirect to the matching PLRD page', () => {
  const routes = ['/', '/milestones', '/funding', '/field-velocity', '/methodology', '/ecosystem', '/regulatory-landscape'];
  const actual = responses(routes);
  for (const [index, path] of routes.entries()) {
    const destination = path === '/' ? '' : path === '/regulatory-landscape' ? '/milestones' : path;
    assert.deepEqual(actual[index], {
      status: 307, location: 'https://www.plrd.org/neuro-atlas' + destination,
    }, path);
  }
});


test('legacy deep links retain nested paths and encoded query values', () => {
  // Repeated query keys are checked by verify-legacy-redirects.mjs against HTTP:
  // Next's experimental config helper flattens arrays via URLSearchParams(object).
  const paths = [
    '/funding?year=2025&tag=one&q=brain%20computer&next=https%3A%2F%2Fevil.example',
    '/milestones/event/example?path=must-not-replace-path&view=timeline',
    '/field-velocity?metric=bci#chart',
    '/regulatory-landscape?year=2025',
  ];
  const actual = responses(paths);
  for (const [index, path] of paths.entries()) {
    assert.equal(actual[index].status, 307, path);
    const incoming = new URL(path, 'https://legacy.example.test');
    const outgoing = new URL(actual[index].location);
    assert.equal(outgoing.origin, 'https://www.plrd.org');
    assert.equal(outgoing.pathname, '/neuro-atlas' + (incoming.pathname === '/regulatory-landscape' ? '/milestones' : incoming.pathname));
    assert.deepEqual([...outgoing.searchParams], [...incoming.searchParams]);
  }
});

test('proxy paths, assets and unknown routes do not match a legacy redirect', () => {
  const paths = ['/neuro-atlas', '/neuro-atlas/milestones', '/neuro-atlas/funding',
    '/neuro-atlas/field-velocity', '/neuro-atlas/methodology', '/neuro-atlas/ecosystem',
    '/neuro-atlas/_next/static/test.js', '/neuro-atlas/logos/neuralink.png',
    '/_next/static/test.js', '/favicon.ico', '/funding-extra', '/unknown', '/api/example'];
  for (const result of responses(paths)) assert.equal(result.location, null);
  const [regulatory] = responses(['/neuro-atlas/regulatory-landscape?year=2025']);
  assert.deepEqual(regulatory, {status: 307, location: 'https://legacy.example.test/neuro-atlas/milestones?year=2025'});
});

for (const settings of [
  {NEXT_PUBLIC_BASE_PATH: '', ATLAS_SITE_URL: ''},
  {NEXT_PUBLIC_BASE_PATH: '', ATLAS_SITE_URL: 'https://www.plrd.org'},
  {NEXT_PUBLIC_BASE_PATH: '/neuro-atlas', ATLAS_SITE_URL: ''},
  {NEXT_PUBLIC_BASE_PATH: '/other'},
]) {
  test('standalone or unrelated deployments do not enable legacy cutover: ' + JSON.stringify(settings), () => {
    for (const result of responses(['/', '/milestones', '/funding'], settings)) assert.equal(result.location, null);
  });
}

test('a trailing slash on the configured origin never doubles the destination slash', () => {
  const [actual] = responses(['/milestones'], {ATLAS_SITE_URL: 'https://www.plrd.org/'});
  assert.deepEqual(actual, {status: 307, location: 'https://www.plrd.org/neuro-atlas/milestones'});
});
