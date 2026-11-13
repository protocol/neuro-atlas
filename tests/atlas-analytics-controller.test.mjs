import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const ID = 'G-ATLAS12345';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function setup({ url = 'https://www.plneuro.xyz/neuro-atlas?password=private#secret', choice = 'granted', region = 'required', context = { eligible: true, measurementId: ID }, before } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { url, referrer: 'https://example.org/story?token=private#secret' });
  const { window: win } = dom;
  if (choice !== null) win.localStorage.setItem('pl-ga-consent', choice);
  if (region !== null) win.document.cookie = `pl-consent-region=${region}; path=/`;
  const requests = [];
  win.fetch = async (...args) => { requests.push(args); return { ok: true, json: async () => ({ consentRequired: region !== 'open', ...context }) }; };
  before?.(win);
  const { createAtlasAnalytics } = await import('../src/lib/atlas-analytics.ts');
  const controller = createAtlasAnalytics(win);
  let state;
  const disconnect = controller.connect(next => { state = next; });
  await tick();
  return { win, controller, requests, state: () => state, disconnect, close: () => { disconnect(); win.close(); } };
}
const commands = win => (win.dataLayer ?? []).map(args => Array.from(args));
const views = win => commands(win).filter(args => args[0] === 'event' && args[1] === 'page_view');
const load = win => win.document.querySelector('script')?.dispatchEvent(new win.Event('load'));

test('granted consent loads one dedicated tag and emits only an explicit sanitized initial page view', async () => {
  const h = await setup();
  try {
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0][0], '/neuro-atlas/api/analytics-context');
    assert.equal(h.requests[0][1].cache, 'no-store');
    const script = h.win.document.querySelector('script');
    assert.equal(script.src, `https://www.googletagmanager.com/gtag/js?id=${ID}`);
    assert.equal(script.referrerPolicy, 'no-referrer');
    assert.equal(views(h.win).length, 0);
    load(h.win);
    assert.equal(views(h.win).length, 1);
    const config = commands(h.win).find(args => args[0] === 'config');
    assert.equal(config[2].send_page_view, false);
    assert.equal(config[2].allow_google_signals, false);
    assert.equal(config[2].allow_ad_personalization_signals, false);
    assert.equal(views(h.win)[0][2].page_location, 'https://www.plneuro.xyz/neuro-atlas');
    assert.equal(views(h.win)[0][2].page_referrer, 'https://example.org/story');
    assert.doesNotMatch(JSON.stringify(commands(h.win)), /private|secret|password|token=/);
  } finally { h.close(); }
});


test('pathname history owns one pageview per navigation including back/forward; modal/query/hash changes are silent', async () => {
  const h = await setup();
  try {
    load(h.win);
    h.win.history.pushState({}, '', '/neuro-atlas/funding?secret=raw#modal');
    assert.equal(views(h.win).length, 2);
    h.win.history.replaceState({}, '', '/neuro-atlas/funding?secret=other#another');
    h.controller.refresh();
    assert.equal(views(h.win).length, 2);
    h.win.history.back(); await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(views(h.win).length, 3);
    h.win.history.forward(); await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(views(h.win).length, 4);
    assert.equal(h.win.document.querySelectorAll('script').length, 1);
    assert.doesNotMatch(JSON.stringify(views(h.win)), /secret|raw|modal|another/);
  } finally { h.close(); }
});

test('only canonical Atlas content URLs are eligible, never preview/direct/auth/API/assets', async () => {
  for (const url of [
    'http://localhost:3000/neuro-atlas', 'https://preview.vercel.app/neuro-atlas',
    'https://www.plneuro.xyz/other', 'https://www.plneuro.xyz/neuro-atlas-private',
    'https://www.plneuro.xyz/neuro-atlas/api/analytics-context',
    'https://www.plneuro.xyz/neuro-atlas/auth', 'https://www.plneuro.xyz/neuro-atlas/_next/static/app.js',
    'https://www.plneuro.xyz/neuro-atlas/photo.png',
  ]) {
    const h = await setup({ url });
    try { assert.equal(h.requests.length, 0, url); assert.equal(h.win.document.querySelector('script'), null, url); }
    finally { h.close(); }
  }
});


test('denied, unknown choice/region/storage, ineligible or invalid config never loads a tracker', async () => {
  for (const options of [
    { choice: 'denied', region: 'open' }, { choice: null, region: null },
    { choice: 'garbage', region: 'open' }, { choice: null, region: 'OPEN' },
    { context: { eligible: false } }, { context: { eligible: true } },
    { context: { eligible: true, measurementId: 'G-XPSNFVNHGB' } },
    { before: win => Object.defineProperty(win, 'localStorage', { get() { throw new Error('blocked'); } }) },
    { before: win => Object.defineProperty(win.document, 'cookie', { get() { throw new Error('blocked'); } }) },
  ]) {
    const h = await setup(options);
    try { assert.equal(h.win.document.querySelector('script'), null, JSON.stringify(options)); }
    finally { h.close(); }
  }
});

test('withdrawal from implicit open permission disables immediately, purges all GA domain/path variants and stops future events', async () => {
  const h = await setup({ choice: null, region: 'open' });
  try {
    load(h.win);
    assert.equal(views(h.win).length, 1);
    h.win.document.cookie = '_ga=root; path=/; domain=plneuro.xyz';
    h.win.document.cookie = '_ga_ATLAS=nested; path=/neuro-atlas';
    const native = Object.getOwnPropertyDescriptor(h.win.Document.prototype, 'cookie');
    const deleted = [];
    Object.defineProperty(h.win.document, 'cookie', { get() { return native.get.call(this); }, set(value) { deleted.push(value); native.set.call(this, value); } });
    h.controller.choose('denied');
    assert.equal(h.win[`ga-disable-${ID}`], true);
    assert.equal(h.win.localStorage.getItem('pl-ga-consent'), 'denied');
    assert.doesNotMatch(h.win.document.cookie, /_ga/);
    assert.ok(deleted.some(value => value.includes('domain=plneuro.xyz')));
    assert.ok(deleted.some(value => value.includes('domain=www.plneuro.xyz')));
    assert.ok(deleted.some(value => value.includes('path=/neuro-atlas')));
    h.win.history.pushState({}, '', '/neuro-atlas/funding');
    load(h.win);
    assert.equal(views(h.win).length, 1);
  } finally { h.close(); }
});

test('same-origin cross-tab choices and settings events are honored without extra tags', async () => {
  const h = await setup({ choice: 'denied' });
  try {
    h.win.dispatchEvent(new h.win.Event('pl:open-cookie-settings'));
    assert.equal(h.state().showBanner, true);
    h.win.localStorage.setItem('pl-ga-consent', 'granted');
    h.win.dispatchEvent(new h.win.StorageEvent('storage', { key: 'pl-ga-consent', newValue: 'granted', storageArea: h.win.localStorage }));
    load(h.win);
    assert.equal(views(h.win).length, 1);
    h.win.localStorage.setItem('pl-ga-consent', 'denied');
    h.win.dispatchEvent(new h.win.StorageEvent('storage', { key: 'pl-ga-consent', newValue: 'denied', storageArea: h.win.localStorage }));
    assert.equal(h.win[`ga-disable-${ID}`], true);
    h.win.history.pushState({}, '', '/neuro-atlas/funding');
    assert.equal(views(h.win).length, 1);
    assert.equal(h.win.document.querySelectorAll('script').length, 1);
  } finally { h.close(); }
});


test('StrictMode replay and real remount reuse a singleton without duplicate scripts/config/views', async () => {
  const h = await setup();
  try {
    const { getAtlasAnalytics } = await import('../src/lib/atlas-analytics.ts');
    assert.equal(getAtlasAnalytics(h.win), getAtlasAnalytics(h.win));
    load(h.win);
    h.disconnect();
    const off = h.controller.connect(() => {});
    await tick();
    load(h.win);
    assert.equal(h.requests.length, 1);
    assert.equal(h.win.document.querySelectorAll('script').length, 1);
    assert.equal(commands(h.win).filter(args => args[0] === 'config').length, 1);
    assert.equal(views(h.win).length, 1);
    off();
    h.win.history.pushState({}, '', '/neuro-atlas/funding');
    load(h.win);
    assert.equal(views(h.win).length, 1);
  } finally { h.close(); }
});

test('rapid grant/reject before tag completion and failed tag/fetch cannot emit events', async () => {
  for (const fail of ['withdraw', 'script', 'fetch']) {
    const h = await setup({ choice: 'denied', before: fail === 'fetch' ? win => { win.fetch = async () => { throw new Error('offline'); }; } : undefined });
    try {
      h.controller.choose('granted');
      const script = h.win.document.querySelector('script');
      if (fail === 'withdraw') h.controller.choose('denied');
      if (fail === 'script') script.dispatchEvent(new h.win.Event('error'));
      load(h.win);
      h.win.history.pushState({}, '', '/neuro-atlas/funding');
      assert.equal(views(h.win).length, 0);
      assert.notEqual(h.win[`ga-disable-${ID}`], false);
    } finally { h.close(); }
  }
});


test('authoritative context policy outranks stale open cookies and absent policy fails closed', async () => {
  for (const context of [{ eligible: true, measurementId: ID, consentRequired: true }, { eligible: true, measurementId: ID, consentRequired: undefined }]) {
    const h = await setup({ choice: null, region: 'open', context });
    try { assert.equal(h.win.document.querySelector('script'), null); assert.equal(h.state().showBanner, true); }
    finally { h.close(); }
  }
});


test('leaving the content allowlist hides consent UI and disables collection until valid reentry', async () => {
  const h = await setup();
  try {
    load(h.win);
    h.win.history.pushState({}, '', '/neuro-atlas/api/private?password=secret');
    assert.equal(h.win[`ga-disable-${ID}`], true);
    assert.equal(h.state().eligible, false);
    assert.equal(h.state().showBanner, false);
    h.win.dispatchEvent(new h.win.Event('pl:open-cookie-settings'));
    assert.equal(h.state().showBanner, false);
    h.win.history.pushState({}, '', '/neuro-atlas/funding');
    assert.equal(h.state().eligible, true);
    assert.equal(views(h.win).length, 2);
  } finally { h.close(); }
});


test('settings remain usable after tag failure without retries or collection', async () => {
  const h = await setup();
  try {
    h.win.document.querySelector('script').dispatchEvent(new h.win.Event('error'));
    h.win.dispatchEvent(new h.win.Event('pl:open-cookie-settings'));
    assert.equal(h.state().showBanner, true);
    h.controller.choose('denied');
    assert.equal(h.state().choice, 'denied');
    assert.equal(h.state().showBanner, false);
    assert.equal(views(h.win).length, 0);
    assert.equal(h.win.document.querySelectorAll('script').length, 1);
  } finally { h.close(); }
});


test('slow tag loading preserves each sanitized content navigation, but withdrawal discards pending events', async () => {
  const h = await setup();
  try {
    h.win.history.pushState({}, '', '/neuro-atlas/funding?secret=raw');
    h.win.history.pushState({}, '', '/neuro-atlas/funding?secret=other#modal');
    h.win.history.pushState({}, '', '/neuro-atlas/milestones');
    load(h.win);
    assert.deepEqual(views(h.win).map(args => args[2].page_location), [
      'https://www.plneuro.xyz/neuro-atlas',
      'https://www.plneuro.xyz/neuro-atlas/funding',
      'https://www.plneuro.xyz/neuro-atlas/milestones',
    ]);
    assert.equal(views(h.win)[1][2].page_referrer, 'https://www.plneuro.xyz/neuro-atlas');
  } finally { h.close(); }
});
