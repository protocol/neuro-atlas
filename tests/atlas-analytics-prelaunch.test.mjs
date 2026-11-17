import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { NextRequest } from 'next/server.js';

// Synthetic fixtures only; no production password, network request or Google hit.
const beforeLaunch = Date.parse('2026-11-18T14:00:00Z');
const id = 'G-ATLAS12345';
const password = 'SYNTHETIC-PRELAUNCH-ANALYTICS-ONLY';

test('real prelaunch password boundary admits consented content measurement while the password screen stays untracked', async (t) => {
  const saved = { password: process.env.ATLAS_PREVIEW_PASSWORD, env: process.env.VERCEL_ENV, id: process.env.NEXT_PUBLIC_ATLAS_GA_ID };
  t.mock.method(Date, 'now', () => beforeLaunch);
  process.env.ATLAS_PREVIEW_PASSWORD = password;
  process.env.VERCEL_ENV = 'production';
  process.env.NEXT_PUBLIC_ATLAS_GA_ID = id;
  let dom, disconnect;
  try {
    const { proxy } = await import('../src/proxy.ts');
    const { GET } = await import('../src/app/api/analytics-context/route.ts');
    const { createAtlasAnalytics } = await import('../src/lib/atlas-analytics.ts');
    const origin = 'https://www.plneuro.xyz';
    const request = (path, init = {}) => new NextRequest(origin + path, { ...init, nextConfig: { basePath: '/neuro-atlas' } });
    const landing = await proxy(request('/neuro-atlas', { headers: { accept: 'text/html' } }));
    assert.equal(landing.status, 401);
    assert.doesNotMatch(await landing.text(), /googletagmanager|google-analytics|_next\/static|atlas-analytics-context/);
    const anonymous = await proxy(request('/neuro-atlas/api/analytics-context'));
    assert.equal(anonymous.status, 401, 'Analytics context retains the prelaunch access boundary');
    const login = await proxy(request('/neuro-atlas/__launch/auth', {
      method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password, returnTo: '/neuro-atlas/funding' }),
    }));
    assert.equal(login.status, 303);
    const cookie = login.headers.get('set-cookie').split(';', 1)[0];
    const content = await proxy(request('/neuro-atlas/funding', { headers: { cookie, accept: 'text/html' } }));
    assert.equal(content.headers.get('x-middleware-next'), '1');
    dom = new JSDOM('<!doctype html><body></body>', { url: origin + '/neuro-atlas/funding?password=private#secret' });
    dom.window.fetch = async (path) => {
      const req = request(path, { headers: { cookie } });
      const access = await proxy(req);
      assert.equal(access.headers.get('x-middleware-next'), '1');
      return GET(req);
    };
    const controller = createAtlasAnalytics(dom.window);
    let state;
    disconnect = controller.connect(next => { state = next; });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(state.eligible, true, 'Successful password access permits prelaunch Analytics');
    assert.equal(state.showBanner, true, 'Existing explicit-consent policy still applies');
    assert.equal(dom.window.document.querySelector('script'), null, 'No tracker before required consent');
    controller.choose('granted');
    const script = dom.window.document.querySelector('script');
    assert.equal(script.src, `https://www.googletagmanager.com/gtag/js?id=${id}`);
    script.dispatchEvent(new dom.window.Event('load'));
    const views = () => (dom.window.dataLayer ?? []).filter(args => args[0] === 'event' && args[1] === 'page_view');
    assert.equal(views().length, 1);
    assert.equal(views()[0][2].page_location, origin + '/neuro-atlas/funding');
    assert.doesNotMatch(JSON.stringify(dom.window.dataLayer), /private|password|secret|SYNTHETIC/);
    controller.choose('denied');
    dom.window.history.pushState({}, '', '/neuro-atlas/milestones');
    assert.equal(views().length, 1, 'Withdrawal still prevents further pageviews');
    assert.equal(dom.window[`ga-disable-${id}`], true);
  } finally {
    disconnect?.();
    dom?.window.close();
    for (const [key, value] of [['ATLAS_PREVIEW_PASSWORD', saved.password], ['VERCEL_ENV', saved.env], ['NEXT_PUBLIC_ATLAS_GA_ID', saved.id]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
