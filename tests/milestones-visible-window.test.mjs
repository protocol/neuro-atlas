import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import MilestonesPageModule from '../src/app/milestones/page.tsx';
const MilestonesPage = MilestonesPageModule.default ?? MilestonesPageModule;

globalThis.React = React;
// Native/raw only: the visible plot horizon is not the wider source inventory.
const rows = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url), 'utf8'));
const knownYears = new Set(rows.filter(row => row.date).map(row => row.date.slice(0, 4)));
const headerContract = html => {
  const dom = new JSDOM(html);
  try {
    const hero = dom.window.document.querySelector('section');
    assert.ok(hero, 'actual page hero');
    assert.match(hero.textContent, /2024–26visible timeline years/);
    assert.doesNotMatch(hero.textContent, /2022–26years on the timeline/);
    assert.match(hero.textContent, new RegExp(`${rows.length}tracked events`));
    const metadata = [...hero.firstElementChild.children].filter(element => element.tagName === 'SPAN');
    assert.equal(metadata.at(-1).textContent, `${knownYears.size} years`, 'undated records do not add a source-coverage year');
    const strip = dom.window.document.querySelector('.milestone-year-strip');
    assert.ok(strip, 'actual timeline year controls');
    const visibleYears = [...strip.children].map(element => {
      const label = element.getAttribute('aria-label') ?? element.querySelector('[aria-label*=" timeline."]')?.getAttribute('aria-label');
      const match = /^(?:Focus )?(\d{4})(?::| timeline\.)/.exec(label ?? '');
      assert.ok(match, 'every plot-year column has its real accessible year');
      return Number(match[1]);
    });
    assert.deepEqual(visibleYears, [2024, 2025, 2026], 'badge agrees with actual plot-year controls, not source-coverage years');
  } finally { dom.window.close(); }
};

test('Milestones page badge matches the native 2024–26 plotting window while source coverage counts only dated years', async () => {
  assert.ok(rows.some(row => !row.date), 'real undated disclosure remains in the raw source inventory');
  assert.ok([...knownYears].some(year => Number(year) < 2024), 'raw source coverage is wider than the visible plotting horizon');
  const html = renderToStaticMarkup(await MilestonesPage());
  headerContract(html);
  for (const [before, after] of [['2024–26', '2022–26'], ['visible timeline years', 'years on the timeline'], [`${knownYears.size} years`, `${knownYears.size + 1} years`]]) {
    assert.ok(html.includes(before), 'negative control must mutate real rendered output: ' + before);
    assert.throws(() => headerContract(html.replace(before, after)), assert.AssertionError, 'regression rejects: ' + after);
  }
});
