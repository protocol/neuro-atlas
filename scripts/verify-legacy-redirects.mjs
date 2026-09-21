import assert from 'node:assert/strict';

// Read-only HTTP replay. No real credentials, writes, or automatic cross-host follows.
const origin = new URL(process.argv[2] || 'http://127.0.0.1:3497').origin;
const canonical = new URL(process.argv[3] || 'https://www.plrd.org').origin;
const prefix = '/neuro-atlas';
const checks = [];
async function get(path, headers = {}) {
  return fetch(origin + path, {redirect: 'manual', headers, signal: AbortSignal.timeout(20000)});
}
const query = '?tag=one&tag=two&q=brain%20computer&next=https%3A%2F%2Fevil.example&path=keep';
for (const route of ['/', '/milestones', '/funding', '/field-velocity', '/methodology', '/ecosystem', '/regulatory-landscape', '/milestones/event/example']) {
  const response = await get(route + query);
  assert.equal(response.status, 307, route);
  const location = new URL(response.headers.get('location'));
  const path = route === '/' ? '' : route === '/regulatory-landscape' ? '/milestones' : route;
  assert.equal(location.origin, canonical, route);
  assert.equal(location.pathname, prefix + path, route);
  assert.deepEqual([...location.searchParams], [...new URLSearchParams(query)], route);
  checks.push({path: route, status: response.status, location: location.href});
}
for (const route of ['/milestones/', '/funding/', '/regulatory-landscape/']) {
  let response = await get(route);
  let hops = 0;
  while ([307, 308].includes(response.status)) {
    const location = new URL(response.headers.get('location'), origin);
    if (location.origin === canonical) {
      assert.equal(location.pathname, prefix + (route.startsWith('/regulatory') ? '/milestones' : route.slice(0, -1)));
      break;
    }
    assert.equal(location.origin, origin);
    assert.ok(++hops <= 2, 'redirect loop: ' + route);
    response = await get(location.pathname + location.search);
  }
  assert.equal(response.status, 307, route);
  checks.push({path: route, status: response.status, sameOriginNormalizationHops: hops});
}
for (const path of ['', '/milestones', '/funding', '/field-velocity', '/methodology', '/ecosystem', '/sitemap.xml']) {
  for (const headers of [{}, {Authorization: 'Basic ' + Buffer.from('qa:invalid-redirect-test').toString('base64')}]) {
    const response = await get(prefix + path, headers);
    assert.equal(response.status, 401, prefix + path);
    assert.match(response.headers.get('www-authenticate'), /Basic realm="Neuro Atlas"/);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(response.headers.get('location'), null);
  }
  checks.push({path: prefix + path, absentAndInvalidAuth: 401, noindex: true});
}
const regulatory = await get(prefix + '/regulatory-landscape?year=2025');
assert.equal(regulatory.status, 307);
assert.equal(new URL(regulatory.headers.get('location'), origin).pathname, prefix + '/milestones');
for (const path of ['/unknown', '/funding-extra', '/_next/static/not-a-real-asset.js']) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get('location'), null);
  checks.push({path, status: response.status});
}
console.log(JSON.stringify({origin, canonical, checks, result: 'PASS', qualification: 'Redirect and negative-auth proof only; no successful real-password login claimed.'}, null, 2));
