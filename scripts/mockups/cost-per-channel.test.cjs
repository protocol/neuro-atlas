const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const datasetPath = path.join(__dirname, 'cost-per-channel.data.json');
const logicPath = path.join(__dirname, 'cost-per-channel.js');

function logic() {
  assert.ok(fs.existsSync(logicPath), 'shared prototype behavior exists');
  const vm = require('node:vm');
  const sandbox = { module: { exports: {} }, Intl, console };
  vm.runInNewContext(fs.readFileSync(logicPath, 'utf8'), sandbox);
  return sandbox.module.exports;
}

test('ratios, currency separation, and bounded point positions match the priced configurations', () => {
  const api = logic();
  const { records } = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const expected = {
    'neurorighter-2009': [155.53078125, 155.53078125],
    'open-ephys-2017': [46.875, 46.875],
    'scifi-np1-2026': [6.932291666666667, 27.5625],
    'scifi-cereport-2026': [27.729166666666668, 110.25],
    'open-ephys-2026': [59.86015625, 59.86015625],
    'utah-2016': [62.5, 62.5],
    'neuropixels2-2026': [3.90625, 3.90625],
  };
  for (const row of records) {
    assert.ok(Math.abs(api.ratio(row, 'academic') - expected[row.id][0]) < 1e-10);
    assert.ok(Math.abs(api.ratio(row, 'list') - expected[row.id][1]) < 1e-10);
  }
  const usd = api.selectRows(records, 'electronics', 'USD');
  assert.equal(usd.length, 4);
  assert.equal(api.selectRows(records, 'complete', 'USD').length, 0);
  assert.match(api.displayRatio(records.find(r => r.bound === 'lt'), 'academic'), /^<\$/);
  assert.match(api.displayRatio(records.find(r => r.bound === 'approx'), 'academic'), /^≈\$/);
  const singleton = api.plotPoints(api.selectRows(records, 'probes', 'EUR'), 'academic');
  assert.ok(singleton.points[0].x >= 80 && singleton.points[0].x <= 230, 'singleton is visible in first mobile chart viewport');
  assert.equal(api.plotPoints(usd, 'academic').points.length, 4);
});

test('inspection starts empty, pinning survives hover, Escape clears, and filters never retain a stale pin', () => {
  const api = logic();
  assert.equal(typeof api.transition, 'function', 'selection state transitions are implemented');
  let state = { scope: 'electronics', currency: 'USD', tier: 'academic', pinned: null, peek: null };
  state = api.transition(state, { type: 'peek', id: 'neurorighter-2009' });
  assert.equal(state.peek, 'neurorighter-2009');
  state = api.transition(state, { type: 'pin', id: 'neurorighter-2009' });
  state = api.transition(state, { type: 'peek', id: 'open-ephys-2017' });
  assert.equal(state.pinned, 'neurorighter-2009');
  assert.equal(state.peek, null);
  state = api.transition(state, { type: 'clear' });
  assert.equal(state.pinned, null);
  assert.equal(state.peek, null);
  state = api.transition(state, { type: 'pin', id: 'open-ephys-2017' });
  state = api.transition(state, { type: 'filter', key: 'currency', value: 'EUR' });
  assert.equal(state.currency, 'EUR');
  assert.equal(state.pinned, null);
  state = api.transition(state, { type: 'pin', id: 'scifi-np1-2026' });
  state = api.transition(state, { type: 'filter', key: 'tier', value: 'list' });
  assert.equal(state.pinned, 'scifi-np1-2026', 'tier switching preserves pinned evidence');
});

test('both generated layouts are standalone, scoped prototypes with a distinct evidence-first composition', () => {
  for (const variant of ['', '-evidence']) {
    const file = path.join(root, 'public/mockups/cost-per-channel' + variant + '.html');
    assert.ok(fs.existsSync(file), 'generated standalone layout exists: ' + variant);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /Discussion mock · Nov 5, 2026/);
    assert.match(html, /Cost per recording channel/);
    assert.match(html, /Still need an itemized probe \+ readout setup/);
    assert.match(html, /id="mock-data"/);
    assert.match(html, /id="inspector-body"/);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+stylesheet|@import|fonts\.google/);
    assert.equal(html.includes('@@'), false, 'all generator placeholders are resolved');
    const scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length >= 2);
    const dataScript = scripts.find(match => match[0].includes('id="mock-data"'));
    assert.equal(JSON.parse(dataScript[1]).records.length, 7);
    assert.match(html, variant ? /data-layout="evidence"/ : /data-layout="chart"/);
  }
});

test('rendered inspection is genuinely empty by default, remains usable after hover, and clears with Escape', () => {
  const { JSDOM } = require('jsdom');
  for (const suffix of ['', '-evidence']) {
    const html = fs.readFileSync(path.join(root, 'public/mockups/cost-per-channel' + suffix + '.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/neuro-atlas/mockups/cost-per-channel' + suffix + '.html' });
    const { document, MouseEvent, KeyboardEvent } = dom.window;
    const body = document.getElementById('inspector-body');
    assert.equal(body.textContent.trim(), '');
    const point = document.querySelector('[data-point="scifi-np1-2026"]');
    point.dispatchEvent(new MouseEvent('mouseenter'));
    assert.match(body.textContent, /\$6\.93/);
    point.dispatchEvent(new MouseEvent('mouseleave'));
    assert.ok(body.querySelector('a[href="https://science.xyz/foundry/api/products"]'), 'hovered source stays reachable');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(body.textContent.trim(), '');
    point.click();
    document.querySelector('[data-tier="list"]').click();
    assert.match(body.textContent, /\$27\.56/);
    assert.equal(document.getElementById('detail-pane').dataset.pinned, 'true');
    dom.window.close();
  }
});

test('seven evidence-backed records retain price scope, currency, bounds, and denominator', () => {
  assert.ok(fs.existsSync(datasetPath), 'the structured seven-record dataset exists');
  const { records } = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  assert.equal(records.length, 7);
  assert.equal(records.filter(r => r.scope === 'electronics' && r.currency === 'USD').length, 4);
  assert.equal(records.filter(r => r.scope === 'complete').length, 0);
  const byId = Object.fromEntries(records.map(r => [r.id, r]));
  assert.equal(byId['open-ephys-2017'].bound, 'lt');
  assert.equal(byId['utah-2016'].bound, 'approx');
  assert.equal(byId['neurorighter-2009'].price.academic, 9953.97);
  assert.equal(byId['open-ephys-2026'].currency, 'EUR');
  assert.equal(byId['open-ephys-2026'].channels, 128);
  assert.equal(byId['neuropixels2-2026'].quantity, 5);
  assert.equal(byId['neuropixels2-2026'].channels, 384);
  assert.equal(byId['scifi-np1-2026'].price.list, 10584);
  for (const row of records) {
    assert.ok(row.included && row.excluded && row.dateBasis);
    assert.ok(row.sources.length >= 1);
    assert.ok(row.evidence.length >= 2);
    for (const quote of row.evidence) {
      assert.ok(quote.text && quote.url.startsWith('https://'));
      assert.ok(row.sources.some(s => s.url === quote.url));
    }
  }
});
