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
