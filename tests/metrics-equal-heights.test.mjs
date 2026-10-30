import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('the catalog equalizes visible natural content without imposing a fixed SVG height', async () => {
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
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '440px');
    await click(document.querySelector('[data-expand-metrics]'));
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '560px');
    await click(document.querySelector('[data-metric-more="Neurotech Engagement"]'));
    assert.equal(catalog.style.getPropertyValue('--metric-card-height'), '440px');
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
    const observer = observers.findLast(observer => observer.targets.length === 40);
    assert.ok(observer, 'Watch natural content and footers for all 20 charts, not the equalized outer boxes');
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

test('every real Metrics chart has separately measurable natural content and a footer', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    await click(document.querySelector('[data-expand-metrics]'));
    const cards = [...document.querySelectorAll('[data-metric-rail] article')].filter(card => card.querySelector('[data-draft-popout-trigger], .pc-trigger'));
    assert.equal(cards.length, 20);
    for (const card of cards) {
      assert.equal(card.querySelectorAll('[data-metric-card-body]').length, 1, card.textContent.slice(0, 100));
      assert.equal(card.querySelectorAll('[data-metric-card-footer]').length, 1);
      assert.ok(card.querySelector('[data-metric-card-footer] button[aria-label^="Copy link"]'));
    }
  } finally { await cleanup(); }
});
