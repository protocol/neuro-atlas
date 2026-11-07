import test from 'node:test';
import assert from 'node:assert/strict';
import {HermesAstraModel} from '../scripts/feedback-linear/hermes-model.ts';
import {normalizeFeedback} from '../src/lib/feedback/schema.ts';
import {sha256,validatePatch} from '../scripts/feedback/validator.ts';
const source='.card { padding: 8px; }\n',file='src/components/landing.css',base='a'.repeat(40);
const config={enabled:true,account:'hermes-default-openai-codex',model:'gpt-6-astra',nativePolicy:'attempt-count-v1',maxTurns:1,maxInputTokens:50000,maxOutputTokens:1000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000};
function input(){return {...normalizeFeedback({feedback:'Synthetic increase in padding',processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'},context:{route:'/field-velocity',viewport:{width:390,height:800},theme:'light'}}),baseSha:base,sources:{[file]:source}};}
const patch={baseSha:base,files:[{path:file,beforeSha256:sha256(source),content:source.replace('8px','16px')}]};
const result=()=>({status:'completed',serverModel:'gpt-6-astra',serverMaxOutputTokens:null,usage:{inputTokens:100,outputTokens:20000},text:JSON.stringify(patch),authRoute:'native-hermes-openai-codex',accountIdentity:'NATIVE_BROKER_SELECTED_NOT_SERVER_ATTESTED',chargedUsd:null,pricing:'UNPRICED'});

test('explicit native attempt policy calls the fixed no-tools runner only after durable reservation and preserves actual usage without claiming generation caps',async()=>{
 const events=[];
 const model=new HermesAstraModel(config,async(request,bounds,signal)=>{events.push('native');assert.deepEqual(events,['reserve','native']);assert.equal(request.max_output_tokens,undefined);assert.equal(request.model,undefined);assert.equal(request.provider,undefined);assert.equal(bounds.timeoutMs,5000);assert.equal(signal,undefined);return result();});
 const generated=await model.generate(input(),{assertActive:async()=>{},reserve:async()=>{events.push('reserve');return 'durable-id';},complete:async(id,usage)=>{assert.equal(id,'durable-id');assert.deepEqual(usage,{inputTokens:100,outputTokens:20000});events.push('complete');}});
 assert.equal(validatePatch(generated.patch,{[file]:source},base,'css-only').files[0].content,'.card { padding: 16px; }\n');
 assert.deepEqual(events,['reserve','native','complete']);assert.equal(generated.chargedUsd,null);
});

test('native ASCII serialized body is bounded before durable reservation',async()=>{let reserves=0,calls=0;const x=input();x.sources[file]=source+'/*'+'Ω'.repeat(1800)+'*/';await assert.rejects(new HermesAstraModel({...config,maxBodyBytes:9000},async()=>{calls++;return result();}).generate(x,{assertActive:async()=>{},reserve:async()=>{reserves++;return 'no';},complete:async()=>{}}),/input_limit/);assert.equal(reserves,0);assert.equal(calls,0);});
