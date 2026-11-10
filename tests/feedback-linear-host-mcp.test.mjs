import test from 'node:test';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const helper=new URL('../scripts/feedback-linear/host_mcp.py',import.meta.url).pathname;
test('SYNTHETIC MCP peer: actual Hermes client exhausts pages, rejects cursor cycles, scopes before read, and exact readbacks ordinary comment',{skip:existsSync('/opt/hermes/.venv/bin/python3')&&existsSync('/opt/hermes/tools/mcp_tool.py')?false:'Private HOST executables unavailable; transport integration not exercised here'},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'host-mcp-peer-'));
 try {
  const peer=path.join(dir,'peer.py');
  await writeFile(peer,`import sys,json
comments=[]
mode=sys.argv[1] if len(sys.argv)>1 else ''
for line in sys.stdin:
 q=json.loads(line); method=q.get('method'); p=q.get('params',{}); result=None
 if method=='initialize': result={'protocolVersion':p['protocolVersion'],'capabilities':{'tools':{}},'serverInfo':{'name':'SYNTHETIC','version':'1'}}
 elif method=='tools/list': result={'tools':[{'name':n,'description':'Synthetic fixture only','inputSchema':{'type':'object'}} for n in ['get_workspace','get_issue','list_comments','save_comment']]}
 elif method=='tools/call':
  n=p['name']; a=p['arguments']
  if n=='get_workspace': d={'id':'55555555-5555-4555-8555-555555555555','url':'https://linear.app/synthetic'}
  elif n=='get_issue': d={'uuid':a['id'],'id':'SYN-1','projectId':'22222222-2222-4222-8222-222222222222','teamId':'33333333-3333-4333-8333-333333333333','url':'https://linear.app/synthetic/issue/SYN-1','updatedAt':'2026-11-04T00:00:00Z'}
  elif n=='save_comment':
   d={'id':'66666666-6666-4666-8666-666666666666'}; comments.append(dict(d,body=a['body'],issue={'id':a['issueId']},parent=None,externalThread=None,syncedWith=[],archivedAt=None,quotedText=None))
  elif n=='list_comments':
   d={'comments':comments if a.get('cursor') else [],'hasNextPage':not bool(a.get('cursor'))}
   if mode=='cycle': d['hasNextPage']=True
   if mode=='total': d['totalCount']=99
   if d['hasNextPage']: d['cursor']='page2'
  result={'content':[{'type':'text','text':json.dumps(d)}],'isError':False}
 if 'id' in q: print(json.dumps({'jsonrpc':'2.0','id':q['id'],'result':result}),flush=True)
`);
  const program=String.raw`import sys,asyncio,json,importlib.util
sys.path.insert(0,'/opt/hermes')
spec=importlib.util.spec_from_file_location('host_mcp',sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
from tools.mcp_tool import MCPServerTask
async def main():
 s=MCPServerTask('synthetic_host_fixture')
 await asyncio.wait_for(s.start({'command':sys.executable,'args':[sys.argv[2]],'sampling':{'enabled':False},'elicitation':{'enabled':False}}),15)
 try:
  scope={'workspaceId':'55555555-5555-4555-8555-555555555555','workspace':'synthetic','issueId':'44444444-4444-4444-8444-444444444444','projectId':'22222222-2222-4222-8222-222222222222','teamId':'33333333-3333-4333-8333-333333333333','ownerId':'11111111-1111-4111-8111-111111111111'}
  a=await m._dispatch(s,'read',scope)
  b=await m._dispatch(s,'comment',dict(scope,body='atlas-linear-proposal-v1\nSYNTHETIC'))
  print(json.dumps({'read':a,'write':b}))
 finally: await s.shutdown()
 for mode in ['cycle','total','excluded','disabled','untrusted']:
  peer=MCPServerTask('synthetic_'+mode)
  config={'command':sys.executable,'args':[sys.argv[2],mode],'sampling':{'enabled':False},'elicitation':{'enabled':False}}
  if mode=='excluded': config['tools']={'include':[]}
  if mode=='disabled': config['enabled']=False
  if mode=='untrusted': config['trust']='untrusted'
  await asyncio.wait_for(peer.start(config),15)
  try:
   try: await m._dispatch(peer,'read',scope)
   except ValueError as e: print(json.dumps({'blocked':mode,'reason':str(e)}),file=sys.stderr)
   else: raise AssertionError('incomplete native comments were admitted: '+mode)
  finally: await peer.shutdown()
asyncio.run(main())`;
  const env={...process.env};delete env.PYTHONDONTWRITEBYTECODE;
  const r=await exec('/opt/hermes/.venv/bin/python3',['-B','-c',program,helper,peer],{env,timeout:45000,maxBuffer:200000});
  assert.equal(existsSync(path.join(path.dirname(helper),'__pycache__')),false,'trusted checks must not dirty the pinned source with imported helper bytecode');
  const data=JSON.parse(r.stdout.trim());
  assert.equal(data.read.complete,true);assert.equal(data.read.comments.length,0);
  assert.equal(data.write.body,'atlas-linear-proposal-v1\nSYNTHETIC');assert.equal(data.write.id,'66666666-6666-4666-8666-666666666666');assert.match(r.stderr,/native_cursor_repeated_or_missing/);assert.match(r.stderr,/native_total_mismatch/);assert.match(r.stderr,/native_tool_filtered/);assert.match(r.stderr,/native_client_disabled_or_untrusted/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
