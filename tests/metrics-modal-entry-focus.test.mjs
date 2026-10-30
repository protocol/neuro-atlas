import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, settle } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;
for (const id of ['simultaneously-recorded-neurons', 'idea_vintage', 'latency_compression', 'google-trends-neurotech', 'google-trends-neuralink']) {
  test(`fresh ${id} modal focuses Close after its collapsed category becomes visible`, async () => {
    const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Page)), `#${id}`, win => {
      const focus = win.HTMLElement.prototype.focus;
      // Native browsers cannot focus descendants of a hidden category. jsdom can,
      // so enforce that actual constraint rather than granting impossible focus.
      win.HTMLElement.prototype.focus = function(options) {
        if (!this.closest('[hidden]')) focus.call(this, options);
      };
    });
    try {
      for (let i = 0; i < 8 && document.activeElement?.getAttribute('aria-label')?.startsWith('Close ') !== true; i++) await settle();
      const modal = document.querySelector('dialog[open]');
      assert.ok(modal);
      assert.equal(modal.closest('[hidden]'), null);
      assert.ok(document.activeElement === modal.querySelector('.pc-modal-header button'), `Expected Close focus; actual=${document.activeElement?.tagName}`);
    } finally { await cleanup(); }
  });
}
