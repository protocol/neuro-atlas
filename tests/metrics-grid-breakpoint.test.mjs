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

test('wide and medium rails use wider fixed peer columns, never the retired wrapping grid', () => {
  const { dom, rules: css } = rules();
  try {
    const content = css.find(rule => rule.selectorText === '.metric-category-content');
    assert.ok(content, 'The preview action and full rail share one width budget');
    assert.equal(content.style.getPropertyValue('--metric-card-width'), 'calc((100% - 1rem)/1.65)');
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
    for (const width of [671, 927, 1087, 1248]) {
      const card = (width - 16) / 1.65;
      const peek = width - card - 16;
      assert.ok(card > (width - 32) / 3 * 1.6, 'Meaningfully wider than the old three-column tiles');
      assert.ok(card >= 390, 'Medium sidebar layouts retain readable card widths');
      assert.ok(peek > 100 && peek < card, 'One full card and an unmistakably partial next card');
    }
    assert.equal(css.some(rule => rule.selectorText === '.metric-chart-grid'), false);
    assert.equal(css.some(rule => rule.selectorText?.includes('data-metric-state') && rule.style.getPropertyValue('--metric-card-width')), false,
      'Preview and full state must use the exact same card width');
  } finally { dom.window.close(); }
});

test('narrow rails keep a full card and a 24px next-card peek inside their own width budget', () => {
  const { dom, rules: css } = rules();
  try {
    const media = css.find(rule => rule.conditionText === '(max-width: 560px)' && [...rule.cssRules].some(rule => rule.selectorText === '.metric-category-content'));
    assert.ok(media, 'Narrow screens need a different rail width budget, not a stacked grid');
    const content = [...media.cssRules].find(rule => rule.selectorText === '.metric-category-content');
    assert.equal(content.style.getPropertyValue('--metric-card-width'), 'calc(100% - 2.5rem)');
    for (const width of [254, 324, 494]) {
      const card = width - 40;
      const peek = width - card - 16;
      assert.equal(peek, 24);
      assert.ok(card >= 214);
    }
  } finally { dom.window.close(); }
});
