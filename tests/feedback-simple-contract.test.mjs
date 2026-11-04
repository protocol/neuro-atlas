import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackInputSchema } from '../src/lib/feedback/intake.ts';

const simpleInput = {
  feedback: 'Please improve this button spacing.',
  processingConsent: { approved: true, policyVersion: 'atlas-feedback-simple-v1' },
  context: {
    route: '/field-velocity', viewport: { width: 390, height: 844 }, theme: 'light',
    element: { selector: 'html:nth-of-type(1) > body:nth-of-type(1) > main:nth-of-type(1) > button:nth-of-type(1)', tagName: 'button', role: 'button', classes: ['chart-actions-button'] },
  },
};

test('the real intake contract admits one feedback field associated with a non-chart page element', () => {
  assert.equal(feedbackInputSchema.safeParse(simpleInput).success, true);
  assert.equal(Object.hasOwn(simpleInput, 'publicTask'), false);
  assert.equal(Object.hasOwn(simpleInput, 'privateComment'), false);
});

import { JSDOM } from 'jsdom';
import { pickElement } from '../src/components/feedback/selection.ts';

test('actual DOM picks resolve the exact element and cross the intake seam without sending local names or input values', () => {
  const dom = new JSDOM('<main><h1 class="hero-title">Local heading label</h1><button class="chart-actions-button hover:bg-blue-300" aria-label="Copy chart"><svg aria-hidden="true"><path id="inside-button" d="M0 0 L10 10" /></svg></button><svg class="chart-line"><path id="plot-path" d="M0 0 L10 10" /></svg><input value="PRIVATE_INPUT_CANARY" /></main>', {url:'http://127.0.0.1:35641/neuro-atlas/field-velocity'});
  try {
    // Layout is synthetic here; committed native browser replays verify pixels/hit-testing separately.
    dom.window.Element.prototype.getBoundingClientRect = () => ({left:20,top:30,right:140,bottom:70,x:20,y:30,width:120,height:40});
    const doc = dom.window.document;
    for (const selector of ['h1', '#inside-button', '#plot-path']) {
      const selected = pickElement(doc.querySelector(selector));
      assert.ok(selected, selector);
      assert.equal(doc.querySelector(selected.reference.selector), selected.element);
      if (selector === '#inside-button') {
        assert.equal(selected.element.tagName, 'BUTTON');
        assert.equal(selected.label, 'Copy chart');
      }
      const input = {...simpleInput, context:{...simpleInput.context, element:selected.reference}};
      assert.equal(feedbackInputSchema.safeParse(input).success, true, selector);
      for (const name of ['PRIVATE_INPUT_CANARY', 'Local heading label', 'Copy chart']) assert.ok(!JSON.stringify(input).includes(name));
      assert.equal(Object.hasOwn(input.context.element, 'label'), false);
    }
  } finally { dom.window.close(); }
});
