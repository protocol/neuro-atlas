import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server.js';
import { proxy } from '../src/proxy.ts';
import { ATLAS_LAUNCH_AT } from '../src/lib/launch-access.ts';

const beforeLaunch = ATLAS_LAUNCH_AT - 60_000;
function request(path, basePath = '', init = {}) {
  return new NextRequest(`https://atlas-origin.example${path}`, { ...init, nextConfig: { basePath } });
}

test('document GET returns only the nonce-protected standalone gate, no native Basic challenge', async (t) => {
  t.mock.method(Date, 'now', () => beforeLaunch);
  for (const basePath of ['', '/neuro-atlas']) {
    for (const suffix of ['', '/funding?stage=seed']) {
      const path = basePath + suffix || '/';
      const response = await proxy(request(path, basePath, { headers: { accept: 'text/html,application/xhtml+xml' } }));
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('www-authenticate'), null);
      assert.match(response.headers.get('content-type'), /^text\/html/);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      // no-referrer makes native form POST Origin:null in Chromium; keep a verifiable same-origin Origin.
      assert.equal(response.headers.get('referrer-policy'), 'same-origin');
      const csp = response.headers.get('content-security-policy');
      assert.match(csp, /default-src 'none'/);
      assert.match(csp, /base-uri 'none'/);
      assert.match(csp, /form-action 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);
      const nonce = csp.match(/script-src 'nonce-([^']+)'/)[1];
      assert.match(csp, new RegExp(`style-src 'nonce-${nonce.replace(/[+]/g, '\\+')}'`));
      const html = await response.text();
      assert.match(html, /^<!doctype html>/i);
      assert.ok(html.includes(`<script nonce="${nonce}">`));
      assert.ok(html.includes(`<style nonce="${nonce}">`));
      assert.ok(html.includes(`action="${basePath}/__launch/auth"`));
      assert.ok(html.includes(`name="returnTo" value="${path.replaceAll('&', '&amp;')}"`));
      assert.doesNotMatch(html, /_next\/static|<script[^>]+src=|<link[^>]+href=/);
    }
  }
});


test('assets, API, RSC, and non-document requests never receive Atlas content or a gate HTML page', async (t) => {
  t.mock.method(Date, 'now', () => beforeLaunch);
  for (const basePath of ['', '/neuro-atlas']) {
    for (const [suffix, headers, method] of [
      ['/_next/static/data.js', { accept: 'text/html' }, 'GET'],
      ['/_next/image?url=x', { accept: 'text/html' }, 'GET'],
      ['/favicon.ico', { accept: 'text/html' }, 'GET'],
      ['/logos/logo.svg', { accept: 'text/html' }, 'GET'],
      ['/api/google-trends/latest', { accept: 'text/html' }, 'GET'],
      ['/funding?_rsc=1', { accept: 'text/html', rsc: '1' }, 'GET'],
      ['/funding', { accept: 'text/html', 'next-router-prefetch': '1' }, 'GET'],
      ['/funding', { accept: 'text/html', 'next-router-state-tree': 'x' }, 'GET'],
      ['/funding', { accept: 'text/html', 'next-action': 'x' }, 'POST'],
      ['/funding', { accept: 'text/html', 'sec-fetch-dest': 'script' }, 'GET'],
    ]) {
      const response = await proxy(request(`${basePath}${suffix}`, basePath, { headers, method }));
      assert.equal(response.status, 401, suffix);
      assert.match(response.headers.get('content-type'), /^text\/plain/);
      assert.match(response.headers.get('www-authenticate'), /^Basic realm=/);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(await response.text(), 'Authentication required.');
    }
  }
});


test('server clock opens every route exactly at launch; client query/cookie flags never open it early', async (t) => {
  let now = ATLAS_LAUNCH_AT - 1;
  t.mock.method(Date, 'now', () => now);
  const headers = { accept: 'text/html', cookie: '__Secure-atlas-preview=true; preview=true', 'x-launch-now': String(ATLAS_LAUNCH_AT) };
  assert.equal((await proxy(request('/funding?public=true&now=9999999999999', '', { headers }))).status, 401);
  for (now of [ATLAS_LAUNCH_AT, ATLAS_LAUNCH_AT + 1]) {
    for (const basePath of ['', '/neuro-atlas']) for (const suffix of ['', '/funding', '/_next/static/data.js', '/api/google-trends/latest']) {
      const response = await proxy(request(basePath + suffix || '/', basePath));
      assert.equal(response.status, 200, suffix);
      assert.equal(response.headers.get('x-middleware-next'), '1');
      assert.equal(response.headers.get('www-authenticate'), null);
      assert.equal(response.headers.get('set-cookie'), null);
    }
  }
});


test('native form POST is intercepted, preserves return path, and rejects bad credentials without a browser dialog', async (t) => {
  t.mock.method(Date, 'now', () => beforeLaunch);
  for (const basePath of ['', '/neuro-atlas']) {
    const returnTo = `${basePath}/funding?q=seed#chart`;
    const response = await proxy(request(`${basePath}/__launch/auth`, basePath, {
      method: 'POST', headers: { origin: 'https://atlas-origin.example' },
      body: new URLSearchParams({ password: 'wrong-synthetic-password', returnTo }),
    }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), null);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const html = await response.text();
    assert.match(html, /role="alert"/);
    assert.ok(html.includes(`name="returnTo" value="${returnTo}"`));
    assert.doesNotMatch(html, /wrong-synthetic-password/);
    const malformed = await proxy(request(`${basePath}/__launch/auth`, basePath, {
      method: 'POST', headers: { origin: 'https://atlas-origin.example', 'content-type': 'application/x-www-form-urlencoded' },
      body: 'password=x&password=y&returnTo=%2F',
    }));
    assert.equal(malformed.status, 401);
    assert.equal(malformed.headers.get('set-cookie'), null);
  }
});

test('form POST denies missing or untrusted Origin even when forwarded-host headers claim it', async (t) => {
  t.mock.method(Date, 'now', () => beforeLaunch);
  for (const origin of [undefined, 'null', 'https://evil.example']) {
    const response = await proxy(request('/__launch/auth', '', {
      method: 'POST', headers: { ...(origin ? { origin } : {}), 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' },
      body: new URLSearchParams({ password: 'synthetic-only', returnTo: '/' }),
    }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
});
