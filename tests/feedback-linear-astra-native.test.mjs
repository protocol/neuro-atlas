import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const exec=promisify(execFile);
const python='/opt/hermes/.venv/bin/python';
const helper=new URL('../scripts/feedback-linear/astra_native_probe.py',import.meta.url).pathname;
const available=existsSync(python)&&existsSync('/opt/hermes/agent/auxiliary_client.py');
const options={skip:available?false:'Installed native Hermes unavailable; raw resolver/SDK NOT exercised'};
const env={PATH:'/usr/bin:/bin',HOME:'/nonexistent',PYTHONDONTWRITEBYTECODE:'1'};
const driver=String.raw`import sys,json,importlib.util,socket,runpy
from unittest.mock import patch
sys.path.insert(0,'/opt/hermes')
import httpx
from agent import auxiliary_client as native
spec=importlib.util.spec_from_file_location('astra_probe',sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
response=json.loads(sys.argv[2]); seen=[]; mode=sys.argv[3]
original=native.resolve_provider_client
def resolve(*args,**kwargs):
 client,model=original(*args,**kwargs)
 if mode=='wrongModel': model='gpt-6.1-sol'
 if mode=='wrongEndpoint': client.base_url='https://example.com/v1'
 if mode=='unavailable': return None,None
 return client,model
def intercept(req):
 seen.append(json.loads(req.content))
 if mode=='rejectcap': return httpx.Response(400,json={'detail':'Unsupported parameter: max_output_tokens'})
 data={'type':'response.'+response['status'],'sequence_number':0,'response':response}
 events=response.get('_events',[data])
 return httpx.Response(200,headers={'content-type':'text/event-stream'},content=''.join('data: '+json.dumps(e)+'\n\n' for e in events))
with patch.object(socket.socket,'connect',side_effect=AssertionError('network forbidden')), httpx.Client(transport=httpx.MockTransport(intercept),trust_env=False) as http, patch.object(native,'_read_codex_access_token',return_value='synthetic-unused'), patch.object(native,'_openai_http_client_kwargs',return_value={'http_client':http}), patch.object(native,'resolve_provider_client',side_effect=resolve):
 if mode in ('rejectcap','runner','preflight'):
  import io,contextlib
  output=io.StringIO(); filename=sys.argv[1].replace('astra_native_probe.py','astra_native.py')
  args=['--complete'] if mode=='runner' else ['--preflight']
  if mode=='rejectcap': filename=sys.argv[1];args=['--public-smoke']
  payload=sys.argv[4]; sys.argv=[filename]+args; sys.stdin=io.TextIOWrapper(io.BytesIO(payload.encode()))
  with contextlib.redirect_stdout(output): runpy.run_path(filename,run_name='__main__')
  result={'result':json.loads(output.getvalue())}
 else:
  try:
   if mode=='complete':
    from astra_native import complete
    result={'result':complete(json.loads(sys.argv[4]))}
   else: result={'result':m.public_smoke()}
  except ValueError as e: result={'blocked':str(e)}
 print(json.dumps(dict(result,seen=seen)))
`;
const terminalResponse=()=>({id:'resp_synthetic',object:'response',created_at:0,status:'completed',model:'gpt-6-astra',max_output_tokens:128,tools:[],tool_choice:'none',store:false,incomplete_details:null,error:null,output:[{type:'message',id:'msg_synthetic',status:'completed',role:'assistant',content:[{type:'output_text',text:'OK',annotations:[]}]}],usage:{input_tokens:12,output_tokens:1,total_tokens:13}});
const request=()=>({instructions:'Return JSON only.',user:'Public synthetic test.',maxInputTokens:10000,maxBodyBytes:131072,maxResponseBytes:262144,timeoutMs:5000});
async function nativePeer(response=terminalResponse(),mode='',payload=request()) {
  const r=await exec(python,['-B','-c',driver,helper,JSON.stringify(response),mode,JSON.stringify(payload)],{env,timeout:15000,maxBuffer:10000});
  assert.equal(r.stderr,'');return JSON.parse(r.stdout);
}
async function probe() {
  const r=await exec(python,['-B',helper,'--offline'],{env,timeout:15000,maxBuffer:10000});
  assert.equal(r.stderr,'');
  return JSON.parse(r.stdout);
}

test('OFFLINE actual raw Codex resolver and SDK forward an exact 128-token no-tools request',options,async()=>{
  const r=await probe();
  assert.equal(r.evidence,'SYNTHETIC_TRANSPORT_ONLY');
  assert.equal(r.nativeResolverCalls,1);
  assert.equal(r.requests,1);
  assert.equal(r.networkCalls,0);
  assert.equal(r.requestPath,'https://chatgpt.com/backend-api/codex/responses');
  assert.deepEqual(r.body,{
    model:'gpt-6-astra',max_output_tokens:128,store:false,stream:true,
    tools:[],tool_choice:'none',instructions:'Reply with exactly OK.',
    input:[{role:'user',content:'Public transport diagnostic.'}],
  });
  assert.equal(r.resolvedModel,'gpt-6-astra');
  assert.deepEqual(r.syntheticUsage,{inputTokens:12,outputTokens:1});
});

test('offline metadata is not promoted into actual server provenance',options,async()=>{
  const r=await probe();
  assert.equal(r.serverResponseObserved,false);
  assert.deepEqual(r.resolverReturnShape,['client','model']);
});

test('fixed native public smoke returns only actual server model, cap and usage fields',options,async()=>{
  const r=await nativePeer();
  assert.deepEqual(r.result,{
    status:'completed',serverModel:'gpt-6-astra',serverMaxOutputTokens:128,
    usage:{inputTokens:12,outputTokens:1},text:'OK',
    authRoute:'native-hermes-openai-codex',accountIdentity:'NATIVE_BROKER_SELECTED_NOT_SERVER_ATTESTED',
    chargedUsd:null,pricing:'UNPRICED',
  });
  assert.equal(r.seen.length,1);
  assert.equal(r.seen[0].max_output_tokens,128);
  assert.deepEqual(r.seen[0].tools,[]);assert.equal(r.seen[0].tool_choice,'none');
});

test('native route preflight refuses a different model or endpoint before any request',options,async()=>{
  for(const mode of ['wrongModel','wrongEndpoint','unavailable']) {
    const r=await nativePeer(terminalResponse(),mode);
    assert.equal(r.blocked,'native_route_unavailable');assert.deepEqual(r.seen,[]);
  }
});

test('native terminal receipts reject fallback, missing caps, tools and unknown usage without retry',options,async()=>{
  for(const change of [
    r=>r.model='gpt-6.1-sol',r=>delete r.max_output_tokens,r=>r.tools=[{type:'web_search'}],
    r=>r.output=[{type:'function_call',call_id:'synthetic',name:'unsafe',arguments:'{}'}],
    r=>r.usage.output_tokens=129,r=>r.usage.input_tokens=-1,
  ]) {
    const data=terminalResponse();change(data);const r=await nativePeer(data);
    assert.equal(r.blocked,'provider_unknown_outcome');assert.equal(r.seen.length,1);
  }
});

test('native cap-exhaustion smoke preserves actual incomplete status and usage instead of inventing completion',options,async()=>{
  const data=terminalResponse();data.status='incomplete';data.incomplete_details={reason:'max_output_tokens'};
  data.output=[];data.usage.output_tokens=128;data.usage.total_tokens=140;
  const r=await nativePeer(data);
  assert.equal(r.result.status,'incomplete');assert.equal(r.result.serverModel,'gpt-6-astra');
  assert.deepEqual(r.result.usage,{inputTokens:12,outputTokens:128});assert.equal(r.result.text,'');
});

test('fixed public-smoke runner reports native unsupported-cap HTTP 400 with no invented server model or usage',options,async()=>{
  const r=await nativePeer(terminalResponse(),'rejectcap');
  assert.deepEqual(r.result,{
    status:'rejected',httpStatus:400,error:'Unsupported parameter: max_output_tokens',serverModel:null,usage:null,
  });
  assert.equal(r.seen.length,1,'SDK retries must be disabled');
});

test('bounded native completion recovers text deltas when the terminal response omits output',options,async()=>{
  const data=terminalResponse();data.output=[];
  data._events=[{type:'response.output_text.delta',delta:'{}',item_id:'msg_synthetic',output_index:0,content_index:0,sequence_number:0},{type:'response.completed',sequence_number:1,response:structuredClone(data)}];
  const r=await nativePeer(data,'complete');
  assert.equal(r.result.text,'{}');assert.equal(r.result.serverModel,'gpt-6-astra');
  assert.deepEqual(r.result.usage,{inputTokens:12,outputTokens:1});
  assert.equal(r.seen.length,1);assert.equal(r.seen[0].max_output_tokens,undefined);
});

test('native production uses reviewed unsupported-cap omission and preserves actual usage without a token guarantee',options,async()=>{
  const data=terminalResponse();delete data.max_output_tokens;data.usage.output_tokens=16384;
  const r=await nativePeer(data,'complete');
  assert.equal(r.result.status,'completed');assert.equal(r.result.serverMaxOutputTokens,null);
  assert.equal(r.result.usage.outputTokens,16384);assert.equal(r.result.serverModel,'gpt-6-astra');
  assert.equal(r.result.chargedUsd,null);assert.equal(r.result.pricing,'UNPRICED');
  assert.equal(r.seen.length,1);assert.equal(r.seen[0].max_output_tokens,undefined);
});

test('fixed native runner uses bounded stdin and safe no-inference preflight over the actual SDK peer',options,async()=>{
  const r=await nativePeer(terminalResponse(),'runner');
  assert.equal(r.result.status,'completed');assert.equal(r.result.serverModel,'gpt-6-astra');assert.equal(r.result.text,'OK');assert.equal(r.seen.length,1);
  const p=await nativePeer(terminalResponse(),'preflight');
  assert.deepEqual(p.result,{authRoute:'native-hermes-openai-codex',resolvedModel:'gpt-6-astra',ready:true});assert.deepEqual(p.seen,[]);
});

test('native diagnostic rejects a live mode or caller-supplied text before importing Hermes',options,async()=>{
  for(const args of [[],['--live'],['--offline','private-input']]) {
    await assert.rejects(exec(python,['-B',helper,...args],{env,timeout:15000,maxBuffer:10000}),e=>{
      assert.equal(e.stdout,'');
      assert.match(e.stderr,/^fixed_diagnostic_only: use --offline or --public-smoke; no caller input\n$/);
      return true;
    });
  }
});
