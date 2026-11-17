import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act, useState } from 'react';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
import { MobileBar, SideNav } from '../src/components/site-nav.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;

async function openNavigation() {
  let navigate;
  let resize;
  function App() {
    const [pathname, setPathname] = useState('/milestones');
    navigate = setPathname;
    return React.createElement(PathnameContext.Provider, { value: pathname }, React.createElement(MobileBar), React.createElement(SideNav));
  }
  const cleanup = await mount(React.createElement(App), '', window => {
    globalThis.self = window;
    const listeners = new Set();
    let desktop = false;
    window.matchMedia = query => ({ get matches() { return desktop; }, media: query, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) });
    resize = () => { desktop = true; for (const listener of listeners) listener({ matches: true }); };
    window.HTMLDialogElement.prototype.close = function () { if (this.open) { this.open = false; this.dispatchEvent(new window.Event('close')); } };
  });
  return { cleanup, navigate: path => act(async () => navigate(path)), resize: () => act(async () => resize()) };
}

test('mobile hamburger opens a labeled modal navigation and restores focus on native Escape', async () => {
  const nav = await openNavigation();
  try {
    const trigger = document.querySelector('button[aria-label="Open navigation"]');
    assert.ok(trigger, 'mobile nav replaces the permanently visible horizontal tabs with a hamburger');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    const menu = document.getElementById(trigger.getAttribute('aria-controls'));
    assert.equal(menu.tagName, 'DIALOG', 'native modal supplies background inertness and keyboard focus containment');
    assert.equal(menu.open, false);
    await act(async () => trigger.focus());
    await click(trigger);
    assert.equal(menu.open, true);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.ok(menu.contains(document.activeElement), 'opening transfers focus into the menu');
    const label = document.getElementById(menu.getAttribute('aria-labelledby'));
    assert.equal(label.textContent, 'Navigation');
    assert.ok(menu.querySelector('a[href="/milestones"][aria-current="page"]'));
    await act(async () => {
      // JSDOM lacks the browser's native Escape default action. Reproduce only
      // that platform behavior; production handlers and native QA remain real.
      const event = new Event('cancel', { cancelable: true });
      if (menu.dispatchEvent(event)) menu.close();
    });
    assert.equal(menu.open, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.ok(document.activeElement === trigger, 'Escape returns focus to the hamburger');
    assert.ok(document.querySelector('aside nav a[href="/funding"]'), 'desktop navigation is retained');
  } finally { await nav.cleanup(); }
});


test('mobile navigation closes on a persistent-layout route change', async () => {
  const nav = await openNavigation();
  try {
    const trigger = document.querySelector('button[aria-label="Open navigation"]');
    await click(trigger);
    assert.ok(document.querySelector('dialog').open);
    await nav.navigate('/field-velocity');
    assert.equal(document.querySelector('dialog').open, false, 'back/forward or programmatic routing dismisses an open menu');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  } finally { await nav.cleanup(); }
});


test('resizing to desktop releases the mobile modal and its page lock', async () => {
  const nav = await openNavigation();
  try {
    const trigger = document.querySelector('button[aria-label="Open navigation"]');
    await click(trigger);
    assert.ok(document.querySelector('dialog').open);
    await nav.resize();
    assert.equal(document.querySelector('dialog').open, false, 'a hidden mobile modal must not keep the desktop page inert');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  } finally { await nav.cleanup(); }
});
