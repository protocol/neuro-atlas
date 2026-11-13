import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click, settle } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
function addStyles() {
  const style = document.createElement('style');
  style.textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
  document.head.append(style);
  return style;
}

test('each of the five sections is its own bordered chapter, separated by spacing even when headline-only', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const stylesheet = addStyles();
    const rules = [...stylesheet.sheet.cssRules];
    assert.equal(rules.some(rule => /~ \.metric-category(?![\w-])/.test(rule.selectorText ?? '')), false, 'Chapters replace sibling divider rules');
    const chapter = rules.find(rule => rule.selectorText === '.metric-category');
    assert.equal(chapter.style.getPropertyValue('border'), '1px solid var(--border)');
    assert.equal(chapter.style.getPropertyValue('border-radius'), '14px');
    const categories = [...document.querySelectorAll('[data-metrics-category]')];
    for (const headlineOnly of [false, true]) {
      if (headlineOnly) await click(document.querySelector('[data-collapse-metrics]'));
      categories.forEach((category, index) => {
        assert.equal(getComputedStyle(category).marginBottom, '14px');
        const badge = category.querySelector('.metric-category-index');
        assert.equal(badge?.textContent, String(index + 1).padStart(2, '0'), 'Chapters are numbered in reading order');
        assert.equal(badge.getAttribute('aria-hidden'), 'true', 'The number is visual; the toggle name stays the group name');
        assert.ok(category.style.getPropertyValue('--metric-tone'), 'Every chapter declares its signature tone');
        if (headlineOnly) assert.equal(category.dataset.metricState, 'collapsed');
      });
    }
  } finally { await cleanup(); }
});


test('full rails have no chart expansion action or obsolete circular-action layout', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    addStyles();
    const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    assert.doesNotMatch(css, /metric-category-more|metric-more-row-space|data-metric-state="preview"/);
    const categories = [...document.querySelectorAll('[data-metrics-category]')];
    for (const category of categories) {
      assert.equal(category.dataset.metricState, 'full');
      assert.equal(category.querySelector('[data-metric-more]'), null);
      const content = category.querySelector('.metric-category-content');
      assert.deepEqual([...content.children], [category.querySelector('[data-metric-rail]')], 'No blank action slot beside or below the rail');
      assert.ok([...content.querySelectorAll('article')].filter(card => !card.closest('[hidden]')).length > 1);
    }
    assert.doesNotMatch(document.querySelector('.metrics-index').textContent, /show more charts|show only featured/i);
  } finally { await cleanup(); }
});


test('category collapse resets its rail and recovers focus before hiding the offscreen peer', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const category = document.querySelector('[data-metrics-category="Mapping Scale"]');
    const rail = category.querySelector('[data-metric-rail]');
    const toggle = category.querySelector('[data-metric-toggle]');
    const cards = [...rail.querySelectorAll('article')];
    for (let cycle = 0; cycle < 2; cycle++) {
      const peer = [...rail.querySelectorAll('[data-draft-popout-trigger]')].at(-1);
      rail.scrollLeft = 900;
      await act(async () => peer.focus({ preventScroll: true }));
      assert.equal(document.activeElement, peer);
      await click(toggle);
      assert.equal(category.dataset.metricState, 'collapsed');
      assert.equal(rail.scrollLeft, 0, 'The first tile must be visible on collapse and the next expansion');
      assert.equal(document.activeElement, toggle, 'Never leave keyboard focus on a hidden peer');
      assert.ok(peer.closest('[hidden]'));
      await click(toggle);
      assert.equal(category.dataset.metricState, 'full');
      assert.deepEqual([...rail.querySelectorAll('article')].filter(card => !card.closest('[hidden]')), cards);
      assert.equal(rail.scrollLeft, 0);
    }
  } finally { await cleanup(); }
});


test('Collapse all resets every horizontal position and leaves focus on its visible page action', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    await click(document.querySelector('[data-expand-metrics]'));
    const rails = [...document.querySelectorAll('[data-metric-rail]')];
    for (const rail of rails) rail.scrollLeft = 800;
    const peer = [...rails[2].querySelectorAll('[data-draft-popout-trigger]')].at(-1);
    await act(async () => peer.focus({ preventScroll: true }));
    const collapse = document.querySelector('[data-collapse-metrics]');
    await click(collapse);
    assert.deepEqual(rails.map(rail => rail.scrollLeft), [0, 0, 0, 0, 0]);
    assert.equal(document.activeElement, collapse);
    assert.equal(collapse.closest('[hidden]'), null);
    await click(document.querySelector('[data-expand-metrics]'));
    assert.deepEqual(rails.map(rail => rail.scrollLeft), [0, 0, 0, 0, 0]);
    assert.ok([...document.querySelectorAll('[data-metrics-category]')].every(category => category.dataset.metricState === 'full'));
  } finally { await cleanup(); }
});


test('keyboard focus and modal-close restoration reveal their full tile using only local horizontal scroll', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const category = document.querySelector('[data-metrics-category="Mapping Scale"]');
    const rail = category.querySelector('[data-metric-rail]');
    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 600 });
    rail.getBoundingClientRect = () => ({ left: 100, right: 700, width: 600 });
    const tiles = [...rail.querySelectorAll('article')].filter(tile => !tile.closest('[hidden]'));
    for (const [index, tile] of tiles.entries()) tile.getBoundingClientRect = () => ({ left: 100 + index * 416 - rail.scrollLeft, right: 500 + index * 416 - rail.scrollLeft, width: 400 });
    const featured = tiles[0].querySelector('[data-draft-popout-trigger]');
    const peer = tiles[1].querySelector('[data-draft-popout-trigger]');
    await act(async () => peer.focus({ preventScroll: true }));
    assert.equal(document.activeElement, peer);
    assert.equal(rail.scrollLeft, 216, 'Reveal the partially visible focused card without moving the document');
    rail.scrollLeft = 900;
    await act(async () => featured.focus({ preventScroll: true }));
    assert.equal(rail.scrollLeft, 0, 'Backward tabbing brings the first card back');
    await act(async () => peer.focus({ preventScroll: true }));
    await click(peer);
    const close = tiles[1].querySelector('dialog[open] .pc-modal-header button');
    assert.ok(close);
    rail.scrollLeft = 0;
    await act(async () => close.focus({ preventScroll: true }));
    assert.equal(rail.scrollLeft, 0, 'Top-layer dialog focus must not move the background rail');
    await click(close);
    await settle(); await settle();
    assert.equal(document.activeElement, peer);
    assert.equal(rail.scrollLeft, 216, 'Restored focus is visible, not merely connected offscreen');
    // The mount helper throws on window.scrollTo and scrollIntoView: neither is a valid focus-repair shortcut.
  } finally { await cleanup(); }
});

test('pointer-pressed focus does not move a peer out from under the pending click', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const category = document.querySelector('[data-metrics-category="Mapping Scale"]');
    const rail = category.querySelector('[data-metric-rail]');
    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 600 });
    rail.getBoundingClientRect = () => ({ left: 100, right: 700, width: 600 });
    const tiles = [...rail.querySelectorAll('article')].filter(tile => !tile.closest('[hidden]'));
    for (const [index, tile] of tiles.entries()) tile.getBoundingClientRect = () => ({ left: 100 + index * 416 - rail.scrollLeft, right: 500 + index * 416 - rail.scrollLeft, width: 400 });
    const peer = tiles[1].querySelector('[data-draft-popout-trigger]');
    const matches = peer.matches.bind(peer);
    let pressed = true;
    peer.matches = selector => selector === ':active' ? pressed : matches(selector);
    await act(async () => peer.focus({ preventScroll: true }));
    assert.equal(document.activeElement, peer);
    assert.equal(rail.scrollLeft, 0, 'Pointer focus must not relocate the click target between down and up');
    pressed = false;
    await act(async () => { peer.blur(); peer.focus({ preventScroll: true }); });
    assert.equal(rail.scrollLeft, 216, 'Ordinary keyboard/programmatic focus still reveals the full tile');
  } finally { await cleanup(); }
});
