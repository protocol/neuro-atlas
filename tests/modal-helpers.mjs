import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
export async function mount(node, hash = '', configureWindow = () => {}) {
  const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: 'https://atlas.example/field-velocity?review=1' + hash, pretendToBeVisual: true });
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle']) globalThis[key] = dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  dom.window.scrollTo = () => { throw new Error('Modal navigation must not scroll the page'); };
  dom.window.HTMLElement.prototype.scrollIntoView = () => { throw new Error('Modal navigation must not scroll a card'); };
  configureWindow(dom.window);
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(node));
  return async () => { await act(async () => root.unmount()); dom.window.close(); };
}
export const click = async el => { assert.ok(el, 'click target exists'); await act(async () => el.click()); };
export const settle = async () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
