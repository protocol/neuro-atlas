import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

export type NativeAstraRequest={instructions:string;user:string;maxInputTokens:number;maxBodyBytes:number;maxResponseBytes:number;timeoutMs:number};
export type NativeAstraBounds={timeoutMs:number;maxResponseBytes:number};
export type NativeAstraRunner=(request:NativeAstraRequest,bounds:NativeAstraBounds,signal?:AbortSignal)=>Promise<unknown>;
/** Fixed executable/adjacent reviewed helper, no shell, agent, endpoint, model or module hook. */
async function nativeProcess(operation:'--complete'|'--preflight',stdin:string,bounds:NativeAstraBounds,signal?:AbortSignal):Promise<unknown>{
 if(!Number.isSafeInteger(bounds.timeoutMs)||bounds.timeoutMs<1||bounds.timeoutMs>120000||!Number.isSafeInteger(bounds.maxResponseBytes)||bounds.maxResponseBytes<1||bounds.maxResponseBytes>262144||Buffer.byteLength(stdin)>131072)throw new Error('native_input_limit');
 signal?.throwIfAborted();
 if((process.env.HERMES_HOME!==undefined&&process.env.HERMES_HOME!=='/opt/data')||(process.env.HERMES_PROFILE!==undefined&&process.env.HERMES_PROFILE!=='default'))throw new Error('native_profile_unavailable');
 return new Promise((resolve,reject)=>{
  const env:NodeJS.ProcessEnv={PATH:'/usr/bin:/bin',HOME:'/opt/data/home',HERMES_HOME:'/opt/data',HERMES_PROFILE:'default',LANG:'C.UTF-8',NODE_ENV:'production'};
  for(const name of ['SSL_CERT_FILE','SSL_CERT_DIR','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy'])if(process.env[name]!==undefined)env[name]=process.env[name];
  const child=spawn('/opt/hermes/.venv/bin/python3',['-I','-B',fileURLToPath(new URL('./astra_native.py',import.meta.url)),operation],{stdio:['pipe','pipe','pipe'],env,detached:true,shell:false});
  let size=0,settled=false;const chunks:Buffer[]=[];
  const kill=()=>{try{if(child.pid)process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{child.kill('SIGKILL');}};
  const finish=(error?:Error)=>{
   if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   if(error){kill();reject(error);return;}
   try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new Error('provider_unknown_outcome'));}
  };
  const abort=()=>finish(new Error('native_transport_outcome_unknown'));
  const timer=setTimeout(abort,bounds.timeoutMs);
  child.stdout.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>bounds.maxResponseBytes)finish(new Error('native_response_limit'));else chunks.push(chunk);});
  child.stderr.resume();child.once('error',()=>finish(new Error('native_transport_unavailable')));child.once('close',code=>finish(code===0?undefined:new Error('native_transport_outcome_unknown')));
  child.stdin.on('error',()=>{});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}child.stdin.end(stdin);
 });
}
export const nativeAstraCompletion:NativeAstraRunner=(request,bounds,signal)=>nativeProcess('--complete',JSON.stringify(request),bounds,signal);
/** Resolution only, not a model call or a claim about server model/account usage. */
export async function nativeAstraPreflight(){return z.object({authRoute:z.literal('native-hermes-openai-codex'),resolvedModel:z.literal('gpt-6-astra'),ready:z.literal(true)}).strict().parse(await nativeProcess('--preflight','',{timeoutMs:15000,maxResponseBytes:8192}));}
