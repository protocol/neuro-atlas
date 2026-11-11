import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click, settle } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('recording-hours readers can open existing participant evidence and return without changing either series', async () => {
 const cleanup = await mount(React.createElement(Page), '#neural-recording-hours-selected-datasets');
 try {
  const hours = document.querySelector('dialog[open]');
  assert.equal(hours.querySelectorAll('[data-source-observation]').length, 12);
  const link = hours.querySelector('[data-related-bci-participants]');
  assert.ok(link, 'Hours detail links to the existing separately reported participant cohorts');
  assert.equal(link.getAttribute('href'), '#implanted-bci-participants-over-time');
  await click(link); await settle();
  const participants = document.querySelector('dialog[open]');
  assert.match(participants.querySelector('h2').textContent, /Implanted BCI participants over time/);
  assert.equal(document.querySelectorAll('dialog[open]').length, 1);
  assert.equal(window.location.hash, '#implanted-bci-participants-over-time');
  assert.match(participants.textContent, /cohorts overlap/i);
  await act(async () => window.history.back());
  for (let i = 0; i < 50 && !document.querySelector('dialog[open] [data-related-bci-participants]'); i++) await settle();
  assert.equal(document.querySelector('dialog[open]').querySelectorAll('[data-source-observation]').length, 12);
 } finally { await cleanup(); }
});
