// Read-only hosted/local auth smoke. Does not read or send the real password.
// Usage: node scripts/verify-auth-gate.mjs https://<origin> /neuro-atlas
import assert from 'node:assert/strict';
const [originValue, prefix = ''] = process.argv.slice(2);
const origin = new URL(originValue);
assert.equal(origin.href, origin.origin + '/', 'Pass an origin, not a path');
assert.ok(origin.protocol === 'https:' || (origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)));
assert.ok(prefix === '' || prefix === '/neuro-atlas', 'Unsupported prefix');
const results = [];
for (const suffix of ['', '/', '/milestones', '/funding', '/field-velocity', '/methodology', '/sitemap.xml']) {
  const path = prefix + suffix || '/';
  for (const invalid of [false, true]) {
    const response = await fetch(origin.origin + path, {
      headers: invalid ? { Authorization: 'Basic invalid' } : {},
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(new URL(response.url).origin, origin.origin, `Unexpected cross-origin redirect: ${path}`);
    assert.equal(response.status, 401, `${path}: ${invalid ? 'invalid' : 'absent'} credentials`);
    assert.match(response.headers.get('www-authenticate') ?? '', /^Basic realm="Neuro Atlas"/);
    if (prefix) assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/, `${path}: missing originating noindex header`);
    results.push({ path, credentials: invalid ? 'invalid' : 'absent', status: response.status, robots: response.headers.get('x-robots-tag') });
  }
}
console.log(JSON.stringify({ result: 'PASS', origin: origin.origin, prefix, successfulLogin: 'not tested', results }, null, 2));
