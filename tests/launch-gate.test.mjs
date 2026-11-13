import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderLaunchGate } from '../src/lib/launch-gate.ts';

const now = Date.parse('2026-11-13T14:00:00Z');
const options = { now, nonce: 'synthetic-nonce', returnTo: '/neuro-atlas/field-velocity?view=charts', basePath: '/neuro-atlas' };

test('gate uses the supplied black particle-intro reference, not the white sign-in card', () => {
  const d = new JSDOM(renderLaunchGate(options)).window.document;
  assert.ok(d.querySelector('[data-title-toggle]'), 'title is interactive');
  assert.ok(d.querySelector('canvas[aria-hidden=true]'), 'real particle canvas');
  assert.match(d.querySelector('style').textContent, /#07080b/);
  assert.equal(d.querySelector('[data-title-toggle]').getAttribute('aria-label'), 'Toggle between Neuro Atlas and the launch countdown');
});

test('owner-requested explanatory copy is absent while the password keeps an accessible label', () => {
  const d = new JSDOM(renderLaunchGate(options)).window.document;
  for (const text of ['Move over the title to see the countdown', 'Tap the title to see the countdown', 'Have the password? Enter before launch', 'No password needed after launch']) assert.ok(!d.body.textContent.includes(text), text);
  assert.equal(d.querySelector('label[for=password]').textContent, 'Early-access password');
  assert.equal(d.querySelector('.show-password'), null, 'owner removed the visibility toggle');
  assert.ok(!d.body.textContent.includes('Show password'));
});

test('gate follows SAB sign-in hierarchy with an explicit ET launch and small real countdown', () => {
  const dom = new JSDOM(renderLaunchGate(options));
  const d = dom.window.document;
  assert.equal(d.querySelector('h1').textContent, 'Neuro Atlas');
  assert.match(d.body.textContent, /Thursday, November 19/);
  assert.match(d.body.textContent, /9:00 a\.m\. ET/);
  assert.equal(d.querySelector('time').dateTime, '2026-11-19T14:00:00.000Z');
  assert.equal(d.querySelectorAll('.countdown > .countdown-unit').length, 4, 'four independent time units, not nested spans');
  assert.deepEqual([...d.querySelectorAll('[data-countdown]')].map(e => e.textContent), ['06', '00', '00', '00']);
  assert.equal(d.querySelector('form').method, 'post');
  assert.equal(d.querySelector('form').getAttribute('action'), '/neuro-atlas/__launch/auth');
  assert.equal(d.querySelector('[name=password]').type, 'password');
  assert.equal(d.querySelector('[name=password]').autocomplete, 'current-password');
  assert.equal(d.querySelector('[name=returnTo]').value, options.returnTo);
  assert.equal(d.querySelectorAll('script[src],link[rel=stylesheet],iframe').length, 0, 'self-contained, no Atlas bundles or trackers');
  assert.equal(d.querySelector('script').nonce, options.nonce);
  assert.equal(d.querySelector('style').nonce, options.nonce);
});

test('gate escapes request-derived return paths and error text without emitting markup', () => {
  const d = new JSDOM(renderLaunchGate({ ...options, returnTo: '/neuro-atlas?x="/><img src=x onerror=alert(1)>', error: '<script>bad</script>' })).window.document;
  assert.equal(d.querySelectorAll('img').length, 0);
  assert.equal(d.querySelectorAll('script').length, 1);
  assert.equal(d.querySelector('[role=alert]').textContent, '<script>bad</script>');
  assert.equal(d.querySelector('[name=returnTo]').value, '/neuro-atlas?x="/><img src=x onerror=alert(1)>');
});

test('countdown clamps at zero, uses ceiling seconds, and has a non-live timer to avoid screen-reader chatter', () => {
  for (const [at, expected] of [['2026-11-19T13:59:59.999Z', ['00','00','00','01']], ['2026-11-19T14:00:00Z', ['00','00','00','00']], ['2026-11-19T14:00:01Z', ['00','00','00','00']]]) {
    const d = new JSDOM(renderLaunchGate({ ...options, now: Date.parse(at) })).window.document;
    assert.deepEqual([...d.querySelectorAll('[data-countdown]')].map(e => e.textContent), expected);
    assert.equal(d.querySelector('[role=timer]').getAttribute('aria-live'), 'off');
  }
});
