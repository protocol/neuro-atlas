import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('medium sidebar layouts use two grid columns before reference-chart ticks become too small', () => {
  const dom = new JSDOM('<style></style>');
  try {
    dom.window.document.querySelector('style').textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
    const media = [...dom.window.document.styleSheets[0].cssRules].find(rule => rule.conditionText === '(max-width: 1200px)');
    assert.ok(media, 'At 1024px, the sidebar leaves 671px: three 213px tiles shrink preview ticks to 8.55px; use two columns');
    const grid = [...media.cssRules].find(rule => rule.selectorText === '.metric-chart-grid');
    assert.equal(grid.style.getPropertyValue('grid-template-columns'), 'repeat(2, minmax(0, 1fr))');
  } finally { dom.window.close(); }
});
