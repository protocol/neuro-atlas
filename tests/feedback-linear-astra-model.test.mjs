import test from 'node:test';
import assert from 'node:assert/strict';

import {createServer} from 'node:http';
import {normalizeFeedback} from '../src/lib/feedback/schema.ts';
import {sha256,validatePatch} from '../scripts/feedback/validator.ts';

const source='.card { padding: 8px; }\n', file='src/components/landing.css',base='a'.repeat(40);
function input() {
  const normalized=normalizeFeedback({feedback:'Please increase the padding.',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context:{route:'/field-velocity',viewport:{width:390,height:1000},theme:'light',element:{selector:'main > h2',tagName:'h2'}}});
  return {...normalized,baseSha:base,sources:{[file]:source}};
}
export async function peer(mode='') {
  const seen=[];
  const patch={baseSha:base,files:[{path:file,beforeSha256:sha256(source),content:source.replace('8px','16px')}]};
  const server=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    seen.push(JSON.parse(body));res.setHeader('content-type','application/json');
    const data={provider:'hermes-astra',account:modelConfig.account,model:modelConfig.model,status:'completed',output:[{type:'text',text:JSON.stringify(patch)}],usage:{inputTokens:100,outputTokens:100}};
    if(typeof mode==='function')mode(data);
    res.end(JSON.stringify(data));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {origin:'http://127.0.0.1:'+server.address().port,seen,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}

test('explicit synthetic loopback peer requests one bounded no-tools JSON CSS patch and records UNPRICED usage',async()=>{
  const {HermesAstraModel}=await import('../scripts/feedback-linear/hermes-model.ts');
  const p=await peer(),events=[];
  try {
    const result=await new HermesAstraModel({...modelConfig,fixture:true,fixtureOrigin:p.origin}).generate(input(),{
      assertActive:async()=>{},reserve:async tokens=>{events.push(['reserve',tokens]);return 'synthetic-id';},complete:async(id,usage)=>events.push(['complete',id,usage]),
    });
    assert.equal(validatePatch(result.patch,{[file]:source},base,'css-only').files[0].content,'.card { padding: 16px; }\n');
    assert.equal(result.chargedUsd,null);assert.equal(result.pricing,'UNPRICED');assert.equal(events[0][0],'reserve');assert.deepEqual(events[1],['complete','synthetic-id',{inputTokens:100,outputTokens:100}]);
    assert.equal(p.seen.length,1);const body=p.seen[0];
    assert.deepEqual(body.tools,[]);assert.equal(body.tool_choice,'none');assert.equal(body.store,false);assert.equal(body.max_output_tokens,1000);
    assert.deepEqual(Object.keys(body).sort(),['input','instructions','max_output_tokens','model','store','tool_choice','tools']);
    assert.match(body.instructions,/CSS declaration values ONLY/);assert.match(body.instructions,/strict JSON/);
  } finally {await p.close();}
});

test('unknown, tool-call, fallback, wrong-account and unbounded-usage responses fail closed after one request',async t=>{
  const {HermesAstraModel}=await import('../scripts/feedback-linear/hermes-model.ts');
  for(const [name,mutate] of Object.entries({
    unknown:d=>d.extra=true,tool:d=>d.tool_calls=[{}],outputTool:d=>d.output[0].type='function_call',fallback:d=>d.model='gpt-6.1-sol',account:d=>d.account='someone-else',provider:d=>d.provider='anthropic',incomplete:d=>d.status='incomplete',usage:d=>d.usage.outputTokens=1001,unknownUsage:d=>d.usage.dollars=0,
  }))await t.test(name,async()=>{
    const p=await peer(mutate);let reserved=0,completed=0;
    try {
      await assert.rejects(new HermesAstraModel({...modelConfig,fixture:true,fixtureOrigin:p.origin}).generate(input(),{assertActive:async()=>{},reserve:async()=>{reserved++;return 'reserved';},complete:async()=>{completed++;}}),/provider_unknown_outcome/);
      assert.equal(p.seen.length,1);assert.equal(reserved,1);assert.equal(completed,0);
    } finally {await p.close();}
  });
});

test('model, account, single-turn and positive body/token/time limits are checked before reservation',async t=>{
  const {HermesAstraModel}=await import('../scripts/feedback-linear/hermes-model.ts');
  const p=await peer();
  try {
    for(const delta of [{enabled:false},{account:'other'},{model:'gpt-6.1-sol'},{maxTurns:2},{maxInputTokens:1},{maxOutputTokens:0},{maxOutputTokens:8193},{maxBodyBytes:1},{maxBodyBytes:131073},{maxResponseBytes:262145},{timeoutMs:0},{timeoutMs:120001},{command:'/bin/sh'}])await t.test(JSON.stringify(delta),async()=>{
      let calls=0;
      await assert.rejects(new HermesAstraModel({...modelConfig,fixture:true,fixtureOrigin:p.origin,...delta}).generate(input(),{assertActive:async()=>{},reserve:async()=>{calls++;return 'no';},complete:async()=>{}}),/model_disabled|input_limit/);
      assert.equal(calls,0);
    });
    assert.equal(p.seen.length,0);
  } finally {await p.close();}
});

export const modelConfig={enabled:true,account:'hermes-default-openai-codex',model:'gpt-6-astra',maxTurns:1,maxInputTokens:50000,maxOutputTokens:1000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000};

test('native Astra fails closed before any request or reservation while the supported broker cannot enforce output/account bounds',async()=>{
  const {HermesAstraModel,ASTRA_BLOCKER}=await import('../scripts/feedback-linear/hermes-model.ts');
  let calls=0;
  const meter={assertActive:async()=>{},reserve:async()=>{calls++;return 'never';},complete:async()=>{calls++;}};
  await assert.rejects(new HermesAstraModel(modelConfig).generate({},meter),new RegExp(ASTRA_BLOCKER));
  assert.equal(calls,0);
  assert.match(ASTRA_BLOCKER,/hermes_astra_bounded_broker_unavailable/);
});
