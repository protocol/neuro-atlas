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


test('one-field intake accepts structural button/heading/nested SVG targets, rejects capture and mixed public modes',()=>{
  const body={feedback:'Private note',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context:{route:'/field-velocity',chartId:'neural-recording-hours',viewport:{width:390,height:844},theme:'light'}};
  for(const [selector,tagName] of [['html > body > main > button:nth-of-type(2)','button'],['html > body > main > h2','h2'],['html > body > main > svg > g:nth-of-type(3) > path','path']])assert.equal(feedbackInputSchema.safeParse({...body,context:{...body.context,element:{selector,tagName,classes:['static-css_token']}}}).success,true);
  const element={selector:'html > body > main > button',tagName:'button'};
  const invalid=[
    {selector:'button#private',tagName:'button'}, {selector:'button.private',tagName:'button'}, {selector:'input[value="secret"]',tagName:'input'},
    {selector:'html body button',tagName:'button'}, {selector:'html > body > button',tagName:'path'}, {selector:'button:nth-of-type(0)',tagName:'button'},
    {selector:'button:nth-of-type(10001)',tagName:'button'}, {selector:Array(25).fill('div').join(' > '),tagName:'div'},
    {...element,classes:['url(private)']}, {...element,classes:['contains:private']}, {...element,classes:Array(9).fill('token')},
    {...element,role:'PRIVATE_ROLE'}, {...element,text:'private'}, {...element,html:'<button>private</button>'}, {...element,value:'private'},
    {...element,href:'https://private.invalid'}, {...element,classes:['x'.repeat(65)]}, {...element,classes:['private\n']}, {...element,role:'button\n'},
    {selector:'button\n',tagName:'button\n'},
  ];
  for(const reference of invalid)assert.equal(feedbackInputSchema.safeParse({...body,context:{...body.context,element:reference}}).success,false,JSON.stringify(reference));
  for(const extra of [{publicTask:input(body.context).publicTask},{privateComment:'private'},{processingConsent:{approved:false,policyVersion:'atlas-feedback-simple-v1'}},{processingConsent:{approved:true,policyVersion:'atlas-feedback-v1'}},{feedback:'x'.repeat(3001)},{feedback:'  '}])assert.equal(feedbackInputSchema.safeParse({...body,...extra}).success,false);
  assert.equal(feedbackInputSchema.safeParse({...body,feedback:'x'.repeat(3000)}).success,true);
  assert.equal(feedbackInputSchema.safeParse({...input(body.context),context:{...body.context,element}}).success,false,'legacy never admits a private element instruction');
});
