import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { VelocityTabs } from '../src/components/sections/velocity-tabs.tsx';
import { mount, settle } from './modal-helpers.mjs';

globalThis.React = React;

test('the bitrate narrow-action selector reaches the real modal action row without changing other charts', async () => {
  const css = readFileSync(new URL('../src/components/draft-chart-plot.css', import.meta.url), 'utf8');
  const rule = css.match(/@media\s*\(max-width:\s*360px\)\s*\{\s*([^{}]+)\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*max-content\)/);
  assert.ok(rule, 'The bitrate chart has an explicit narrow two-column action layout');
  assert.match(css, /\[data-draft-popout="metric-panel-bci-bitrate"\] \.pc-modal-header \.chart-actions > :is\(\.pc-share, \.draft-chart-share\) button\s*\{\s*grid-area:\s*auto;/, 'Reset inherited first-row and third-column placement so no implicit overflow track survives');
  const cleanup = await mount(React.createElement(VelocityTabs, { performance: null }), '#bci-information-transfer-over-time');
  try {
    for (let i = 0; i < 30 && !document.querySelector('dialog[open] .chart-actions'); i++) await settle();
    const row = document.querySelector('dialog[open] .chart-actions');
    assert.ok(row);
    assert.ok(row.matches(rule[1].trim()), 'The selector must match the mounted modal, not a wrapper abandoned by the modal slot');
    assert.equal(row.querySelectorAll('button').length, 3);
    assert.match(rule[1], /metric-panel-bci-bitrate/);
  } finally { await cleanup(); }
});
