import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// jsdom has no layout engine; test the actual rail sizing rules and their width budgets here.
// Native QA must also measure rendered cards, scrollbar, peeks and document scrollWidth.
function rules() {
  const dom = new JSDOM('<style></style>');
  dom.window.document.querySelector('style').textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
  return { dom, rules: [...dom.window.document.styleSheets[0].cssRules] };
}

test('wide rails use fixed compact peer columns with a visible peek, never the retired wrapping grid', () => {
  const { dom, rules: css } = rules();
  try {
    const content = css.find(rule => rule.selectorText === '.metric-category-content');
    assert.ok(content, 'The complete rail uses one width budget');
    assert.equal(content.style.getPropertyValue('--metric-card-width'), 'calc((100% - 2.625rem)/3.34)');
    const rail = css.find(rule => rule.selectorText === '.metric-chart-rail');
    assert.equal(rail.style.getPropertyValue('grid-auto-columns'), 'var(--metric-card-width)');
    assert.equal(rail.style.getPropertyValue('grid-auto-flow'), 'column');
    assert.equal(rail.style.getPropertyValue('grid-template-columns'), '');
    assert.equal(parseFloat(rail.style.getPropertyValue('min-width')), 0);
    assert.equal(rail.style.getPropertyValue('max-width'), '100%');
    assert.equal(rail.style.getPropertyValue('overflow-x'), 'auto');
    assert.equal(rail.style.getPropertyValue('scroll-snap-type'), 'x proximity');
    assert.equal(rail.style.getPropertyValue('overscroll-behavior-x'), 'contain');
    assert.equal(rail.style.getPropertyValue('scrollbar-width'), 'auto', 'Do not hide the native scrollbar');
    for (const width of [1087, 1248]) {
      const card = (width - 42) / 3.34;
      const peek = width - 3 * card - 3 * 14;
      assert.ok(card >= 300, 'Desktop cards keep a readable frame for screen-space ticks');
      assert.ok(peek > 90 && peek < card, 'Three full cards and an unmistakably partial fourth');
    }
    // Medium plates switch to two cards and a peek through a container query (not evaluated by jsdom).
    for (const width of [560, 671, 800]) {
      const card = (width - 28) / 2.2;
      const peek = width - 2 * card - 2 * 14;
      assert.ok(card >= 240 && peek > 40 && peek < card);
    }
    assert.equal(css.some(rule => rule.selectorText === '.metric-chart-grid'), false);
    assert.equal(css.some(rule => rule.selectorText?.includes('data-metric-state') && rule.style.getPropertyValue('--metric-card-width')), false,
      'Card width must remain independent of disclosure state');
  } finally { dom.window.close(); }
});

test('narrow rails reclaim 16px of excess peek for unclipped growth headings at the native 320px width', () => {
  const { dom, rules: css } = rules();
  try {
    const media = css.find(rule => rule.conditionText === '(max-width: 560px)' && [...rule.cssRules].some(rule => rule.selectorText === '.metric-category-content'));
    assert.ok(media, 'Narrow screens need a different rail width budget, not a stacked grid');
    const content = [...media.cssRules].find(rule => rule.selectorText === '.metric-category-content');
    const budget = content.style.getPropertyValue('--metric-card-width');
    const match = /^calc\(100% - ([\d.]+)rem\)$/.exec(budget);
    assert.ok(match, 'The mobile width budget remains a rail-relative subtraction');
    const reserved = Number(match[1]) * 16;
    for (const width of [254, 324, 494]) {
      const card = width - reserved;
      const peek = width - card - 16;
      assert.equal(peek, 8, 'Keep a visible affordance without sacrificing 24px of chart content');
      assert.ok(card >= 230);
      if (width === 254) {
        // Native 320px replay: the former 214px card had a 172px SVG;
        // its BRAIN-COMPUTER INTERFACE heading overran by 10.4px.
        const svgWidth = card - 42;
        assert.ok(svgWidth >= 172 + 10.4, 'The actual heading fits without changing its text or font');
      }
    }
  } finally { dom.window.close(); }
});
