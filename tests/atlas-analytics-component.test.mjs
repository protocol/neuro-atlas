import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React, { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('actual app layout mounts consent UI and footer settings, never a gate insertion', async () => {
  const layout = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
  const footer = await readFile(new URL('../src/components/site-footer.tsx', import.meta.url), 'utf8');
  assert.match(layout, /<AtlasAnalytics>/);
  assert.match(footer, /<AtlasCookieSettings\s*\/>/);
});

test('mounted real consent component is accessible, honors choices/settings and survives StrictMode without duplicates', async () => {
  const { AtlasAnalytics, AtlasCookieSettings } = await import('../src/components/atlas-analytics.tsx');
  const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: 'https://www.plneuro.xyz/neuro-atlas' });
  const old = { window: globalThis.window, document: globalThis.document };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  dom.window.fetch = async () => ({ ok: true, json: async () => ({ eligible: true, measurementId: 'G-ATLAS12345', consentRequired: true }) });
  const root = createRoot(document.getElementById('root'));
  try {
    await act(async () => { root.render(React.createElement(StrictMode, null, React.createElement(AtlasAnalytics, null, React.createElement(AtlasCookieSettings)))); });
    const dialog = document.querySelector('[role=dialog]');
    assert.ok(dialog);
    assert.equal(dialog.getAttribute('aria-label'), 'Analytics cookies');
    assert.equal(dialog.querySelector('a').href, 'https://www.plneuro.xyz/privacy-policy/');
    const choices = [...dialog.querySelectorAll('button')];
    assert.deepEqual(choices.map(button => button.textContent), ['Reject', 'Accept']);
    assert.equal(choices[0].className, choices[1].className);
    assert.equal(document.querySelector('script'), null);
    await act(async () => choices[1].click());
    const script = document.querySelector('script');
    assert.ok(script);
    await act(async () => script.dispatchEvent(new dom.window.Event('load')));
    assert.equal(dom.window.dataLayer.filter(args => args[0] === 'event').length, 1);
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Cookie settings').click());
    await act(async () => [...document.querySelector('[role=dialog]').querySelectorAll('button')][0].click());
    assert.equal(dom.window['ga-disable-G-ATLAS12345'], true);
    assert.equal(dom.window.localStorage.getItem('pl-ga-consent'), 'denied');
    assert.equal(document.querySelectorAll('script').length, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, old);
  }
});
