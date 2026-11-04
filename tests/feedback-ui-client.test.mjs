import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import { FeedbackClient } from '../src/lib/feedback-client.ts';

function fixture(handler) {
  const dom = new JSDOM('', { url: 'https://atlas.example/field-velocity' });
  const calls = [];
  const popup = { closed: false, location: { href: '' }, close() { this.closed = true; } };
  dom.window.open = () => { calls.push('open'); return popup; };
  const client = new FeedbackClient({ window: dom.window, crypto: webcrypto, fetch: async (url, options) => {
    calls.push({ url, ...options });
    return handler(url, options);
  } });
  return { dom, client, popup, calls, close() { client.dispose(); dom.window.close(); } };
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const session = () => ({ session: 'opaque-fixture-only', expiresAt: new Date(Date.now() + 60000).toISOString(), actor: { githubId: 1, login: 'fixture-owner' } });
async function auth(f) {
  const promise = f.client.signIn();
  for (let i = 0; i < 20 && !f.popup.location.href; i++) await new Promise(r => setTimeout(r, 5));
  const url = new URL(f.popup.location.href);
  const message = (patch = {}, origin = 'https://atlas.example', source = f.popup) => f.dom.window.dispatchEvent(new f.dom.window.MessageEvent('message', { origin, source, data: { type: 'atlas-feedback-oauth', state: url.searchParams.get('state'), code: 'fixture-code', ...patch } }));
  return { promise, message, url };
}
function authHandler(url, options) {
  if (url.endsWith('/auth/start')) {
    const { state, codeChallenge } = JSON.parse(options.body);
    return json({ authorizeUrl: `https://github.com/login/oauth/authorize?state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`, expiresAt: new Date(Date.now() + 300000).toISOString() });
  }
  if (url.endsWith('/auth/finish')) return json(session());
  if (options.method === 'DELETE') return new Response(null, { status: 204 });
  if (options.method === 'POST') return json({ id: 'fixture-id', version: 1, state: 'received' }, 202);
  return json({ items: [] });
}

test('popup is direct-gesture; forged origin/source/state cannot finish; valid state is consumed once', async () => {
  const f = fixture(authHandler);
  try {
    const a = await auth(f);
    assert.equal(f.calls[0], 'open');
    const start = JSON.parse(f.calls.find(x => x.url?.endsWith('/start')).body);
    assert.match(start.state, /^[A-Za-z0-9_-]{43}$/);
    assert.match(start.codeChallenge, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(start.codeVerifier, undefined);
    a.message({}, 'https://evil.example'); a.message({}, undefined, {}); a.message({ state: 'wrong' });
    await new Promise(r => setTimeout(r, 0));
    assert.equal(f.calls.filter(x => x.url?.endsWith('/finish')).length, 0);
    a.message(); a.message();
    await a.promise;
    assert.equal(f.calls.filter(x => x.url?.endsWith('/finish')).length, 1);
    const finish = JSON.parse(f.calls.find(x => x.url?.endsWith('/finish')).body);
    const digest = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(finish.codeVerifier))).toString('base64url');
    assert.equal(digest, start.codeChallenge);
    assert.equal(f.dom.window.localStorage.length, 0); assert.equal(f.dom.window.sessionStorage.length, 0);
    assert.equal(f.dom.window.document.cookie, '');
    assert.ok(f.popup.closed);
  } finally { f.close(); }
});

test('authenticated fetch preserves Basic header namespace, no-store, explicit idempotency and routes', async () => {
  const f = fixture(authHandler);
  try {
    const a = await auth(f); a.message(); await a.promise;
    const input = { privateComment: 'private fixture', publicTask: { title: 'public' } };
    await f.client.submit(input, 'fixture-key');
    await f.client.followup('id/with/slash', 4, input, 'followup-key');
    const posts = f.calls.filter(x => x.method === 'POST' && !x.url.includes('/auth/'));
    assert.equal(posts[0].headers['X-Atlas-Feedback-Session'], 'opaque-fixture-only');
    assert.equal(posts[0].headers.Authorization, undefined);
    assert.equal(posts[0].headers['Idempotency-Key'], 'fixture-key');
    assert.equal(posts[0].cache, 'no-store');
    assert.equal(posts[1].url, '/api/feedback/id%2Fwith%2Fslash/followups');
    assert.equal(JSON.parse(posts[1].body).expectedVersion, 4);
    await f.client.signOut();
    await assert.rejects(f.client.list(), /Sign in/);
  } finally { f.close(); }
});

test('failed/non-JSON service responses are honest safe errors and never accepted as saved', async () => {
  const f = fixture(() => new Response('<html>secret infrastructure detail</html>', { status: 503 }));
  try { await assert.rejects(f.client.config(), error => error.code === 'unavailable' && !error.message.includes('secret')); }
  finally { f.close(); }
});

test('blocked popup and disposal cancel authentication without leaking listeners or accepting a late message', async () => {
  const f = fixture(authHandler);
  try {
    f.dom.window.open = () => null;
    await assert.rejects(f.client.signIn(), /popup/i);
    f.dom.window.open = () => f.popup;
    const a = await auth(f);
    f.client.cancelSignIn();
    await assert.rejects(a.promise, /cancel/i);
    a.message(); await new Promise(r => setTimeout(r, 0));
    assert.equal(f.calls.filter(x => x.url?.endsWith('/finish')).length, 0);
  } finally { f.close(); }
});


test('malformed 2xx writes never count as saved', async () => {
  const f = fixture((url, options) => url.includes('/auth/') ? authHandler(url, options) : json({ ok: true }));
  try {
    const a = await auth(f); a.message(); await a.promise;
    await assert.rejects(f.client.submit({}, 'fixture-key'), error => error.code === 'invalid_response');
    await assert.rejects(f.client.followup('fixture-id', 1, {}, 'fixture-key'), error => error.code === 'invalid_response');
  } finally { f.close(); }
});

test('closed popup and five-minute expiry cancel the transaction; late messages cannot authenticate', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const f = fixture(authHandler);
  try {
    let a = await auth(f); f.popup.closed = true;
    const closed = assert.rejects(a.promise, /cancel/i);
    t.mock.timers.tick(251); await closed;
    f.popup.closed = false; f.popup.location.href = '';
    a = await auth(f);
    const expired = assert.rejects(a.promise, /expired/i);
    t.mock.timers.tick(300001); await expired;
    a.message(); await new Promise(r => setTimeout(r, 0));
    assert.equal(f.calls.filter(x => x.url?.endsWith('/finish')).length, 0);
  } finally { f.close(); }
});

test('401 and absolute page-memory expiry clear authentication without sending a stale session', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  let unauthorized = true;
  const f = fixture((url, options) => url.includes('/auth/') ? authHandler(url, options) : unauthorized ? json({ error: { message: 'secret' } }, 401) : json({ items: [] }));
  try {
    let a = await auth(f); a.message(); await a.promise;
    await assert.rejects(f.client.list(), /Sign in again/); assert.equal(f.client.getSession(), null);
    unauthorized = false; f.popup.closed = false; f.popup.location.href = '';
    a = await auth(f); a.message(); await a.promise;
    const count = f.calls.length;
    t.mock.timers.tick(60001);
    await assert.rejects(f.client.list(), /Sign in/);
    assert.equal(f.calls.length, count);
  } finally { f.close(); }
});

test('authorize URL cannot redirect the popup off GitHub or change the bound PKCE transaction', async () => {
  const f = fixture(() => json({ authorizeUrl: 'https://evil.example/steal' }));
  try { await assert.rejects(f.client.signIn(), /Could not reach feedback/); assert.equal(f.popup.closed, true); }
  finally { f.close(); }
});


test('only durable 202 intake receipts count as saved', async () => {
  const f = fixture((url, options) => url.includes('/auth/') ? authHandler(url, options) : json({ id: 'fixture-id', state: 'received', version: 1 }, 200));
  try { const a = await auth(f); a.message(); await a.promise; await assert.rejects(f.client.submit({}, 'fixture-key'), error => error.code === 'invalid_response'); }
  finally { f.close(); }
});

test('malformed OAuth finish fails closed instead of hanging or retaining a session', async () => {
  const f = fixture((url, options) => url.endsWith('/finish') ? json(null) : authHandler(url, options));
  try {
    const a = await auth(f); a.message();
    await assert.rejects(Promise.race([a.promise, new Promise((_, reject) => setTimeout(() => reject(Error('HUNG')), 100))]), error => error.code === 'unavailable');
    assert.equal(f.client.getSession(), null);
  } finally { f.close(); }
});


test('auth finish is still bounded by transaction timeout and aborts on disposal', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  let finishSignal;
  const f = fixture((url, options) => {
    if (url.endsWith('/finish')) { finishSignal = options.signal; return new Promise(() => {}); }
    return authHandler(url, options);
  });
  try {
    const a = await auth(f); a.message();
    const expired = assert.rejects(Promise.race([a.promise, new Promise((_, reject) => setTimeout(() => reject(Error('HUNG')), 100))]), error => error.code === 'auth_expired');
    t.mock.timers.tick(300001); await expired;
    assert.equal(finishSignal.aborted, true);
  } finally { f.close(); }
});


test('callback may close immediately after its one-use message while finish is delayed', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let finish;
  const f = fixture((url, options) => url.endsWith('/finish') ? new Promise(resolve => { finish = () => resolve(json(session())); }) : authHandler(url, options));
  try {
    const a = await auth(f);
    const result = a.promise.then(value => ({ value }), error => ({ error }));
    a.message(); f.popup.close();
    t.mock.timers.tick(501);
    assert.equal(f.calls.find(x => x.url?.endsWith('/finish')).signal.aborted, false);
    finish();
    const outcome = await result;
    assert.equal(outcome.error, undefined);
    assert.equal(outcome.value.actor.login, 'fixture-owner');
    assert.ok(f.client.getSession());
  } finally { f.close(); }
});
