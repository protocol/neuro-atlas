import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { mount, click } from './modal-helpers.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

async function renderCards(props = {}) {
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  globalThis.React = React;
  return new JSDOM(renderToStaticMarkup(React.createElement(GoogleTrends, props))).window.document;
}

test('flat Trends returns only the selected article roots for the parent chart grid', async () => {
  for (const [selection, ids] of [[undefined, ['neurotech', 'neuralink']], [['neuralink'], ['neuralink']], [[], []]]) {
    const doc = await renderCards({ flat: true, selection });
    assert.deepEqual([...doc.body.children].map(node => [node.tagName, node.dataset.trendsCard]), ids.map(id => ['ARTICLE', id]));
    assert.equal(doc.querySelector('section, header, .pc-grid, footer'), null, 'The containing Metrics section owns all group chrome and layout');
  }
});

test('standalone Trends retains its section anchor without repeating subgroup copy or snapshot chrome', async () => {
  for (const selection of [undefined, ['neuralink']]) {
    const doc = await renderCards({ selection });
    const section = doc.querySelector('section');
    assert.equal(section.id, selection ? 'google-trends-neuralink-section' : 'google-trends');
    assert.equal(section.getAttribute('aria-label'), 'Google Trends search interest');
    assert.equal(section.querySelector('header, h2'), null);
    assert.deepEqual([...section.children].map(node => node.className), ['pc-grid']);
    assert.doesNotMatch(section.textContent, /Public attention · Google Trends|Snapshot captured|not a live feed|Incomplete weeks are excluded|Expand a chart/);
    assert.equal(section.querySelectorAll('[data-trends-card]').length, selection ? 1 : 2);
  }
});

test('each Trends preview has one Copy link action without a duplicate Direct link', async () => {
  const doc = await renderCards({ flat: true });
  for (const card of doc.querySelectorAll('[data-trends-card]')) {
    const share = card.querySelector('.pc-share');
    assert.equal(share.querySelectorAll('button').length, 1);
    assert.equal(share.querySelector('button').textContent, 'Copy link');
    assert.equal(share.querySelector('a'), null);
    assert.equal(card.querySelector('input'), null, 'A fallback URL is revealed only after an actual copy failure');
  }
});

test('denied or missing clipboard reveals a selectable native URL fallback only until Copy link succeeds', async () => {
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  globalThis.React = React;
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard');
  try {
    for (const id of ['neurotech', 'neuralink']) for (const modal of [false, true]) {
      Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: modal ? undefined : { writeText: async () => { throw new Error('Permission denied'); } } });
      const cleanup = await mount(React.createElement(GoogleTrends, { flat: true, selection: [id] }), modal ? `#google-trends-${id}` : '', window => {
        // React was imported before jsdom; its legacy input-event feature check needs these no-op hooks.
        window.HTMLInputElement.prototype.attachEvent = () => {};
        window.HTMLInputElement.prototype.detachEvent = () => {};
      });
      try {
        const scope = document.querySelector(modal ? 'dialog[open]' : '[data-trends-card]');
        const button = scope.querySelector('button[aria-label^="Copy link to"]');
        const share = button.parentElement;
        const title = scope.querySelector(modal ? 'h2' : 'h3').textContent;
        assert.equal(share.querySelector('input'), null);
        await click(button);
        const fallback = share.querySelector('input');
        assert.ok(fallback, 'Denied copy must reveal a native, keyboard-selectable URL field');
        assert.equal(fallback.readOnly, true);
        assert.equal(fallback.getAttribute('aria-label'), `Chart URL for ${title}`);
        assert.equal(fallback.value, `https://atlas.example/field-velocity?review=1#google-trends-${id}`);
        assert.match(share.querySelector('[role=status]').textContent, /select and copy.*URL/i);
        await act(async () => fallback.focus());
        assert.equal(document.activeElement, fallback);
        assert.equal(fallback.selectionStart, 0);
        assert.equal(fallback.selectionEnd, fallback.value.length);
        assert.equal(share.querySelector('a'), null, 'No duplicate direct-link action is restored after denial');
        let copied;
        Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText: async url => { copied = url; } } });
        await click(button);
        assert.equal(copied, fallback.value);
        assert.equal(share.querySelector('input'), null);
        assert.equal(share.querySelector('[role=status]').textContent, 'Link copied');
        assert.equal(window.location.hash, modal ? `#google-trends-${id}` : '', 'Copying must not navigate');
      } finally { await cleanup(); }
    }
  } finally {
    if (original) Object.defineProperty(globalThis.navigator, 'clipboard', original);
    else delete globalThis.navigator.clipboard;
  }
});

test('flat Trends preserves trigger focus, chart hashes, dismissal and history through StrictMode', async () => {
  const { GoogleTrends } = await import('../src/components/google-trends.tsx');
  globalThis.React = React;
  const waitForModal = async open => {
    for (let attempt = 0; attempt < 50 && !!document.querySelector('dialog[open]') !== open; attempt++) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    }
    assert.equal(!!document.querySelector('dialog[open]'), open);
  };
  for (const id of ['neurotech', 'neuralink']) {
    const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(GoogleTrends, { flat: true, selection: [id] })));
    try {
      const trigger = document.querySelector('button[aria-haspopup="dialog"]');
      await act(async () => trigger.focus());
      await click(trigger);
      assert.equal(window.location.hash, `#google-trends-${id}`);
      let modal = document.querySelector('dialog[open]');
      assert.ok(modal);
      assert.equal(trigger.getAttribute('aria-expanded'), 'true');
      const close = modal.querySelector('button[aria-label^="Close"]');
      assert.equal(document.activeElement, close);
      await click(close);
      await waitForModal(false);
      assert.equal(document.activeElement, trigger);
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(window.location.href, 'https://atlas.example/field-velocity?review=1');
      await act(async () => window.history.forward());
      await waitForModal(true);
      modal = document.querySelector('dialog[open]');
      assert.equal(document.activeElement, modal.querySelector('button[aria-label^="Close"]'));
      await act(async () => modal.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      await waitForModal(false);
      assert.equal(document.activeElement, trigger);
    } finally { await cleanup(); }
  }
});
