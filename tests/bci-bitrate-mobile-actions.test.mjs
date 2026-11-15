import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the new bitrate panel keeps all three share actions reachable at 320px without changing other charts', () => {
  const css = readFileSync(new URL('../src/components/draft-chart-plot.css', import.meta.url), 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*360px\)\s*\{\s*\.metrics-index\s+\[data-draft-popout="metric-panel-bci-bitrate"\]\s+\.pc-modal-header\s+\.chart-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*max-content\)/);
});
