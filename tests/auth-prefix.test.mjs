import assert from 'node:assert/strict';
import test from 'node:test';
import testing from 'next/experimental/testing/server.js';
const { unstable_doesMiddlewareMatch } = testing;
import { NextRequest } from 'next/server.js';
import { config, proxy } from '../src/proxy.ts';

const beforeLaunch = Date.parse('2026-11-18T14:00:00Z');
for (const basePath of ['', '/neuro-atlas']) {
  test(`Basic 401 covers root and all content/resource routes with basePath=${basePath || '(root)'}`, async (t) => {
    t.mock.method(Date, 'now', () => beforeLaunch);
    for (const suffix of ['', '/', '/milestones', '/funding', '/field-velocity', '/methodology', '/sitemap.xml', '/logos/example.svg', '/api/google-trends/latest', '/api/google-trends/c5a18cfb03746c0e048e425fac82259488d089a4/neurotech.csv']) {
      const url = (basePath + suffix) || '/';
      assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath }, url }), true, url);
      for (const authorization of [undefined, 'Basic invalid', 'Bearer not-a-password']) {
        const headers = authorization ? { authorization } : {};
        const response = await proxy(new NextRequest(`https://example.test${url}`, { headers, nextConfig: { basePath } }));
        assert.equal(response.status, 401, url);
        assert.match(response.headers.get('www-authenticate'), /^Basic realm="Neuro Atlas"/);
      }
    }
  });
  test(`launch gate includes every static asset with basePath=${basePath || '(root)'}`, async (t) => {
    t.mock.method(Date, 'now', () => beforeLaunch);
    for (const suffix of ['/_next/static/probe.js', '/_next/image', '/favicon.ico']) {
      assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: { basePath }, url: basePath + suffix }), true, suffix);
      const response = await proxy(new NextRequest(`https://example.test${basePath}${suffix}`, { nextConfig: { basePath } }));
      assert.equal(response.status, 401, suffix);
    }
  });
}
