import assert from 'node:assert/strict';
import { act } from 'react';

export function brainScaleClock(reduced = false, width) {
  let time = 0, nextId = 0;
  const frames = new Map(), listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  return {
    configure(window) {
      window.matchMedia = query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; };
      window.performance.now = () => time;
      globalThis.requestAnimationFrame = window.requestAnimationFrame = fn => { frames.set(++nextId, fn); return nextId; };
      globalThis.cancelAnimationFrame = window.cancelAnimationFrame = id => frames.delete(id);
      if (width) globalThis.ResizeObserver = class {
        observe() { this.callback([{ contentRect: { width } }]); }
        disconnect() {}
        constructor(callback) { this.callback = callback; }
      };
    },
    async advance(ms) {
      time += ms;
      const pending = [...frames.values()]; frames.clear();
      await act(async () => { for (const callback of pending) callback(time); });
    },
    async reduce(value) { await act(async () => { media.matches = value; for (const fn of listeners) fn(media); }); },
    get pending() { return frames.size; },
    get subscriptions() { return listeners.size; },
  };
}
