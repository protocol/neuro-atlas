import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('keyboard focus can reveal a complete rail tile without proximity snapping it partly offscreen', () => {
  const css = readFileSync('src/components/draft-chart-plot.css', 'utf8');
  assert.match(css, /\.metric-chart-rail:focus-within\s*\{[^}]*scroll-snap-type:\s*none\s*;/, 'Disable snap while the rail or one of its controls owns keyboard focus; otherwise native focus can snap to the preceding partially visible card');
  assert.match(css, /scroll-snap-type:\s*x proximity/, 'Pointer-only scrolling retains the discoverable native snap rail');
});
