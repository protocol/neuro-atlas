import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('the catalog reserves one natural-content maximum independent of which panels are open', async () => {
  const cleanup = await mount(React.createElement(Page), '', window => {
    const style = window.document.createElement('style');
    style.textContent = 'article { border: 0px solid; padding: 0; }';
    window.document.head.append(style);
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      const isBody = this.hasAttribute('data-metric-card-body');
      const isFooter = this.hasAttribute('data-metric-card-footer');
      const peer = this.closest('[data-performance-card="idea_vintage"]');
      return { height: isBody ? (peer ? 520 : 400) : isFooter ? 40 : 0, width: 500 };
    };
  });
  try {
    const catalog = document.querySelector('.metrics-index');
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '560px');
    await click(document.querySelector('[data-collapse-metrics]'));
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '560px');
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '560px');
    const toggle = document.querySelector('[data-metric-toggle="Neurotech field engagement"]');
    await click(toggle);
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '560px');
    await click(toggle);
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '560px');
    for (const svg of catalog.querySelectorAll('svg')) assert.equal(svg.style.height, '', 'Never squeeze scientific SVGs to force a card height');
  } finally { await cleanup(); }
});

test('natural-size observers can grow and shrink all cards and ignore deliveries after cleanup', async () => {
  const previous = globalThis.ResizeObserver;
  const observers = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  };
  let height = 300;
  let cleanup;
  try {
    cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Page)), '', window => {
      const style = window.document.createElement('style');
      style.textContent = 'article { border: 0px solid; padding: 0; }';
      window.document.head.append(style);
      window.HTMLElement.prototype.getBoundingClientRect = function () {
        return { height: this.hasAttribute('data-metric-card-body') ? height : 40, width: 500 };
      };
    });
    const catalog = document.querySelector('.metrics-index');
    const observer = observers.findLast(observer => observer.targets.length === 48);
    assert.ok(observer, 'Watch natural content and footers for all 24 charts, not the equalized outer boxes');
    for (const next of [600, 250]) {
      height = next;
      await act(async () => observer.callback([]));
      assert.equal(catalog.style.getPropertyValue('--metric-card-height'), `${next + 40}px`);
    }
    await cleanup(); cleanup = null;
    assert.ok(observer.disconnected);
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '');
    await act(async () => observer.callback([]));
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '', 'An old observer cannot restore stale geometry');
  } finally {
    if (cleanup) await cleanup();
    if (previous === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = previous;
  }
});

test('equalized cards declare full-card overlay geometry and a separate footer stacking layer', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/components/draft-chart-panel.css', 'utf8') + readFileSync('src/components/draft-chart-plot.css', 'utf8');
    document.head.append(style);
    await click(document.querySelector('[data-expand-metrics]'));
    const cards = [...document.querySelectorAll('[data-metric-rail] article')].filter(card => card.querySelector('[data-metric-card-body]'));
    for (const card of cards) {
      assert.equal(getComputedStyle(card).position, 'relative');
      assert.equal(getComputedStyle(card.querySelector('[data-metric-card-footer]')).zIndex, '1');
      if (card.classList.contains('metric-chart-card')) assert.equal(getComputedStyle(card.querySelector('.draft-popout-card')).position, 'static');
    }
    const overlay = [...style.sheet.cssRules].find(rule => rule.selectorText === '.metric-chart-rail .pc-trigger::after');
    assert.equal(overlay.style.position, 'absolute');
    assert.equal(Number.parseFloat(overlay.style.inset), 0);
  } finally { await cleanup(); }
});

test('hidden chart regions remain measurable but inert and visually excluded in every panel state', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    document.head.append(style);
    for (const state of ['full', 'collapsed', 'search']) {
      if (state === 'collapsed') await click(document.querySelector('[data-collapse-metrics]'));
      if (state === 'search') await act(async () => {
        const input = document.querySelector('#metrics-search');
        input.value = 'H01'; input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const hidden = [...document.querySelectorAll('.metrics-index [hidden]')];
      if (state === 'full') {
        assert.equal(hidden.length, 0, 'The default rail has no featured-only hidden peers');
        continue;
      }
      assert.ok(hidden.length);
      for (const region of hidden) {
        assert.ok(region.hasAttribute('data-metric-size-hidden'), `${state}: hidden chart regions must have an explicit measurement contract`);
        assert.ok(region.hasAttribute('inert'), 'Invisible chart controls must not receive input');
        assert.equal(getComputedStyle(region).visibility, 'hidden');
      }
    }
  } finally { await cleanup(); }
});

test('sizing visibility overrides Tailwind base-layer hidden rules while retaining local rail stacking', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    assert.match(css, /@layer base\s*\{[\s\S]*?metric-chart-fragment\[data-metric-size-hidden\]\[hidden\]\s*\{\s*display:\s*contents\s*!important/);
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    assert.equal(getComputedStyle(document.querySelector('.metric-category-content')).position, 'relative');
    assert.equal(getComputedStyle(document.querySelector('.metric-chart-rail')).position, 'static');
  } finally { await cleanup(); }
});

test('full rows reserve card and scrollbar space without obsolete expansion-action space', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    const content = getComputedStyle(document.querySelector('.metric-category-content'));
    assert.equal(content.alignContent, 'start', 'Extra reserved space stays below the charts, not inside their geometry');
    assert.match(content.minHeight, /metric-card-height/);
    assert.match(content.minHeight, /metric-scrollbar-height/);
    assert.doesNotMatch(content.minHeight, /metric-more-row-space/);
    assert.doesNotMatch(css, /metric-more-row-space|metric-category-more/);
    assert.equal(document.querySelector('.metrics-index').style.getPropertyValue('--metric-scrollbar-height'), '0px', 'Use native measured scrollbar space (zero in jsdom)');
  } finally { await cleanup(); }
});

test('every real Metrics chart has separately measurable natural content and a footer', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    await click(document.querySelector('[data-expand-metrics]'));
    const cards = [...document.querySelectorAll('[data-metric-rail] article')].filter(card => card.querySelector('[data-draft-popout-trigger], .pc-trigger'));
    assert.equal(cards.length, 24);
    for (const card of cards) {
      assert.equal(card.querySelectorAll('[data-metric-card-body]').length, 1, card.textContent.slice(0, 100));
      assert.equal(card.querySelectorAll('[data-metric-card-footer]').length, 1);
      assert.ok(card.querySelector('[data-metric-card-footer] button[aria-label^="Copy link"]'));
    }
  } finally { await cleanup(); }
});


test('equal cards allocate spare space to one preview without feeding expansion back into natural sizing', async () => {
  const cleanup = await mount(React.createElement(Page), '', window => {
    const style = window.document.createElement('style');
    style.textContent = 'article { border: 0px solid; padding: 0; }';
    window.document.head.append(style);
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      const extra = Number(this.querySelector('[data-metric-preview-extra]')?.getAttribute('data-metric-preview-extra') ?? 0);
      const tall = this.closest('[data-performance-card="idea_vintage"]');
      return {height:this.hasAttribute('data-metric-card-body') ? (tall ? 520 : 400) + extra : 40,width:500};
    };
  });
  try {
    const catalog=document.querySelector('.metrics-index');
    const bodies=[...catalog.querySelectorAll('[data-metric-card-body]')];
    assert.equal(bodies.length,24);
    assert.equal(catalog.querySelectorAll('[data-metric-preview-extra]').length,24,'One fillable preview per unopened card');
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'),'560px');
    for(const body of bodies) {
      const extra=Number.parseFloat(body.closest('article').style.getPropertyValue('--metric-preview-extra'));
      assert.equal(extra,body.closest('[data-performance-card="idea_vintage"]') ? 0 : 120);
    }
    await click(document.querySelector('[data-collapse-metrics]'));
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'),'560px','Expansion is subtracted before choosing a natural maximum');
  } finally {await cleanup();}
});

test('a CSS height cap keeps rail cards compact and marks only taller previews as clipped', async () => {
  const cleanup = await mount(React.createElement(Page), '', window => {
    const style = window.document.createElement('style');
    style.textContent = 'article { border: 0px solid; padding: 0; } .metrics-index { --metric-card-max-height: 450px; }';
    window.document.head.append(style);
    window.HTMLElement.prototype.getBoundingClientRect = function () {
      const isBody = this.hasAttribute('data-metric-card-body');
      const isFooter = this.hasAttribute('data-metric-card-footer');
      const peer = this.closest('[data-performance-card="idea_vintage"]');
      return { height: isBody ? (peer ? 520 : 400) : isFooter ? 40 : 0, width: 500 };
    };
  });
  try {
    const catalog = document.querySelector('.metrics-index');
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '450px', 'The cap wins over the 560px natural maximum');
    const tall = document.querySelector('[data-performance-card="idea_vintage"]');
    assert.equal(tall.hasAttribute('data-metric-clipped'), true, 'Only the taller preview fades under the cap');
    assert.equal(tall.style.getPropertyValue('--metric-preview-extra'), '0', 'A clipped card is never padded');
    const others = [...catalog.querySelectorAll('[data-metric-rail] article')].filter(card => card !== tall && card.querySelector('[data-metric-card-body]'));
    assert.ok(others.length > 10);
    for (const card of others) {
      assert.equal(card.hasAttribute('data-metric-clipped'), false);
      assert.equal(card.style.getPropertyValue('--metric-preview-extra'), '10', '400 body + 40 footer fills to the 450px cap');
    }
  } finally { await cleanup(); }
});
