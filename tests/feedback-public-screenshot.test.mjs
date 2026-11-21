import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createPublicFeedbackRoutes} from '../src/lib/feedback-public/server.ts';
const env={FEEDBACK_PUBLIC_INTAKE_ENABLED:'true',FEEDBACK_LINEAR_API_KEY:'synthetic-only'};
const key='58dc602e-9c9d-4bcb-95b1-285c521554da';
const png=await sharp({create:{width:240,height:120,channels:3,background:'#1597ff'}}).png().toBuffer();
const screenshot={status:'captured',mimeType:'image/png',width:240,height:120,data:png.toString('base64')};
const input={feedback:'Synthetic screenshot integration',context:{route:'/field-velocity',viewport:{width:390,height:700},theme:'light',element:{selector:'html:nth-of-type(1) > body:nth-of-type(1) > svg:nth-of-type(1)',tagName:'svg'}},screenshot};
const asset='https://uploads.linear.app/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333';
function fixture({privateAsset=true,wrongBytes=false,assetUrl=asset,uploadUrl='https://storage.googleapis.com/linear-test'+new URL(asset).pathname+'?signature=synthetic',uploadHeaders=[],uploadStatus=200}={}){
 const records=new Map(),calls=[];let uploaded=false;
 return {records,calls,fetch:async(url,options={})=>{
  calls.push({url,options});
  if(url==='https://storage.googleapis.com/linear-test'+new URL(asset).pathname+'?signature=synthetic'){assert.equal(options.method,'PUT');assert.equal(new Headers(options.headers).has('Authorization'),false);assert.deepEqual(Buffer.from(options.body),png);uploaded=true;return new Response(null,{status:uploadStatus});}
  if(url!=='https://api.linear.app/graphql'){
   assert.equal(url,assetUrl);assert.equal(options.redirect,'error');
   if(!options.headers?.Authorization)return new Response(null,{status:privateAsset?401:200});
   assert.equal(options.headers.Authorization,env.FEEDBACK_LINEAR_API_KEY);
   return new Response(wrongBytes?new Uint8Array([1,2,3]):png,{headers:{'Content-Type':'image/png'}});
  }
  const body=JSON.parse(options.body);
  if(body.query.includes('fileUpload(')){assert.equal(body.variables.makePublic,false);return Response.json({data:{fileUpload:{success:true,uploadFile:{assetUrl,uploadUrl,headers:uploadHeaders,contentType:'image/png',size:png.length}}}});}
  if(body.query.includes('mutation')){
   if(body.variables.input.description.includes('![Selected element screenshot]'))assert.equal(uploaded,true);
   const i=body.variables.input;
   if(records.has(i.id))return Response.json({errors:[{message:'duplicate'}]});
   const description=i.description;
   records.set(i.id,{...i,description,team:{id:i.teamId},project:{id:i.projectId},state:{id:i.stateId},assignee:null});
   return Response.json({data:{issueCreate:{success:true,issue:{id:i.id}}}});
  }
  return Response.json({data:{issues:{nodes:records.has(body.variables.id)?[records.get(body.variables.id)]:[]}}});
 }};
}
const request=value=>new Request('https://www.plneuro.xyz/neuro-atlas/api/feedback/public',{method:'POST',headers:{Origin:'https://www.plneuro.xyz','Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(value)});
test('PNG goes through native private Linear fileUpload and PUT; exact note/context and independently private bytes must read back before receipt',async()=>{
 const f=fixture(),routes=createPublicFeedbackRoutes({env,fetch:f.fetch});
 const response=await routes.submit(request(input));assert.equal(response.status,202);
 assert.deepEqual(await response.json(),{saved:true});assert.equal(f.records.size,1);
 const created=JSON.parse(f.calls.find(c=>typeof c.options.body==='string'&&JSON.parse(c.options.body).query.includes('issueCreate')).options.body).variables.input;
 assert.ok(created.description.includes(input.feedback));assert.ok(created.description.includes(JSON.stringify(input.context)));
 assert.match(created.description,/!\[Selected element screenshot\]\(https:\/\/uploads\.linear\.app\//);
 assert.ok(f.calls.some(c=>c.url===asset&&!c.options.headers?.Authorization),'anonymous custody check');
 assert.ok(f.calls.some(c=>c.url===asset&&c.options.headers?.Authorization),'authenticated byte verification');
 const retry=createPublicFeedbackRoutes({env,fetch:f.fetch});assert.equal((await retry.submit(request(input))).status,202);
 assert.equal(f.calls.filter(c=>typeof c.options.body==='string'&&JSON.parse(c.options.body).query.includes('issueCreate')).length,1);
 const changed=await sharp(png).negate().png().toBuffer();
 assert.equal((await retry.submit(request({...input,screenshot:{...screenshot,data:changed.toString('base64')}}))).status,409);
});
test('public, altered and non-Linear images never confirm or fetch an untrusted URL',async()=>{
 for(const options of [{privateAsset:false},{wrongBytes:true},{assetUrl:'http://127.0.0.1/internal'},{assetUrl:'https://uploads.linear.app.evil.example/image'}]){
  const f=fixture(options);const response=await createPublicFeedbackRoutes({env,fetch:f.fetch}).submit(request(input));
  assert.notEqual(response.status,202,JSON.stringify(options));
  assert.ok(f.calls.every(c=>['https://api.linear.app/graphql',asset,'https://storage.googleapis.com/linear-test'+new URL(asset).pathname+'?signature=synthetic'].includes(c.url)),'no untrusted URL fetch');
 }
});
test('reject non-PNG, malformed base64, byte/dimension mismatch, giant dimensions and unknown capture keys before provider access',async()=>{
 for(const change of [{mimeType:'image/svg+xml'},{data:'https://evil.example/image'},{data:'AAAA'},{width:241},{height:0},{width:20000},{data:'A'.repeat(1400000)},{url:'https://evil.example'}]){
  const f=fixture();const response=await createPublicFeedbackRoutes({env,fetch:f.fetch}).submit(request({...input,screenshot:{...screenshot,...change}}));
  assert.ok([400,413].includes(response.status));assert.equal(f.calls.length,0,JSON.stringify(change));
 }
});
test('explicit unavailable capture is logged as such, never invented as an image',async()=>{
 const f=fixture();const response=await createPublicFeedbackRoutes({env,fetch:f.fetch}).submit(request({...input,screenshot:{status:'unavailable',reason:'capture_failed'}}));
 assert.equal(response.status,202);const description=[...f.records.values()][0].description;
 assert.match(description,/Screenshot unavailable: capture_failed/);assert.doesNotMatch(description,/!\[/);
});

test('unsafe signed destinations/headers and failed PUT never authorize issue creation',async()=>{
 for(const options of [
  {uploadUrl:'http://127.0.0.1/internal'},
  {uploadUrl:'https://storage.googleapis.com.evil.example/'+new URL(asset).pathname+'?x=y'},
  {uploadUrl:'https://storage.googleapis.com/linear-test/not-the-asset?signature=x'},
  {uploadUrl:'https://uploads.linear.app'+new URL(asset).pathname},
  {uploadHeaders:[{key:'Authorization',value:'must-not-forward'}]},
  {uploadStatus:403},
 ]){
  const f=fixture(options);const response=await createPublicFeedbackRoutes({env,fetch:f.fetch}).submit(request(input));
  assert.equal(response.status,503);assert.equal(f.records.size,0);
  assert.ok(f.calls.every(c=>c.url==='https://api.linear.app/graphql'||c.url==='https://storage.googleapis.com/linear-test'+new URL(asset).pathname+'?signature=synthetic'));
 }
});
