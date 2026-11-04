import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

test('synthetic Anthropic HTTP reserves before sending; reconciles usage; strict output and failures stay private',async t=>{
  const { AnthropicModel }=await import('../scripts/feedback/model.ts');
  let requests=0; let reserved=false; let mode='ok'; let captured;
  const server=http.createServer(async(req,res)=>{
    requests++; assert.ok(reserved);
    let body='';for await(const c of req) body+=c;
    captured=JSON.parse(body);
    assert.equal(req.url,'/v1/messages'); assert.equal(captured.tools,undefined);assert.equal(JSON.parse(captured.messages[0].content).baseSha,'a'.repeat(40));
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify(mode==='unknown'?{error:'PRIVATE_CANARY'}:{model:'claude-synthetic',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:50},content:[{type:'text',text:'{"baseSha":"'+ 'a'.repeat(40)+'","files":[]}'}]}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const config={enabled:true,fixture:true,origin:`http://127.0.0.1:${server.address().port}`,model:'claude-synthetic',inputUsdPerMillion:3,outputUsdPerMillion:15,maxInputTokens:10000,maxOutputTokens:1000,maxBodyBytes:16000,maxResponseBytes:40000,timeoutMs:2000};
  const meter={assertActive:async()=>{},reserve:async cost=>{assert.ok(cost>0);reserved=true;return 'reservation-1'},reconcile:async(id,cost)=>{assert.equal(id,'reservation-1');assert.ok(cost>0);},unknown:async()=>{}};
  const model=new AnthropicModel(config,()=> 'SYNTHETIC_KEY');
  const result=await model.generate({baseSha:'a'.repeat(40),publicTask:{title:'Gap',summary:'Increase gap',acceptance:['Readable']},publicContext:{route:'/'},sources:{}},meter);
  assert.equal(result.patch.baseSha,'a'.repeat(40));assert.equal(requests,1);
  assert.ok(!JSON.stringify(captured).includes('PRIVATE_CANARY'));
  mode='unknown';await assert.rejects(model.generate({baseSha:'a'.repeat(40),publicTask:{},publicContext:{},sources:{}},meter),e=>e.message==='provider_unknown_outcome');
  await assert.rejects(new AnthropicModel({...config,inputUsdPerMillion:undefined},()=> '').generate({},meter),/disabled/);
  await assert.rejects(new AnthropicModel({...config,enabled:false},()=> '').generate({},meter),/disabled/);
  await assert.rejects(new AnthropicModel({...config,fixture:false,origin:'https://evil.invalid'},()=> '').generate({},meter),/disabled/);
  assert.equal(requests,2);
});


test('documented standard uncached usage metadata is accepted; priced-mode changes and unknown billing remain blocked',async t=>{
  const {AnthropicModel}=await import('../scripts/feedback/model.ts');
  let usage={input_tokens:100,output_tokens:50,cache_creation_input_tokens:0,cache_read_input_tokens:0,cache_creation:{ephemeral_1h_input_tokens:0,ephemeral_5m_input_tokens:0},inference_geo:'global',service_tier:'standard',speed:'standard',server_tool_use:{web_fetch_requests:0,web_search_requests:0},output_tokens_details:{thinking_tokens:0}};
  let captured,settled=0,unknown=0;
  const server=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;captured=JSON.parse(body);res.setHeader('content-type','application/json');res.end(JSON.stringify({model:'claude-synthetic',stop_reason:'end_turn',usage,content:[{type:'text',text:'{"baseSha":"'+'a'.repeat(40)+'","files":[]}'}]}));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const model=new AnthropicModel({enabled:true,fixture:true,origin:`http://127.0.0.1:${server.address().port}`,model:'claude-synthetic',inputUsdPerMillion:3,outputUsdPerMillion:15,maxInputTokens:10000,maxOutputTokens:1000,maxBodyBytes:16000,maxResponseBytes:40000,timeoutMs:2000},()=> 'SYNTHETIC_KEY');
  const meter={assertActive:async()=>{},reserve:async()=> 'r',reconcile:async(_id,cost)=>{settled++;assert.equal(cost,(100*3+50*15)/1e6);},unknown:async()=>{unknown++;}};
  const input={baseSha:'a'.repeat(40),publicTask:{title:'Gap',summary:'Increase gap',acceptance:['Readable']},publicContext:{route:'/'},sources:{}};
  assert.equal((await model.generate(input,meter)).patch.baseSha,input.baseSha);
  assert.equal(settled,1);assert.equal(unknown,0);
  assert.equal(captured.service_tier,'standard_only');assert.equal(captured.inference_geo,'global');
  for(const extra of [{cache_read_input_tokens:1},{cache_creation_input_tokens:1},{service_tier:'priority'},{speed:'fast'},{inference_geo:'us'},{server_tool_use:{web_search_requests:1,web_fetch_requests:0}},{future_billable_tokens:0}]){
    const base=usage;usage={...usage,...extra};await assert.rejects(model.generate(input,meter),/provider_unknown_outcome/);usage=base;
  }
  assert.equal(settled,1);assert.equal(unknown,7);
});
