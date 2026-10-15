import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { mount, click } from './modal-helpers.mjs';
import { performanceUrl } from '../src/lib/field-velocity/navigation.ts';
import { spawnSync } from 'node:child_process';

test('deployed /neuro-atlas source downloads keep the basePath and exact query metadata', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import React from 'react';
    import { mount } from './tests/modal-helpers.mjs';
    import { GoogleTrends } from './src/components/google-trends.tsx';
    const cleanup = await mount(React.createElement(GoogleTrends), '#google-trends-neurotech');
    try {
      const downloads = [...document.querySelectorAll('dialog a[download]')].map(a => a.getAttribute('href'));
      assert.deepEqual(downloads, ['/neuro-atlas/data/google-trends/neurotech.csv', '/neuro-atlas/data/google-trends/google-trends.json']);
      const url = new URL(document.querySelector('dialog a[href^="https://trends.google.com/trends/explore?"]').href);
      assert.equal(url.searchParams.get('date'), '2023-10-15 2026-10-15');
      assert.equal(url.searchParams.get('q'), 'neurotechnology,brain-computer interface');
      assert.equal(url.searchParams.has('geo'), false);
    } finally { await cleanup(); }
  `], { encoding: 'utf8', env: { ...process.env, NEXT_PUBLIC_BASE_PATH: '/neuro-atlas' } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

for (const id of ['neurotech', 'neuralink']) test(`${id} deep link opens sourced modal with complete points, partial rows clearly excluded and downloadable values`, async () => {
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  assert.equal(performanceUrl('https://example.org/neuro-atlas/field-velocity?view=all', `google-trends-${id}`), `https://example.org/neuro-atlas/field-velocity?view=all#google-trends-${id}`);
  const cleanup = await mount(React.createElement(GoogleTrends), `#google-trends-${id}`);
  try {
    const modal = document.querySelector('dialog[open]'); assert.ok(modal, 'Attention modal must open from a fresh URL');
    const group = JSON.parse(readFileSync('public/data/google-trends/google-trends.json', 'utf8')).groups.find(g => g.id === id);
    const expected = group.rows.filter(r => !r.partial).flatMap(row => row.values.map((value, i) => ({ date: row.date, value, term: group.terms[i] }))).filter(p => p.value !== null);
    const plotted = [...modal.querySelectorAll('[data-trend-point]')].map(p => ({ date: p.dataset.date, value: Number(p.dataset.value), term: p.dataset.term }));
    assert.deepEqual(plotted, expected);
    assert.equal(modal.querySelector('[data-date="2026-10-11"]'), null);
    assert.equal(modal.querySelectorAll('[data-trends-row]').length, 157);
    assert.match(modal.querySelector('[data-trends-row="2026-10-11"]').textContent, /Partial · excluded/);
    assert.match(modal.textContent, /sample/);
    assert.match(modal.textContent, /not topics/);
    assert.match(modal.textContent, /not zero searches/);
    assert.ok(modal.querySelector(`a[download][href$="/${id}.csv"]`));
    assert.ok(modal.querySelector('a[href^="https://trends.google.com/trends/explore?"]'));
    assert.match(modal.textContent, new RegExp(group.rawSha256));
    await act(async () => modal.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    assert.equal(document.activeElement, modal.querySelector('summary'), 'Closed source tables must not trap focus in hidden content');
    await act(async () => modal.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    assert.equal(document.activeElement, modal.querySelector('button[aria-label^="Close"]'));
    await click(modal.querySelector('button[aria-label^="Close"]'));
    assert.equal(document.querySelector('dialog[open]'), null);
  } finally { await cleanup(); }
});

test('Metrics renders two real 36-month attention graphs, latest complete readings and distinct normalization', async () => {
  assert.ok(existsSync('src/components/google-trends.tsx'), 'Google Trends section is missing');
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  globalThis.React = React;
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(GoogleTrends))).window.document;
  assert.match(doc.body.textContent, /Public attention/);
  assert.match(doc.body.textContent, /36 months/);
  assert.match(doc.body.textContent, /2023-10-15.*2026-10-15/);
  assert.match(doc.body.textContent, /not technical progress/);
  assert.match(doc.body.textContent, /Worldwide.*Web Search.*All categories/);
  assert.equal(doc.querySelectorAll('[data-trend-line]').length, 3);
  assert.equal(doc.querySelectorAll('[data-trends-latest="2026-10-04"]').length, 2);
  assert.match(doc.querySelector('[data-trends-card="neurotech"]').textContent, /neurotechnology: 7.*brain-computer interface: 3/);
  assert.match(doc.querySelector('[data-trends-card="neuralink"]').textContent, /Neuralink: 4/);
  assert.match(doc.body.textContent, /independently normalized/);
  assert.match(readFileSync('src/app/field-velocity/page.tsx', 'utf8'), /<GoogleTrends/);
});
