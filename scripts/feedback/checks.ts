import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { minimalEnvironment } from './git-sandbox';
import type { CheckReceipt } from './ports';
const COMMANDS=[['--ignore-scripts','test'],['--ignore-scripts','run','typecheck'],['--ignore-scripts','run','build']] as const;
export async function runTrustedChecks(cwd:string,phase:'baseline'|'candidate',options:{timeoutMs:number;signal?:AbortSignal}):Promise<CheckReceipt> {
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs<=0 || options.timeoutMs>300000) throw new Error('checks_failed');
  const hashes:string[]=[];
  for(const args of COMMANDS) {
    options.signal?.throwIfAborted();
    hashes.push(await new Promise<string>((resolve,reject)=>{
      const hash=createHash('sha256');let bytes=0,killed=false;
      const child=spawn('/usr/local/bin/npm',[...args],{cwd,env:{...minimalEnvironment(),NODE_ENV:args.at(-1)==='build'?'production':'test',PATH:'/usr/local/bin:/usr/bin:/bin',NEXT_TELEMETRY_DISABLED:'1',npm_config_userconfig:'/dev/null',npm_config_globalconfig:'/nonexistent/npmrc-global'},shell:false,detached:true,stdio:['ignore','pipe','pipe']});
      const kill=()=>{killed=true;if(child.pid)try{process.kill(-child.pid,'SIGKILL')}catch{}};
      const timeout=setTimeout(kill,options.timeoutMs);options.signal?.addEventListener('abort',kill,{once:true});
      for(const stream of [child.stdout,child.stderr])stream.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>1048576)kill();else hash.update(chunk)});
      child.once('error',()=>{clearTimeout(timeout);options.signal?.removeEventListener('abort',kill);reject(new Error('checks_failed'))});
      child.once('close',(code)=>{clearTimeout(timeout);options.signal?.removeEventListener('abort',kill);if(killed||code!==0)reject(new Error('checks_failed'));else resolve(hash.digest('hex'))});
    }));
  }
  return {phase,passed:true,commands:['test','typecheck','build'],digest:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')};
}
