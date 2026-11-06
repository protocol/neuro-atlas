import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
test('Trends exact source values are reachable by focus and tap in the shared floating popup', async () => {
 const cleanup = await mount(React.createElement(GoogleTrends,{flat:true,selection:['neurotech']}),'#google-trends-neurotech');
 try {
  const modal=document.querySelector('dialog');
  assert.ok(!modal.querySelector('[data-point-tooltip]'));
  const point=modal.querySelector('[data-trend-point]');
  assert.equal(point.getAttribute('tabindex'),'0','Weekly source marks are keyboard-reachable');
  await act(async()=>point.dispatchEvent(new window.FocusEvent('focusin',{bubbles:true})));
  const popup=modal.querySelector('[data-point-tooltip]');
  assert.ok(popup);
  assert.ok(popup.textContent.includes(point.dataset.date));
  assert.ok(popup.textContent.includes(point.dataset.term));
  assert.ok(popup.textContent.includes('Google Trends'));
  assert.ok(popup.querySelector('a[href^="https://trends.google.com"]'));
 } finally {await cleanup();}
});
