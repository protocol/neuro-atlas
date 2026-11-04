import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { draftChartAnchors, metricChartAnchors } from '../src/data/draft-chart-links.ts';
import { feedbackContext, allowedTarget } from '../src/components/feedback/selection.ts';
import { feedbackInputSchema } from '../src/lib/feedback/intake.ts';

const input = context => ({privateComment:'Private local fixture',publicTask:{title:'Improve spacing',summary:'Improve the selected chart spacing.',acceptance:['Labels remain readable']},publicApproval:{approved:true,policyVersion:'atlas-feedback-v1'},context});

test('every curated frontend selection produces context accepted by the actual intake validator', () => {
  const dom = new JSDOM('', {url:'https://www.plneuro.xyz/neuro-atlas/field-velocity'});
  try {
    const ids = [...draftChartAnchors, ...metricChartAnchors, 'simultaneously-recorded-neurons', 'tissue-mapped', 'neural-recording-hours', 'idea_vintage', 'latency_compression', 'google-trends-neurotech', 'google-trends-neuralink'];
    for (const id of ids) {
      assert.equal(allowedTarget(id), id);
      const parsed = feedbackInputSchema.safeParse(input(feedbackContext(dom.window, id)));
      assert.equal(parsed.success, true, `server rejected selected chart ${id}`);
    }
    assert.equal(allowedTarget('private-arbitrary-dom-id'), undefined);
    const context = {...feedbackContext(dom.window),targetId:'private-arbitrary-dom-id',chartId:'private-arbitrary-dom-id'};
    assert.equal(feedbackInputSchema.safeParse(input(context)).success, false);
  } finally { dom.window.close(); }
});
