import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import * as selection from '../src/components/feedback/selection.ts';
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


test('DOM references identify heading/button/nested SVG without serializing names or private attributes', () => {
  const dom = new JSDOM('<main><h1 id="SECRET">PRIVATE</h1><article data-performance-card="tissue-mapped"><button title="SECRET" class="chart-action"><svg><g><path /></g></svg></button></article><aside data-atlas-feedback><button>Controls</button></aside><div inert><button>Hidden</button></div></main>');
  try {
    const doc = dom.window.document;
    for (const e of doc.querySelectorAll('*')) e.getBoundingClientRect = () => rect(20, 40, 80, 30);
    Object.defineProperty(dom.window.Node.prototype, 'textContent', { get() { throw Error('No text capture'); } });
    assert.equal(typeof selection.pickElement, 'function', 'exact DOM picker exists');
    for (const selector of ['h1', 'article button', 'path']) {
      const element = doc.querySelector(selector);
      const picked = selection.pickElement(element);
      const expected = element.closest('button') ?? element;
      assert.ok(picked); assert.equal(picked.element, expected);
      assert.equal(doc.querySelector(picked.reference.selector), expected);
      assert.equal(picked.reference.tagName, expected.localName);
      assert.ok(Object.keys(picked.reference).every(key => ['selector','tagName','role','classes'].includes(key)));
      assert.equal(JSON.stringify(picked.reference).includes('SECRET'), false);
      if (selector !== 'h1') assert.deepEqual(picked.reference.classes, ['chart-action']);
      if (selector !== 'h1') assert.equal(picked.targetId, 'tissue-mapped');
    }
    assert.equal(selection.pickElement(doc.querySelector('aside button')), undefined);
    assert.equal(selection.pickElement(doc.querySelector('[inert] button')), undefined);
    const hit = doc.querySelector('path'); doc.elementFromPoint = () => hit;
    assert.equal(selection.elementAt(doc, 30, 50).element, hit.closest('button'));
  } finally { dom.window.close(); }
});

test('nested icon/span picks its actionable button, chart SVG stays exact, tooltip never picks', () => {
 const dom = new JSDOM('<button><span><svg><path /></svg></span></button><article><svg><g><path /></g></svg></article><div role="tooltip">Hint</div>');
 try {
  const doc=dom.window.document;
  for (const e of doc.querySelectorAll('*')) e.getBoundingClientRect=()=>rect(0,0,80,40);
  assert.equal(selection.pickElement(doc.querySelector('button path')).element, doc.querySelector('button'));
  assert.equal(selection.pickElement(doc.querySelector('button span')).element, doc.querySelector('button'));
  assert.equal(selection.pickElement(doc.querySelector('article svg')).element, doc.querySelector('article svg'));
  assert.equal(selection.pickElement(doc.querySelector('[role=tooltip]')), undefined);
 } finally {dom.window.close();}
});

test('compact composer CSS is content-sized and picker is a transparent pointer pass-through top layer', () => {
 const css = postcss.parse(readFileSync('src/components/feedback/feedback.css','utf8'));
 const rules = selector => css.nodes.filter(node => node.type==='rule' && node.selector===selector).flatMap(node => node.nodes.filter(d=>d.type==='decl').map(d=>[d.prop,d.value]));
 const composer=Object.fromEntries(rules('dialog.atlas-feedback-layer'));
 assert.equal(composer.width, 'min(320px, calc(100vw - 20px))');
 assert.equal(composer.height, 'auto');
 assert.equal(composer['max-width'],'none');
 const panel=Object.fromEntries(rules('.atlas-feedback-panel'));
 assert.equal(panel.background,'var(--surface, #fff)','pinned outline must not show through a mobile composer');
 assert.equal(panel.position,'relative');
 const picker=Object.fromEntries(rules('.atlas-feedback-picker'));
 assert.equal(picker['pointer-events'],'none');
 const toolbar=Object.fromEntries(rules('.atlas-feedback-selection-controls'));
 assert.equal(toolbar.bottom,'10px','picker toolbar leaves native chart close controls exposed');
 assert.equal(toolbar.left,'10px');
 const backdrop=Object.fromEntries(rules('.atlas-feedback-layer::backdrop'));
 assert.equal(backdrop.background,'transparent');
});

test('reference chip has a bounded meaningful local name; only safe classes/role travel, never input values', () => {
 const dom=new JSDOM('<main><button aria-label="Copy chart" class="pc-action valid_static bad:token 123bad"><svg /></button><h2>A useful chart heading</h2><input value="PRIVATE_VALUE" placeholder="PRIVATE_PLACEHOLDER"><textarea>PRIVATE_TEXT</textarea><div role="button" class="card">Make this clearer</div></main>');
 try {
  const doc=dom.window.document;
  for(const e of doc.querySelectorAll('*')) e.getBoundingClientRect=()=>rect(1,2,30,40);
  const button=selection.pickElement(doc.querySelector('button svg'));
  assert.equal(button.label,'Copy chart');
  assert.deepEqual(button.reference.classes,['pc-action','valid_static']);
  assert.equal(button.reference.role,'button');
  assert.equal(button.reference.label,undefined);
  assert.equal(selection.pickElement(doc.querySelector('h2')).label,'A useful chart heading');
  assert.equal(selection.pickElement(doc.querySelector('input')).label,'input');
  assert.equal(selection.pickElement(doc.querySelector('textarea')).label,'textarea');
  assert.equal(JSON.stringify(selection.pickElement(doc.querySelector('input')).reference).includes('PRIVATE'),false);
  assert.equal(selection.pickElement(doc.querySelector('div')).reference.role,'button');
 } finally {dom.window.close();}
});

test('decorative aria-hidden icons inside an accessible button still select that button', () => {
 const dom=new JSDOM('<button aria-label="Copy chart"><svg aria-hidden="true"><path /></svg></button>');
 try {const button=dom.window.document.querySelector('button');button.getBoundingClientRect=()=>rect(1,2,30,40);assert.equal(selection.pickElement(button.querySelector('path'))?.element,button);} finally {dom.window.close();}
});
