import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { mount, click } from './modal-helpers.mjs';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { atlasPath } from '../src/lib/atlas-path.ts';

globalThis.React = React;
const graphPage = graphModule.default.default ?? graphModule.default;
const route = '/field-velocity/dashboard';
const bitrate = 'bci-information-transfer-over-time';

async function dashboard(props = {}, setup) {
  const mod = await import('../src/app/field-velocity/dashboard/page.tsx');
  const Page = mod.default.default ?? mod.default;
  return mount(React.createElement(React.StrictMode, null, React.createElement(Page, props)), '', win => {
    win.history.replaceState({ keep: true }, '', atlasPath(route) + (props.search ?? ''));
    setup?.(win);
  });
}

test('the graph page adds its real plotted chart to the dashboard route', async () => {
  const cleanup = await mount(await graphPage({ params: Promise.resolve({ slug: bitrate }) }));
  let href;
  try {
    href = document.querySelector('[data-add-to-dashboard]')?.getAttribute('href');
    assert.equal(href, atlasPath(route) + '?add=' + bitrate, 'graph page offers a real Add to dashboard link');
  } finally { await cleanup(); }
  const close = await dashboard({ search: new URL(href, 'https://atlas.example').search });
  try {
    const card = document.querySelector(`[data-dashboard-graph="${bitrate}"]`);
    assert.ok(card?.querySelector('svg [data-source-observation]'), 'the added chart has actual observation marks');
  } finally { await close(); }
});
