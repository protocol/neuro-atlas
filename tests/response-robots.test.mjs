import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

for (const [label, settings, noindex] of [
  ['standalone', {}, false],
  ['gated prefixed preview', { NEXT_PUBLIC_BASE_PATH: '/neuro-atlas', ATLAS_SITE_URL: 'https://www.plrd.org', ATLAS_INDEXABLE: 'false' }, true],
  ['explicit indexable build', { NEXT_PUBLIC_BASE_PATH: '/neuro-atlas', ATLAS_SITE_URL: 'https://www.plrd.org', ATLAS_INDEXABLE: 'true' }, false],
]) {
  test(`response robots policy covers assets and auth challenges: ${label}`, () => {
    const env = { ...process.env, NEXT_PUBLIC_BASE_PATH: '', ATLAS_SITE_URL: '', ATLAS_INDEXABLE: '', ...settings };
    const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import configModule from './next.config.ts';
      const config = configModule.default ?? configModule;
      import { proxy } from './src/proxy.ts';
      import { NextRequest } from 'next/server.js';
      const res = proxy(new NextRequest('https://example.test/'));
      console.log(JSON.stringify({ routes: await config.headers?.() ?? [], status: res.status, robots: res.headers.get('x-robots-tag') }));
    `], { env, encoding: 'utf8' });
    const result = JSON.parse(output);
    assert.equal(result.status, 401);
    assert.equal(result.robots, noindex ? 'noindex, nofollow' : null);
    assert.deepEqual(result.routes, noindex ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }] : []);
  });
}
