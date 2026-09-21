import assert from 'node:assert/strict';
import test from 'node:test';
import testing from 'next/experimental/testing/server.js';
const { unstable_doesMiddlewareMatch } = testing;
import { NextRequest } from 'next/server.js';
import { config, proxy } from '../src/proxy.ts';

for (const basePath of ['', '/neuro-atlas']) {
  test(`Basic gate covers root and content routes with basePath=${basePath || '(root)'}`, () => {
    for (const suffix of ['', '/', '/milestones', '/funding', '/field-velocity', '/methodology', '/sitemap.xml', '/logos/example.svg']) {
      const url = (basePath + suffix) || '/';
      assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath }, url }), true, url);
      for (const authorization of [undefined, 'Basic invalid', 'Bearer not-a-password']) {
        const headers = authorization ? { authorization } : {};
        const response = proxy(new NextRequest(`https://example.test${url}`, { headers }));
        assert.equal(response.status, 401, url);
        assert.match(response.headers.get('www-authenticate'), /^Basic realm="Neuro Atlas"/);
      }
    }
  });
  test(`Basic gate retains existing static asset exclusions with basePath=${basePath || '(root)'}`, () => {
    for (const suffix of ['/_next/static/probe.js', '/_next/image', '/favicon.ico']) {
      assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath }, url: basePath + suffix }), false, suffix);
    }
  });
}
