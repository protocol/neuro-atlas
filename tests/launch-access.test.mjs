import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

// Only synthetic secrets belong in tests. Never import or extract the proxy password.
const secret = 'synthetic-preview-secret';
const access = () => import('../src/lib/launch-access.ts');
const opening = Date.parse('2026-11-19T14:00:00Z');

test('signed preview session expires after 24 hours or at opening, whichever comes first', async () => {
  const { ATLAS_LAUNCH_AT, createPreviewToken, verifyPreviewToken } = await access();
  assert.equal(ATLAS_LAUNCH_AT, opening);
  const now = opening - 2 * 24 * 60 * 60 * 1000;
  const token = createPreviewToken(secret, now);
  const expiry = now + 24 * 60 * 60 * 1000;
  const expectedMac = createHmac('sha256', secret).update(String(expiry)).digest('hex');
  assert.equal(token, `${expiry}.${expectedMac}`);
  assert.equal(verifyPreviewToken(token, secret, now), true);
  assert.equal(verifyPreviewToken(token, secret, expiry), false);
  const lastHour = opening - 60 * 60 * 1000;
  assert.equal(createPreviewToken(secret, lastHour).split('.')[0], String(opening));
});

test('preview verification rejects malformed, forged, expired, and overlong sessions without throwing', async () => {
  const { createPreviewToken, verifyPreviewToken } = await access();
  const now = opening - 2 * 24 * 60 * 60 * 1000;
  const valid = createPreviewToken(secret, now);
  const signed = (expiry) => `${expiry}.${createHmac('sha256', secret).update(String(expiry)).digest('hex')}`;
  for (const token of [
    '', 'true', '1', valid + '.extra', valid.toUpperCase(), valid.replace('.', '..'),
    `${now + 1000}.00`, '0'.repeat(10000),
    valid.replace(/.$/, valid.endsWith('0') ? '1' : '0'),
    createPreviewToken('different-synthetic-secret', now),
    signed(now), signed(now - 1), signed(now + 24 * 60 * 60 * 1000 + 1), signed(opening + 1),
  ]) assert.equal(verifyPreviewToken(token, secret, now), false, token.slice(0, 20));
  assert.equal(verifyPreviewToken(valid, secret, opening), false);
});


test('only one exact signed preview cookie grants access; duplicate or unsigned flags never do', async () => {
  const { PREVIEW_COOKIE_NAME, createPreviewToken, hasPreviewCookie } = await access();
  assert.equal(PREVIEW_COOKIE_NAME, '__Secure-atlas-preview');
  const now = opening - 60_000;
  const valid = `${PREVIEW_COOKIE_NAME}=${createPreviewToken(secret, now)}`;
  assert.equal(hasPreviewCookie(`unrelated=x; ${valid}; another=y`, secret, now), true);
  for (const header of [null, '', '__Secure-atlas-preview=true', 'preview=true', valid + '; ' + valid,
    valid + '; __Secure-atlas-preview=bad', valid + '; __Secure-atlas-preview',
    valid + '; __Secure-atlas-preview =bad', valid + '.extra']) {
    assert.equal(hasPreviewCookie(header, secret, now), false);
  }
});


test('Basic access accepts any username but requires a colon, strict base64, and the exact server secret', async () => {
  const { hasBasicAccess, matchesPassword } = await access();
  const basic = (value) => `Basic ${Buffer.from(value).toString('base64')}`;
  for (const user of ['', 'preview', 'someone@example.test']) {
    assert.equal(hasBasicAccess(basic(`${user}:${secret}`), secret), true);
  }
  assert.equal(hasBasicAccess(basic(`user:${secret}:extra`), `${secret}:extra`), true);
  assert.equal(hasBasicAccess(basic(`:${secret}`).replace('Basic', 'basic'), secret), true);
  for (const header of [null, '', basic(secret), 'Basic invalid', 'Basic !!!!', `Bearer ${secret}`,
    basic(`user:wrong`), basic(`user:${secret}`) + '!', basic(`user:${secret}`) + ' trailing']) {
    assert.equal(hasBasicAccess(header, secret), false);
  }
  assert.equal(matchesPassword(secret, secret), true);
  assert.equal(matchesPassword('', secret), false);
  assert.equal(matchesPassword(secret + 'wrong', secret), false);
});


test('return destinations preserve same-mount path, query, and hash while rejecting unsafe encodings', async () => {
  const { safeReturnTo } = await access();
  for (const basePath of ['', '/neuro-atlas']) {
    const fallback = basePath || '/';
    for (const path of [fallback, `${basePath}/funding?stage=seed&sort=year#capital`, `${basePath}/a%20b?q=hello%20world#chart`]) {
      assert.equal(safeReturnTo(path, basePath), path);
    }
    for (const path of [null, '', 'https://evil.test', '//evil.test/x', '\\evil.test', '/\\evil.test',
      `${basePath}/../outside`, `${basePath}/%2e%2e/outside`, `${basePath}/%252e%252e/outside`,
      `${basePath}/%2f%2fevil.test`, `${basePath}/%5cevil.test`, `${basePath}/%255cevil.test`,
      `${basePath}/%3fnext=//evil.test`, `${basePath}/ok?bad=%0d%0aLocation:evil`,
      `${basePath}/bad%`, `${basePath}/bad%ff`, `${basePath}/ok\r\n`, 'x'.repeat(4097)]) {
      assert.equal(safeReturnTo(path, basePath), fallback, JSON.stringify(path));
    }
    if (basePath) for (const path of ['/outside', '/neuro-atlas-evil/x', '/neuro-atlas%2f..%2foutside']) {
      assert.equal(safeReturnTo(path, basePath), fallback, path);
    }
  }
});


test('auth Origin must be the exact request origin or configured canonical origin, never forwarded headers', async () => {
  const { isAllowedAuthOrigin } = await access();
  const canonical = 'https://www.plneuro.xyz';
  const req = (origin, url = 'https://atlas-origin.vercel.app/neuro-atlas/__launch/auth') => new Request(url, {
    method: 'POST', headers: { ...(origin === null ? {} : { origin }),
      'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'https', host: 'evil.test' },
  });
  assert.equal(isAllowedAuthOrigin(req(canonical), canonical), true);
  assert.equal(isAllowedAuthOrigin(req('https://atlas-origin.vercel.app'), canonical), true);
  assert.equal(isAllowedAuthOrigin(req('http://localhost:3000', 'http://localhost:3000/__launch/auth')), true);
  for (const origin of [null, 'null', 'https://evil.test', canonical + '/', canonical + '.evil.test',
    'http://www.plneuro.xyz', 'https://www.plneuro.xyz:444', 'https://user@www.plneuro.xyz']) {
    assert.equal(isAllowedAuthOrigin(req(origin), canonical), false, origin);
  }
});


test('native URLencoded auth parses a synthetic password and preserves the return fragment', async () => {
  const { readAuthForm } = await access();
  const body = new URLSearchParams({ password: secret, returnTo: '/neuro-atlas/funding?q=seed#chart' });
  assert.deepEqual(await readAuthForm(new Request('https://example.test/__launch/auth', { method: 'POST', body })),
    { password: secret, returnTo: '/neuro-atlas/funding?q=seed#chart' });
});


test('auth form rejects malformed fields, encodings, media types, and overlong streamed bodies', async () => {
  const { readAuthForm } = await access();
  const req = (body, headers = {}) => new Request('https://example.test/__launch/auth', {
    method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
  for (const body of ['password=x', 'returnTo=%2F', 'password=&returnTo=%2F',
    'password=x&password=y&returnTo=%2F', 'password=x&returnTo=%2F&returnTo=%2Fx',
    'password=x&returnTo=%2F&extra=y', 'password=%ff&returnTo=%2F', 'password=%&returnTo=%2F',
    'password=x&returnTo=%2F&', 'password=' + 'x'.repeat(5000) + '&returnTo=%2F']) {
    assert.equal(await readAuthForm(req(body)), null, body.slice(0, 50));
  }
  assert.equal(await readAuthForm(req('password=x&returnTo=%2F', { 'content-type': 'application/json' })), null);
  assert.equal(await readAuthForm(req('password=x&returnTo=%2F', { 'content-length': '99999' })), null);
  assert.equal(await readAuthForm(req('password=x&returnTo=%2F', { 'content-length': 'bad' })), null);
  const chunks = [new TextEncoder().encode('password='), new Uint8Array(5000).fill(120)];
  const streamed = new ReadableStream({ pull(controller) {
    if (chunks.length) controller.enqueue(chunks.shift()); else controller.close();
  } });
  assert.equal(await readAuthForm(req(streamed)), null);
  const invalidUtf8 = new Uint8Array([112, 97, 115, 115, 119, 111, 114, 100, 61, 255]);
  assert.equal(await readAuthForm(req(invalidUtf8)), null);
});


test('correct native password yields 303 and a scoped secure signed cookie using a synthetic secret', async () => {
  const { authenticatePreviewForm, verifyPreviewToken } = await access();
  const now = opening - 60_000;
  const returnTo = '/neuro-atlas/funding?q=seed#chart';
  const request = (password, destination = returnTo) => new Request('https://example.test/neuro-atlas/__launch/auth', {
    method: 'POST', body: new URLSearchParams({ password, returnTo: destination }),
  });
  const result = await authenticatePreviewForm(request(secret), secret, now, '/neuro-atlas');
  assert.equal(result.response.status, 303);
  assert.equal(result.response.headers.get('location'), `https://example.test${returnTo}`, 'Next proxy requires an absolute Location');
  const cookie = result.response.headers.get('set-cookie');
  assert.match(cookie, /^__Secure-atlas-preview=\d{13}\.[a-f0-9]{64};/);
  assert.match(cookie, /; Path=\/neuro-atlas(?:;|$)/);
  assert.match(cookie, /; HttpOnly(?:;|$)/);
  assert.match(cookie, /; Secure(?:;|$)/);
  assert.match(cookie, /; SameSite=Lax(?:;|$)/);
  assert.match(cookie, /; Max-Age=60(?:;|$)/);
  assert.match(cookie, /; Expires=Thu, 19 Nov 2026 14:00:00 GMT(?:;|$)/);
  assert.equal(verifyPreviewToken(cookie.split(';')[0].split('=')[1], secret, now), true);
  const root = await authenticatePreviewForm(request(secret, '/funding#chart'), secret, now, '');
  assert.match(root.response.headers.get('set-cookie'), /; Path=\/(?:;|$)/);
  const invalid = await authenticatePreviewForm(request('wrong-synthetic-password'), secret, now, '/neuro-atlas');
  assert.equal(invalid.response, null);
  assert.equal(invalid.returnTo, returnTo);
  const unsafe = await authenticatePreviewForm(request(secret, '//evil.test'), secret, now, '/neuro-atlas');
  assert.equal(unsafe.response.headers.get('location'), 'https://example.test/neuro-atlas');
  const rewritten = new Request('https://atlas-upstream.example/neuro-atlas/__launch/auth', {
    method: 'POST', headers: { Origin: 'https://www.plneuro.xyz' }, body: new URLSearchParams({ password: secret, returnTo }),
  });
  const mounted = await authenticatePreviewForm(rewritten, secret, now, '/neuro-atlas');
  assert.equal(mounted.response.headers.get('location'), `https://www.plneuro.xyz${returnTo}`, 'use the already-validated public Origin, not upstream/forwarded host');
});
