// Disposable loopback-only actual Next → HTTP synthetic Linear/image-storage fixture.
// No provider credential, Vercel setting, hosted deployment or production proxy edit.
import {cpSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
const source=process.cwd(),out=resolve(process.env.FEEDBACK_SCREENSHOT_QA_OUT??'');
if(!process.env.FEEDBACK_SCREENSHOT_QA_OUT||out.startsWith(source+'/')||existsSync(out+'/runtime'))throw Error('Use a new private output directory outside the repository');
const port=Number(process.env.FEEDBACK_SCREENSHOT_QA_PORT??35643),peerPort=port+1,origin=`http://127.0.0.1:${port}`,root=out+'/runtime';
mkdirSync(out,{recursive:true});cpSync(source,root,{recursive:true,filter:p=>!['.git','.next','node_modules'].includes(p.split('/').at(-1))});
cpSync(source+'/node_modules',root+'/node_modules',{recursive:true});mkdirSync(out+'/images');
const records=new Map(),images=new Map();let creates=0,reads=0,assetReads=0,uploads=0,failNext=false;
const peer=createServer(async(req,res)=>{
 try{
  if(req.url==='/state'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({creates,reads,assetReads,uploads,records:[...records.values()],images:[...images].map(([url,b])=>({url,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}))}));}
  if(req.url==='/control'){failNext=true;return res.end('ok');}
  if(req.url.startsWith('/upload/')){
   if(req.method!=='PUT'||req.headers.authorization)throw Error('invalid storage transport');
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks),path=req.url.slice(8).split('?')[0],url='https://uploads.linear.app/'+path;
   images.set(url,bytes);writeFileSync(`${out}/images/${path.split('/')[1]}.png`,bytes);uploads++;res.writeHead(200);return res.end();
  }
  if(req.url.startsWith('/asset/')){
   const url='https://uploads.linear.app/'+req.url.slice(7);assetReads++;
   if(req.headers.authorization!=='synthetic-fixture-only'){res.writeHead(401);return res.end();}
   const bytes=images.get(url);res.writeHead(bytes?200:404,{'Content-Type':'image/png'});return res.end(bytes);
  }
  if(req.url!=='/graphql'||req.headers.authorization!=='synthetic-fixture-only'){res.writeHead(403);return res.end();}
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
  res.setHeader('Content-Type','application/json');
  if(body.query.includes('fileUpload(')){
   if(body.variables.makePublic!==false)throw Error('public upload forbidden');
   const path=`11111111-1111-4111-8111-111111111111/${randomUUID()}/${randomUUID()}`;
   return res.end(JSON.stringify({data:{fileUpload:{success:true,uploadFile:{assetUrl:'https://uploads.linear.app/'+path,uploadUrl:'https://storage.googleapis.com/linear-fixture/'+path+'?signature=synthetic',size:body.variables.size,contentType:'image/png',headers:[{key:'x-goog-content-length-range',value:String(body.variables.size)+','+String(body.variables.size)}]}}}}));
  }
  if(body.query.includes('mutation')){
   const i=body.variables.input;if(records.has(i.id))return res.end(JSON.stringify({errors:[{}]}));
   if(i.description.includes('data:image'))throw Error('base64 import is not this fixture contract');
   creates++;records.set(i.id,{...i,team:{id:i.teamId},project:{id:i.projectId},state:{id:i.stateId},assignee:null});
   return res.end(JSON.stringify({data:{issueCreate:{success:true,issue:{id:i.id}}}}));
  }
  reads++;if(failNext&&records.has(body.variables.id)){failNext=false;res.writeHead(503);return res.end('{}');}
  res.end(JSON.stringify({data:{issues:{nodes:records.has(body.variables.id)?[records.get(body.variables.id)]:[]}}}));
 }catch{res.writeHead(500);res.end('{}');}
});
await new Promise(resolve=>peer.listen(peerPort,'127.0.0.1',resolve));
writeFileSync(root+'/src/lib/feedback-public/runtime.ts',`import {createPublicFeedbackRoutes} from './server';
const routes=createPublicFeedbackRoutes({env:{NODE_ENV:'test',FEEDBACK_PUBLIC_INTAKE_TEST_MODE:'true',FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN:'${origin}',FEEDBACK_PUBLIC_INTAKE_ENABLED:'true',FEEDBACK_LINEAR_API_KEY:'synthetic-fixture-only'},fetch:async(url,options)=>{
 const u=String(url);if(u==='https://api.linear.app/graphql')return fetch('http://127.0.0.1:${peerPort}/graphql',options);
 if(u.startsWith('https://storage.googleapis.com/linear-fixture/'))return fetch('http://127.0.0.1:${peerPort}/upload/'+u.slice('https://storage.googleapis.com/linear-fixture/'.length),options);
 if(u.startsWith('https://uploads.linear.app/'))return fetch('http://127.0.0.1:${peerPort}/asset/'+u.slice('https://uploads.linear.app/'.length),options);
 throw Error('No external fixture egress');
}});export function publicFeedbackRoutes(){return routes;}
`);
writeFileSync(root+'/src/proxy.ts',`import {NextResponse} from 'next/server';import type {NextRequest} from 'next/server';
export function proxy(r:NextRequest){if(r.headers.get('host')!=='127.0.0.1:${port}')return new NextResponse('Loopback fixture only',{status:403});const response=NextResponse.next();response.headers.set('X-Robots-Tag','noindex, nofollow');response.headers.set('Cache-Control','private, no-store');return response;}
export const config={matcher:['/','/:path*']};
`);
const child=spawn(process.execPath,[root+'/node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env:{...process.env,NEXT_PUBLIC_BASE_PATH:'/neuro-atlas',NEXT_PUBLIC_SITE_URL:undefined,NEXT_PUBLIC_ATLAS_GA_ID:'',FEEDBACK_ENABLED:'false'},stdio:'inherit'});
console.log(JSON.stringify({fixture:origin,peer:`http://127.0.0.1:${peerPort}`,output:out,provider:'synthetic HTTP only'}));
const close=()=>{child.kill('SIGTERM');peer.close();};process.once('SIGTERM',close);process.once('SIGINT',close);
child.once('exit',code=>{peer.close();process.exitCode=code??1;});
