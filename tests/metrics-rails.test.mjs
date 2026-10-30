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

test('thin dividers separate the five sections even when every section is headline-only', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const stylesheet = addStyles();
    const divider = [...stylesheet.sheet.cssRules].find(rule => rule.selectorText?.includes('~ .metric-category'));
    assert.ok(divider, 'Dividers must be on section siblings, outside the collapsible charts');
    assert.equal(divider.style.getPropertyValue('border-top'), '1px solid var(--border)');
    const categories = [...document.querySelectorAll('[data-metrics-category]')];
    for (const headlineOnly of [false, true]) {
      if (headlineOnly) await click(document.querySelector('[data-collapse-metrics]'));
      assert.equal(categories[0].matches(divider.selectorText), false, 'No rule before the first section');
      for (const category of categories.slice(1)) {
        assert.equal(category.matches(divider.selectorText), true);
        assert.equal(getComputedStyle(category).paddingTop, '24px');
        if (headlineOnly) assert.equal(category.dataset.metricState, 'collapsed');
      }
    }
    // jsdom cannot compute border shorthand containing a theme variable; native QA measures its paint.
    categories[0].hidden = true;
    assert.equal(categories[1].matches(divider.selectorText), false, 'No orphan rule before the first search result');
    assert.equal(categories[2].matches(divider.selectorText), true);
  } finally { await cleanup(); }
});


test('the large circular expansion button is centered in the blank space beside the featured chart', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const stylesheet = addStyles();
    const categories = [...document.querySelectorAll('[data-metrics-category]')];
    for (const category of categories) {
      const more = category.querySelector('[data-metric-more]');
      const style = getComputedStyle(more);
      assert.equal(more.textContent, 'show more charts');
      assert.equal(style.borderRadius, '50%');
      assert.equal(style.aspectRatio, '1 / 1');
      assert.equal(style.width, '144px', 'Larger than the previous compact 44px action');
      assert.equal(style.gridColumn, '2');
      assert.equal(style.gridRow, '1');
      assert.equal(style.alignSelf, 'center');
      assert.equal(style.justifySelf, 'center');
    }
    const narrow = [...stylesheet.sheet.cssRules].find(rule => rule.conditionText === '(max-width: 560px)' && [...rule.cssRules].some(rule => rule.selectorText === '.metric-category-content'));
    const narrowAction = [...narrow.cssRules].find(rule => rule.selectorText?.includes('[data-metric-state="preview"]') && rule.selectorText.endsWith('.metric-category-more'));
    assert.ok(narrowAction, 'If no room beside the full narrow chart, keep a centered circle below it instead of overflowing');
    assert.equal(narrowAction.style.getPropertyValue('grid-column'), '1 / -1');
    assert.equal(narrowAction.style.getPropertyValue('grid-row'), '2');
    await click(categories[0].querySelector('[data-metric-more]'));
    const collapse = categories[0].querySelector('[data-metric-more]');
    assert.equal(collapse.textContent, 'show only featured');
    assert.equal(collapse.closest('[data-metric-rail]'), null);
    assert.equal(getComputedStyle(collapse).gridColumn, '1 / -1');
  } finally { await cleanup(); }
});


test('category collapse resets its rail and recovers focus before hiding the offscreen peer', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const category = document.querySelector('[data-metrics-category="Mapping Scale"]');
    const rail = category.querySelector('[data-metric-rail]');
    const more = category.querySelector('[data-metric-more]');
    const toggle = category.querySelector('[data-metric-toggle]');
    for (const control of [more, toggle]) {
      await click(more);
      const peer = [...rail.querySelectorAll('[data-draft-popout-trigger]')].at(-1);
      rail.scrollLeft = 900;
      await act(async () => peer.focus({ preventScroll: true }));
      assert.equal(document.activeElement, peer);
      await click(control);
      assert.equal(rail.scrollLeft, 0, 'The featured tile must be visible on collapse and the next expansion');
      assert.equal(document.activeElement, control, 'Never leave keyboard focus on a hidden peer');
      if (control === toggle) await click(toggle);
      assert.equal(category.dataset.metricState, 'preview');
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
  } finally { await cleanup(); }
});


test('keyboard focus and modal-close restoration reveal their full tile using only local horizontal scroll', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const category = document.querySelector('[data-metrics-category="Mapping Scale"]');
    await click(category.querySelector('[data-metric-more]'));
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
