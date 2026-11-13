// Disposable local-only actual Next UI + HTTP fixture. Only Linear/proxy auth is synthetic.
import {execFileSync,spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [repo,revision,name,portText]=process.argv.slice(2);
const port=Number(portText);
if(!repo||!/^[0-9a-f]{40}$/.test(revision??'')||!['baseline','candidate'].includes(name)||![45731,45732].includes(port))throw Error('fixture_args');
const base='/opt/data/tmp/atlas-feedback-only-20261113';
const root=resolve(base,name+'-fixture');
await mkdir(root,{recursive:false});
execFileSync('sh',['-c',`git archive ${revision} | tar -x -C "$1"`,'fixture',root],{cwd:repo});
await cp(resolve(repo,'node_modules'),root+'/node_modules',{recursive:true,dereference:false});
const server=await readFile(root+'/src/lib/feedback-public/server.ts');
await writeFile(root+'/src/proxy.ts',`import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
export function proxy(req:NextRequest){if(process.env.ATLAS_LOCAL_QA!=='feedback-only-20261113'||req.headers.get('host')!=='127.0.0.1:${port}')return new NextResponse('Fixture refused',{status:403});const r=NextResponse.next();r.headers.set('x-atlas-qa-source','${revision}');return r;}
export const config={matcher:['/','/((?!_next/static|_next/image|favicon.ico).*)']};\n`);
await writeFile(root+'/src/lib/feedback-public/runtime.ts',`import {createPublicFeedbackRoutes} from './server';
const g=globalThis as typeof globalThis & {__atlasPublicQA?:any};
const state=g.__atlasPublicQA??={records:new Map(),calls:0,mutations:0,failNext:0};
const provider:typeof fetch=async(url,options)=>{
 if(url!=='https://api.linear.app/graphql')throw Error('Fixture refused external URL');
 state.calls++;if(state.failNext>0){state.failNext--;return Response.json({errors:[{message:'Synthetic provider failure'}]},{status:503});}
 const body=JSON.parse(options!.body as string);
 if(body.query.includes('mutation')){const i=body.variables.input;if(state.records.has(i.id))return Response.json({errors:[{message:'Synthetic duplicate'}]});state.records.set(i.id,{id:i.id,title:i.title,description:i.description,team:{id:i.teamId},project:{id:i.projectId},state:{id:i.stateId},priority:i.priority,assignee:null});state.mutations++;return Response.json({data:{issueCreate:{success:true,issue:{id:i.id}}}});}
 return Response.json({data:{issues:{nodes:state.records.has(body.variables.id)?[state.records.get(body.variables.id)]:[]}}});
};
const routes=createPublicFeedbackRoutes({env:{NODE_ENV:'test',FEEDBACK_PUBLIC_INTAKE_ENABLED:'true',FEEDBACK_LINEAR_API_KEY:'synthetic-local-only-not-a-credential',FEEDBACK_PUBLIC_INTAKE_TEST_MODE:'true',FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN:'http://127.0.0.1:${port}'},fetch:provider});
export function publicFeedbackRoutes(){return routes;}\n`);
await mkdir(root+'/src/app/api/qa-feedback-state',{recursive:true});
await writeFile(root+'/src/app/api/qa-feedback-state/route.ts',`import '../../../lib/feedback-public/runtime';
export const dynamic='force-dynamic';
const state=()=> (globalThis as any).__atlasPublicQA;
export async function GET(){const s=state();return Response.json({syntheticProvider:true,externalCalls:0,calls:s?.calls??0,mutations:s?.mutations??0,records:s?[...s.records.values()]:[]});}
export async function POST(request:Request){const v=await request.json();const s=state();if(!s||Object.keys(v).join(',')!=='failNext'||![0,1].includes(v.failNext))return Response.json({error:'fixture_rejected'},{status:400});s.failNext=v.failNext;return Response.json({configured:true});}\n`);
await writeFile(base+'/'+name+'-manifest.json',JSON.stringify({revision,root,port,actualApp:true,syntheticLinear:true,syntheticLocalProxy:true,serverHash:createHash('sha256').update(server).digest('hex')},null,2));
const env={PATH:process.env.PATH,HOME:'/opt/data/home',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_BASE_PATH:'/neuro-atlas',ATLAS_SITE_URL:'https://www.plneuro.xyz',ATLAS_LOCAL_QA:'feedback-only-20261113',WATCHPACK_POLLING:'true',UV_THREADPOOL_SIZE:'1'};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env,stdio:'inherit'});
console.log(JSON.stringify({pid:child.pid,root,revision,port}));
process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGINT'));
child.on('close',code=>{process.exitCode=code??1;});
