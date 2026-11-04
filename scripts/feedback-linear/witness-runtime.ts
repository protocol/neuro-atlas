import {createServer,type Server} from 'node:http';
import {lstat,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {FileIntakeWitness} from './witness-store';
import {createWitnessHttpHandler} from './witness-http';
import {witnessScopeSchema} from '../../src/lib/feedback-linear/server/witness';

const envName=z.string().regex(/^[A-Z][A-Z0-9_]{0,99}$/);
const configSchema=z.object({root:z.string().refine(path.isAbsolute),scope:witnessScopeSchema,port:z.number().int().min(0).max(65535),readTokenEnv:envName,writeTokenEnv:envName}).strict();
const blocked=():never=>{throw new Error('witness_runtime_blocked');};
type RuntimeResult={state:'disabled'|'initialized'}|{state:'listening';host:'127.0.0.1';port:number;server:Server};
/** Fixed private-volume service entry. Neither command is enabled by default.
 * Serving binds only loopback; public authenticated TLS ingress/custody are separate setup. */
export async function witnessRuntimeMain(args:string[],env:NodeJS.ProcessEnv=process.env):Promise<RuntimeResult>{
 const command=args[0];
 if(command==='initialize'?env.ATLAS_LINEAR_WITNESS_SETUP_ENABLED!=='true':env.ATLAS_LINEAR_WITNESS_ENABLED!=='true')return {state:'disabled'};
 try{
  if(args.length!==1||!['initialize','serve'].includes(command))return blocked();
  const file=env.ATLAS_LINEAR_WITNESS_CONFIG??'';
  if(!path.isAbsolute(file)||await realpath(file)!==file)return blocked();
  const stat=await lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)||stat.uid!==process.getuid?.()||stat.size>16384)return blocked();
  const config=configSchema.parse(JSON.parse((await readFile(file)).toString()));
  if(config.port===0&&env.NODE_ENV!=='test')return blocked();
  if(config.port>0&&config.port<1024)return blocked();
  const witness=new FileIntakeWitness({root:config.root,scope:config.scope});
  if(command==='initialize'){await witness.initialize();return {state:'initialized'};}
  await witness.assertAvailable();
  const readToken=env[config.readTokenEnv]??'',writeToken=env[config.writeTokenEnv]??'';
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(readToken)||!nodeToken(writeToken)||readToken===writeToken)return blocked();
  const handler=createWitnessHttpHandler({witness,readToken,writeToken});
  let minute=Math.floor(Date.now()/60000),requests=0;
  const server=createServer({connectionsCheckingInterval:1000},(request,response)=>{
   const now=Math.floor(Date.now()/60000);if(now!==minute){minute=now;requests=0;}
   if(++requests>120){response.writeHead(429,{'content-type':'application/json','cache-control':'no-store',Connection:'close'});response.end('{"state":"blocked"}');request.resume();return;}
   void handler(request,response);
  });
  server.maxConnections=10;server.maxHeadersCount=24;server.headersTimeout=3000;server.requestTimeout=5000;server.keepAliveTimeout=1000;
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(config.port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  const address=server.address();if(!address||typeof address==='string'){server.close();return blocked();}
  return {state:'listening',host:'127.0.0.1',port:address.port,server};
 }catch{return blocked();}
}
function nodeToken(value:string){return /^[A-Za-z0-9_-]{43,128}$/.test(value);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 witnessRuntimeMain(process.argv.slice(2)).then(result=>{
  if(result.state==='listening'){
   process.stdout.write(JSON.stringify({state:result.state,host:result.host,port:result.port})+'\n');
   const stop=()=>{result.server.closeAllConnections();result.server.close(()=>{process.exitCode=0;});};
   process.once('SIGTERM',stop);process.once('SIGINT',stop);
  }else process.stdout.write(JSON.stringify(result)+'\n');
 }).catch(()=>{process.stderr.write('{"state":"blocked","reason":"witness_runtime_blocked"}\n');process.exitCode=1;});
}
