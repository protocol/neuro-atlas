// SYNTHETIC Linear/OAuth peer. Real loopback HTTP; never a live account acceptance.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

export const ids = {ownerId:'11111111-1111-4111-8111-111111111111',workspaceId:'22222222-2222-4222-8222-222222222222',projectId:'33333333-3333-4333-8333-333333333333',teamId:'44444444-4444-4444-8444-444444444444'};
async function listen(handler) {
  const server=createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
export async function fixture(t) {
  const {loadLinearConfig}=await import('../src/lib/feedback-linear/server/config.ts');
  const {createLinearService}=await import('../src/lib/feedback-linear/server/service.ts');
  const {createLinearRoutes}=await import('../src/lib/feedback-linear/server/routes.ts');
  const state={...ids,workspaceKey:'synthetic-workspace',active:true,guest:false,revoked:false,scope:'read issues:create comments:create',expiresIn:86400,clock:Date.now(),requests:[],codes:new Set(),issues:new Map(),comments:new Map(),reservedComments:new Set(),failComment:false,hideComments:false,failIssueRead:false};
  const peer=await listen(async(req,res)=>{
    let body='';for await(const c of req)body+=c;
    state.requests.push({path:req.url,body,authorization:req.headers.authorization});
    const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    if(req.url==='/token') {
      const form=new URLSearchParams(body),code=form.get('code');
      if(state.codes.has(code))return send({error:'invalid_grant'},400);
      state.codes.add(code);
      return send({access_token:'synthetic-linear-access',refresh_token:'synthetic-refresh-discard',token_type:'Bearer',expires_in:state.expiresIn,scope:state.scope});
    }
    if(req.url==='/revoke'){state.revoked=true;return send({success:true});}
    if(req.url!=='/graphql')return send({},404);
    if(state.revoked)return send({errors:[{extensions:{code:'AUTHENTICATION_ERROR'},message:'synthetic confidential failure'}]},401);
    const {operationName,variables}=JSON.parse(body);
    if(operationName==='AtlasIdentity') return send({data:{viewer:{id:state.ownerId,name:'Synthetic owner',active:state.active,guest:state.guest,organization:{id:state.workspaceId,urlKey:state.workspaceKey}},project:{id:state.projectId,archivedAt:null,teams:{nodes:[{id:state.teamId}],pageInfo:{hasNextPage:false}}},team:{id:state.teamId,archivedAt:null,organization:{id:state.workspaceId}}}});
    if(operationName==='AtlasIssue') {
      if(state.failIssueRead)return send({errors:[{message:'synthetic failed read'}]});
      return send({data:{issues:{nodes:[...state.issues.values()].filter(i=>i.id===variables.id),pageInfo:{hasNextPage:false}}}});
    }
    if(operationName==='AtlasIssueCreate') {
      const i=variables.input;
      if(state.issues.has(i.id))return send({errors:[{message:'duplicate issue'}]});
      const issue={...i,id:i.id,identifier:'SYN-1',url:'https://linear.app/synthetic-workspace/issue/SYN-1/atlas',project:{id:i.projectId},team:{id:i.teamId},creator:{id:state.ownerId},createdAt:new Date(state.clock).toISOString(),updatedAt:new Date(state.clock).toISOString(),archivedAt:null};
      state.issues.set(i.id,issue);return send({data:{issueCreate:{success:true,issue:{id:i.id}}}});
    }
    if(operationName==='AtlasComments')return send({data:{comments:{nodes:state.hideComments?[]:[...state.comments.values()].filter(c=>c.issue.id===variables.id),pageInfo:{hasNextPage:false,endCursor:null}}}});
    if(operationName==='AtlasCommentCreate') {
      const c=variables.input;
      if(state.failComment)return send({errors:[{message:'synthetic comment outage'}]});
      if(state.reservedComments.has(c.id))return send({errors:[{message:'duplicate comment'}]});
      state.reservedComments.add(c.id);
      state.comments.set(c.id,{id:c.id,body:c.body,issue:{id:c.issueId},user:{id:state.ownerId},parent:null,externalThread:null,syncedWith:[],archivedAt:null,createdAt:new Date(state.clock).toISOString()});
      return send({data:{commentCreate:{success:true,comment:{id:c.id}}}});
    }
    if(operationName==='AtlasList')return send({data:{issues:{nodes:[...state.issues.values()].filter(i=>i.project.id===variables.projectId&&i.team.id===variables.teamId&&i.creator.id===variables.ownerId),pageInfo:{hasNextPage:false,endCursor:null}}}});
    return send({errors:[{message:`unknown synthetic operation ${operationName}`}]},400);
  });
  let service;
  const handlers=createLinearRoutes(()=>service);
  const api=await listen(async(req,res)=>{
    try {
      const chunks=[];for await(const c of req)chunks.push(c);
      const request=new Request(`${api.url}${req.url}`,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
      const path=new URL(request.url).pathname.replace('/api/feedback','');
      const action={'/config':'config','/auth/start':'start','/auth/finish':'finish','/auth/callback':'callback','/auth/session':'revoke'}[path];
      const response=action?await handlers[action](request):path===''?await handlers[req.method==='POST'?'create':'list'](request):path.endsWith('/followups')?await handlers.followup(request,path.split('/')[1]):await handlers.status(request,path.slice(1));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500);res.end(String(error));}
  });
  const config=loadLinearConfig({FEEDBACK_ENABLED:'true',FEEDBACK_BACKEND:'linear',FEEDBACK_PUBLIC_ORIGIN:api.url,FEEDBACK_LINEAR_CLIENT_ID:'synthetic-client',FEEDBACK_LINEAR_OWNER_ID:ids.ownerId,FEEDBACK_LINEAR_WORKSPACE_ID:ids.workspaceId,FEEDBACK_LINEAR_WORKSPACE_KEY:state.workspaceKey,FEEDBACK_LINEAR_PROJECT_ID:ids.projectId,FEEDBACK_LINEAR_TEAM_ID:ids.teamId,FEEDBACK_LINEAR_SESSION_KEY:Buffer.alloc(32,7).toString('base64url'),FEEDBACK_LINEAR_SYNC_AUDIT:'ordinary-comments-isolated-v1',FEEDBACK_TEST_MODE:'true',NODE_ENV:'test',NEXT_PUBLIC_BASE_PATH:''});
  assert(config);
  service=createLinearService({config,now:()=>new Date(state.clock),provider:{authorizeUrl:'https://linear.app/oauth/authorize',tokenUrl:`${peer.url}/token`,revokeUrl:`${peer.url}/revoke`,graphqlUrl:`${peer.url}/graphql`}});
  t.after(async()=>{await api.close();await peer.close();});
  const request=(path,{method='GET',body,session,key,headers={}}={})=>fetch(`${api.url}/api/feedback${path}`,{method,headers:{Origin:api.url,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(session?{'X-Atlas-Feedback-Session':session}:{}),...(key?{'Idempotency-Key':key}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {state,request,config,service,handlers,api,peer};
}
export async function signIn(f) {
  const {randomBytes,createHash}=await import('node:crypto');
  const state=randomBytes(32).toString('base64url'),codeVerifier=randomBytes(32).toString('base64url');
  const r=await f.request('/auth/start',{method:'POST',body:{state,codeChallenge:createHash('sha256').update(codeVerifier).digest('base64url')}});
  assert.equal(r.status,200);const start=await r.json();
  const body={state,codeVerifier,code:randomUUID(),transaction:start.transaction};
  const finish=await f.request('/auth/finish',{method:'POST',body});
  assert.equal(finish.status,200);return {auth:await finish.json(),start,body};
}
export const input=(feedback='PRIVATE-SYNTHETIC-CANARY')=>({feedback,processingConsent:{approved:true,policyVersion:'atlas-feedback-linear-v1'},context:{route:'/field-velocity',viewport:{width:390,height:800},theme:'dark',element:{selector:'main > h1:nth-of-type(1)',tagName:'h1',classes:['private-canary-class']}}});
