import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderLaunchGate } from '../src/lib/launch-gate.ts';
import { proxy } from '../src/proxy.ts';
import { NextRequest } from 'next/server.js';
import { ATLAS_LAUNCH_AT } from '../src/lib/launch-access.ts';

const expected = [
  ['icon', 'https://www.plneuro.xyz/favicon.svg', 'image/svg+xml', null],
  ['icon', 'https://www.plneuro.xyz/favicon-96x96.png', 'image/png', '96x96'],
  ['icon', 'https://www.plneuro.xyz/favicon.ico', null, 'any'],
  ['apple-touch-icon', 'https://www.plneuro.xyz/apple-touch-icon.png', null, '180x180'],
];

test('launch gate uses the exact public PL Neuro icons on bare, mounted, and error pages', () => {
  for (const basePath of ['', '/neuro-atlas']) for (const error of [undefined, 'Please try again.']) {
    const document = new JSDOM(renderLaunchGate({ now: ATLAS_LAUNCH_AT - 60_000, nonce: 'test-nonce', returnTo: basePath || '/', basePath, error })).window.document;
    const links = [...document.querySelectorAll('link')].map(e => ['rel', 'href', 'type', 'sizes'].map(a => e.getAttribute(a)));
    assert.deepEqual(links, expected);
  }
});

test('gate CSP permits only the public PL Neuro icon URLs as additional image sources', async (t) => {
  t.mock.method(Date, 'now', () => ATLAS_LAUNCH_AT - 60_000);
  const response = await proxy(new NextRequest('https://atlas.example/neuro-atlas', { headers: { accept: 'text/html' }, nextConfig: { basePath: '/neuro-atlas' } }));
  assert.equal(response.status, 401);
  const directives = Object.fromEntries(response.headers.get('content-security-policy').split('; ').map(d => { const [key, ...values] = d.split(' '); return [key, values]; }));
  assert.deepEqual(directives['img-src'], ['data:', ...expected.map(e => e[1])]);
  assert.deepEqual(directives['default-src'], ["'none'"]);
  assert.deepEqual(directives['connect-src'], ["'none'"]);
});
