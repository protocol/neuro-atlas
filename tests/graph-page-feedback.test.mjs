import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { FIELD_VELOCITY_GRAPHS, graphPath } from '../src/data/field-velocity-links.ts';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { feedbackContext, pickElement, semanticTargets } from '../src/components/feedback/selection.ts';
import { feedbackInputSchema } from '../src/lib/feedback/intake.ts';

const input = context => ({feedback:'Local test only',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context});
test('standalone graph Feedback retains its curated chart identity and existing plate route without sending URL state', () => {
  for (const entry of FIELD_VELOCITY_GRAPHS) {
    const dom = new JSDOM(`<main><article data-graph-page="${entry.slug}"><h1>Graph</h1></article></main>`, {url:`https://www.plneuro.xyz${atlasPath(graphPath(entry))}?password=private#secret`});
    try {
      const context = feedbackContext(dom.window);
      assert.equal(context.route, '/field-velocity', entry.slug);
      assert.equal(context.chartId, entry.target, entry.slug);
      assert.equal(context.targetId, entry.target, entry.slug);
      assert.equal(feedbackInputSchema.safeParse(input(context)).success, true, entry.slug);
      assert.doesNotMatch(JSON.stringify(context), /private|secret|password|https:/);
    } finally {dom.window.close();}
  }
});

test('unknown graph paths and untrusted graph identities do not enter Feedback context', () => {
  const dom = new JSDOM('<main><article data-graph-page="private-free-form"><h1>Private text</h1></article></main>', {url:'https://www.plneuro.xyz/neuro-atlas/field-velocity/private-free-form?secret=private'});
  try {
    const context = feedbackContext(dom.window);
    assert.equal(context.route, '/');
    assert.equal(context.chartId, undefined);
    assert.doesNotMatch(JSON.stringify(context), /private|secret/);
  } finally {dom.window.close();}
});

test('the selected element on each real graph page retains the same curated chart identity', () => {
  for (const entry of FIELD_VELOCITY_GRAPHS) {
    const dom = new JSDOM(`<main><article data-graph-page="${entry.slug}"><h1>Graph</h1></article></main>`, {url:`https://preview.invalid${atlasPath(graphPath(entry))}`});
    try {
      const article = dom.window.document.querySelector('article');
      const heading = dom.window.document.querySelector('h1');
      const rect = {x:0,y:0,left:0,top:0,right:300,bottom:500,width:300,height:500};
      article.getBoundingClientRect = () => rect;
      heading.getBoundingClientRect = () => rect;
      assert.equal(semanticTargets(dom.window.document)[0]?.id, entry.target, entry.slug);
      assert.equal(pickElement(heading)?.targetId, entry.target, entry.slug);
      article.setAttribute('inert', '');
      assert.equal(semanticTargets(dom.window.document).length, 0);
      assert.equal(pickElement(heading), undefined);
    } finally {dom.window.close();}
  }
});
