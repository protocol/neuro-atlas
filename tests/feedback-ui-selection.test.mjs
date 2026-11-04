import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { targetAt, semanticTargets, feedbackContext, allowedTarget } from '../src/components/feedback/selection.ts';
import postcss from 'postcss';
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test('selection over native chart uses expanded geometry and only curated IDs, never reads text/input', () => {
  const dom = new JSDOM('<article data-draft-popout="metric-panel-tissue-cm3"><dialog open aria-labelledby="metric-panel-tissue-cm3-popout-title"><input value="CANARY" /></dialog></article><article data-performance-card="injected-private-id">PRIVATE</article>', { url: 'https://atlas.example/funding?q=secret#private' });
  try {
    dom.window.document.querySelector('article').getBoundingClientRect = () => rect(0, 900, 30, 30);
    dom.window.document.querySelector('dialog').getBoundingClientRect = () => rect(50, 40, 600, 400);
    Object.defineProperty(dom.window.Node.prototype, 'textContent', { get() { throw Error('No DOM text capture'); } });
    assert.equal(targetAt(dom.window.document, 100, 80), 'metric-panel-tissue-cm3');
    assert.equal(allowedTarget('injected-private-id'), undefined);
    assert.equal(semanticTargets(dom.window.document).some(x => x.id === 'injected-private-id'), false);
    const context = feedbackContext(dom.window, 'metric-panel-tissue-cm3');
    assert.equal(context.route, '/funding'); assert.equal(context.chartId, 'metric-panel-tissue-cm3');
    assert.equal(JSON.stringify(context).includes('secret'), false);
  } finally { dom.window.close(); }
});

test('global root mounts feedback once and scoped responsive styles preserve full mobile text', () => {
  const layout = readFileSync('src/app/layout.tsx', 'utf8');
  assert.match(layout, /<Feedback\s*\/>/);
  assert.match(layout, /feedback\/feedback.css/);
  const css = readFileSync('src/components/feedback/feedback.css', 'utf8');
  const parsed = postcss.parse(css);
  assert.ok(parsed.nodes.length > 5);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /100dvh/);
  assert.doesNotMatch(css, /text-overflow:\s*ellipsis|white-space:\s*nowrap/);
});
