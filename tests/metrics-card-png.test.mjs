import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { ChartModal } from '../src/components/chart-modal.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('an off-screen ChartModal is an inert, hidden export host rather than a dialog', () => {
  const html = renderToStaticMarkup(React.createElement(ChartModal, { id: 'fixture', title: 'Fixture', returnFocus: { current: null }, offscreen: true }, React.createElement('svg')));
  assert.doesNotMatch(html, /<dialog/);
  assert.match(html, /data-chart-export-host="fixture"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /inert=""/);
});

test('every rail card offers Copy PNG next to Copy link', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    const cards = [...document.querySelectorAll('[data-metric-rail] article')];
    assert.ok(cards.length >= 20);
    for (const card of cards) {
      const footer = card.querySelector('[data-metric-card-footer]');
      const png = footer.querySelector('[data-copy-card-png]');
      assert.ok(png, card.textContent.slice(0, 60));
      assert.equal(png.textContent, 'Copy PNG');
      assert.match(png.getAttribute('aria-label'), /^Copy PNG: /);
      assert.ok(footer.querySelector('.metric-card-scope')?.textContent.trim(), 'Every card footer carries its grey source line');
    }
  } finally { await cleanup(); }
});

test('card Copy PNG mounts the pop-out chart off-screen, never opens a dialog or changes the URL, and cleans up', async () => {
  const writes = [];
  const previousItem = globalThis.ClipboardItem;
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.ClipboardItem = class { constructor(data) { this.data = data; } };
  Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { write: async items => { writes.push(items); } } }, configurable: true });
  const cleanup = await mount(React.createElement(Page));
  try {
    const hosts = [];
    const observer = new window.MutationObserver(() => {
      const host = document.querySelector('[data-chart-export-host]');
      if (host && !hosts.includes(host)) hosts.push(host);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    await click(document.querySelector('[data-copy-card-png="idea_vintage"]'));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
    observer.disconnect();
    assert.equal(hosts.length, 1, 'The chart mounts once for export');
    assert.equal(hosts[0].getAttribute('aria-hidden'), 'true');
    assert.ok(hosts[0].hasAttribute('inert'));
    assert.equal(document.querySelector('[data-chart-export-host]'), null, 'The export mount is removed afterwards');
    assert.equal(document.querySelector('dialog'), null, 'No pop-out opens');
    assert.equal(window.location.hash, '', 'The URL is untouched');
    assert.equal(writes.length, 1, 'One clipboard write starts within the click');
    assert.deepEqual(Object.keys(writes[0][0].data).slice(0, 2), ['image/png', 'text/plain']);
  } finally {
    await cleanup();
    if (previousItem === undefined) delete globalThis.ClipboardItem; else globalThis.ClipboardItem = previousItem;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
  }
});
