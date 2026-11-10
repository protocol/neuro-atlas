import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {generateKeyPairSync,createHmac} from 'node:crypto';
import {requestHash,signPrivateRecord,renderPrivateComment,managedCommentId} from '../src/lib/feedback-linear/server/records.ts';
import {PrivateHost} from '../scripts/feedback-linear/host.ts';
const exec=promisify(execFile);
const python='/opt/hermes/.venv/bin/python3';
const helper=new URL('../scripts/feedback-linear/host_mcp.py',import.meta.url).pathname;
const unavailable=existsSync(python)&&existsSync('/opt/hermes/tools/mcp_tool.py')?false:'Private Hermes MCP SDK unavailable; native adapter peer not exercised';
const peerProgram=String.raw`import json,sys
calls=[]
mode=sys.argv[2]
issue='44444444-4444-4444-8444-444444444444'
comment={'id':'66666666-6666-4666-8666-666666666666','body':'SYNTHETIC_PRIVATE_BODY_CANARY','author':{'id':'11111111-1111-4111-8111-111111111111'},'parentId':None,'quotedText':None,'onBehalfOf':None,'attachments':[]}
ordinary=dict(comment,id='77777777-7777-4777-8777-777777777777',issue={'id':issue},parent=None,externalThread=None,syncedWith=[],archivedAt=None)
synced=dict(ordinary,id='88888888-8888-4888-8888-888888888888',syncedWith=[{'id':'SYNTHETIC_SYNC'}])
comments=[] if mode=='empty' else [ordinary] if mode=='ordinary' else [synced] if mode=='synced' else [comment,ordinary,synced] if mode=='mixed' else [comment]
for line in sys.stdin:
 q=json.loads(line); method=q.get('method'); p=q.get('params',{}); result=None
 if method=='initialize': result={'protocolVersion':p['protocolVersion'],'capabilities':{'tools':{}},'serverInfo':{'name':'SYNTHETIC_PROVENANCE','version':'1'}}
 elif method=='tools/list': result={'tools':[{'name':n,'description':'Synthetic read-only fixture','inputSchema':{'type':'object'}} for n in ['get_workspace','get_issue','list_comments']]}
 elif method=='tools/call':
  n=p['name']; a=p['arguments']; calls.append({'name':n,'arguments':a})
  if n=='get_workspace': d={'id':'55555555-5555-4555-8555-555555555555','url':'https://linear.app/synthetic'}
  elif n=='get_issue': d={'id':'SYN-1','uuid':issue,'projectId':'22222222-2222-4222-8222-222222222222','teamId':'33333333-3333-4333-8333-333333333333','url':'https://linear.app/synthetic/issue/SYN-1'}
  elif n=='list_comments':
   current=[] if mode=='deleted' and sum(c['name']=='list_comments' for c in calls)>1 else comments
   d={'comments':current,'hasNextPage':False,'totalCount':len(current)}
   if mode=='partial': del d['hasNextPage']
   if mode=='total': d['totalCount']=99
   if mode=='duplicate': d['comments']=[comment,comment]; d['totalCount']=2
   if mode=='cycle': d={'comments':[],'hasNextPage':True,'cursor':'repeated'}
  else: raise AssertionError('Diagnostic attempted an unsupported or write tool')
  result={'content':[{'type':'text','text':json.dumps(d)}],'isError':False}
  with open(sys.argv[1],'w') as f: json.dump(calls,f)
 if 'id' in q: print(json.dumps({'jsonrpc':'2.0','id':q['id'],'result':result}),flush=True)
`;
const driver=String.raw`import asyncio,importlib.util,json,sys
sys.path.insert(0,'/opt/hermes')
spec=importlib.util.spec_from_file_location('host_mcp',sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
from tools.mcp_tool import MCPServerTask
async def main():
 s=MCPServerTask('synthetic_provenance')
 await asyncio.wait_for(s.start({'command':sys.executable,'args':[sys.argv[2],sys.argv[3],sys.argv[4]],'sampling':{'enabled':False},'elicitation':{'enabled':False}}),15)
 try:
  scope={'workspaceId':'55555555-5555-4555-8555-555555555555','workspace':'synthetic','issueId':'44444444-4444-4444-8444-444444444444','projectId':'22222222-2222-4222-8222-222222222222','teamId':'33333333-3333-4333-8333-333333333333','ownerId':'11111111-1111-4111-8111-111111111111'}
  result=await m._dispatch(s,'diagnose',scope)
  with open(sys.argv[3]) as f: calls=json.load(f)
  print(json.dumps({'result':result,'calls':calls}))
 finally: await s.shutdown()
asyncio.run(main())`;
async function diagnose(mode='unknown'){
 const dir=await mkdtemp(path.join(existsSync('/opt/data/tmp')?'/opt/data/tmp':tmpdir(),'atlas-native-provenance-'));
 try{
  const peer=path.join(dir,'peer.py'),calls=path.join(dir,'calls.json');await writeFile(peer,peerProgram);
  const env={...process.env};delete env.PYTHONDONTWRITEBYTECODE;
  const r=await exec(python,['-B','-c',driver,helper,peer,calls,mode],{env,timeout:30000,maxBuffer:200000});
  assert.equal(existsSync(path.join(path.dirname(helper),'__pycache__')),false);
  return JSON.parse(r.stdout);
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('SYNTHETIC actual native SDK: stable paged diagnostic names absent provenance without leaking or inventing source fields',{skip:unavailable},async()=>{
 const {result,calls}=await diagnose();
 assert.deepEqual(result,{schema:'atlas-linear-native-provenance-diagnostic-v1',state:'blocked',reason:'native_comment_lane_unavailable',sourceReadComplete:true,commentCount:1,ordinaryCount:0,unknownCount:1,nonOrdinaryCount:0,missingFieldCounts:{issue:1,parent:1,externalThread:1,syncedWith:1,archivedAt:1}});
 assert.deepEqual(calls.map(c=>c.name),['get_workspace','get_issue','list_comments','list_comments','get_workspace','get_issue']);
 assert.ok(!JSON.stringify(result).includes('CANARY'));
 assert.ok(!JSON.stringify(result).includes('66666666'));
 assert.ok(calls.filter(c=>c.name==='list_comments').every(c=>!Object.hasOwn(c.arguments,'fields')));
});
test('SYNTHETIC actual native SDK: empty comments are unobserved provenance, not positive ordinary evidence',{skip:unavailable},async()=>{
 const {result}=await diagnose('empty');
 assert.equal(result.state,'blocked');assert.equal(result.reason,'native_comment_lane_unobserved');
 assert.equal(result.sourceReadComplete,true);assert.equal(result.commentCount,0);assert.equal(result.ordinaryCount,0);assert.deepEqual(result.missingFieldCounts,{});
});
test('SYNTHETIC actual native SDK: explicit ordinary, unknown, and synced evidence stay distinct; no diagnostic grants trust across fresh clients',{skip:unavailable},async()=>{
 const {result:mixed}=await diagnose('mixed');
 assert.equal(mixed.state,'blocked');assert.equal(mixed.reason,'native_comment_lane_unavailable');
 assert.equal(mixed.commentCount,3);assert.equal(mixed.ordinaryCount,1);assert.equal(mixed.unknownCount,1);assert.equal(mixed.nonOrdinaryCount,1);
 const {result:ordinary}=await diagnose('ordinary');
 assert.equal(ordinary.state,'blocked');assert.equal(ordinary.reason,'native_provenance_diagnostic_only');assert.equal(ordinary.ordinaryCount,1);
 assert.ok(!Object.hasOwn(ordinary,'signature'));assert.ok(!Object.hasOwn(ordinary,'payload'));
 const {result:synced}=await diagnose('synced');
 assert.equal(synced.reason,'native_comment_not_ordinary');assert.equal(synced.nonOrdinaryCount,1);assert.equal(synced.ordinaryCount,0);
 const {result:restarted}=await diagnose();
 assert.equal(restarted.reason,'native_comment_lane_unavailable');assert.equal(restarted.ordinaryCount,0);
});
test('SYNTHETIC actual native SDK: diagnostic refuses partial pages, count conflict, duplicate identities, cursor cycle, or deletion between reads',{skip:unavailable},async()=>{
 for(const [mode,reason] of [['partial','native_pagination_unavailable'],['total','native_total_mismatch'],['duplicate','duplicate_comment'],['cycle','native_cursor_repeated_or_missing'],['deleted','native_changed_during_read']]){
  await assert.rejects(diagnose(mode),error=>{assert.ok(error.stderr.includes('ValueError: '+reason),mode);return true;});
 }
});
test('provenance-smoke is an explicit read-only CLI diagnostic without the activation flag',{skip:unavailable},async()=>{
 const env={...process.env,HERMES_SAFE_MODE:'true'};delete env.ATLAS_LINEAR_HOST_ENABLED;delete env.ATLAS_LINEAR_HOST_WRITES_ENABLED;
 const run=exec(python,['-B',helper,'provenance-smoke'],{env,timeout:10000,maxBuffer:10000});
 run.child.stdin.end('{SYNTHETIC_INVALID_JSON');
 await assert.rejects(run,error=>{
  assert.equal(error.stdout,'');assert.deepEqual(JSON.parse(error.stderr),{state:'blocked',reason:'JSONDecodeError'});return true;
 });
});
test('a valid SYNTHETIC backend HMAC and native parentId:null never replace any required ordinary-lane source field',async()=>{
 const issueId='44444444-4444-4444-8444-444444444444',ownerId='11111111-1111-4111-8111-111111111111',projectId='22222222-2222-4222-8222-222222222222',teamId='33333333-3333-4333-8333-333333333333',workspaceId='55555555-5555-4555-8555-555555555555';
 const scope={issueId,ownerId,projectId,teamId,workspaceId,workspace:'synthetic'},keys=generateKeyPairSync('ed25519'),session=Buffer.alloc(32,19);
 const policy={...scope,hostPublicKey:keys.publicKey,recordKey:createHmac('sha256',session).update('atlas-linear-private-v1').digest()};
 const raw={schema:'atlas-linear-feedback-v1',feedbackId:issueId,version:1,operationId:issueId,ownerLinearId:ownerId,createdAt:new Date().toISOString(),input:{feedback:'SYNTHETIC PRIVATE BODY',processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/',viewport:{width:390,height:1000},theme:'light'}}};
 const record=signPrivateRecord({ownerId,sessionKey:session.toString('base64url')},{...raw,requestHash:requestHash(raw)});
 const source={workspace:{id:workspaceId,url:'https://linear.app/synthetic'},issue:{id:'SYN-1',uuid:issueId,title:'Atlas presentation feedback',description:`Private feedback is held in managed, non-synced comments. Human review is required before any draft PR.\n\natlas-linear-managed-v1:${issueId}:${projectId}:${teamId}`,url:'https://linear.app/synthetic/issue/SYN-1',projectId,teamId,createdById:ownerId,archivedAt:null,updatedAt:new Date().toISOString()},comments:[{id:managedCommentId(issueId,1),body:renderPrivateComment(record),author:{id:ownerId},parentId:null,onBehalfOf:null,quotedText:null,issue:{id:issueId},parent:null,externalThread:null,syncedWith:[],archivedAt:null}],complete:true};
 const read=data=>new PrivateHost({scope,inputPolicy:policy,signingKey:keys.privateKey},{native:async()=>structuredClone(data)}).readNative();
 assert.equal((await read(source)).payload.records.length,1);
 for(const field of ['issue','parent','externalThread','syncedWith','archivedAt','quotedText']){
  const missing=structuredClone(source);delete missing.comments[0][field];await assert.rejects(read(missing));
 }
 const nativeShape=structuredClone(source);
 for(const field of ['issue','parent','externalThread','syncedWith','archivedAt'])delete nativeShape.comments[0][field];
 await assert.rejects(read(nativeShape));
});
