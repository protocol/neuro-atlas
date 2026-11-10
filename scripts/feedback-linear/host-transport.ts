import {spawn} from 'node:child_process';
import {readFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {HostPorts} from './host';
import type {SlackPorts} from './host-slack';

export type LivePorts=HostPorts&SlackPorts&{sendRoot:(channel:string,text:string)=>Promise<unknown>;sendFile:(channel:string,thread:string,file:string,caption:string)=>Promise<unknown>};
const fail=(why:string):never=>{throw new Error('host_transport:'+why);};
/** Fixed executables only; no shell. Child stderr is never echoed (may contain private data).
 * Broker/native OAuth secrets are consumed by their existing clients, not read by this adapter.
 */
async function jsonProcess(command:string,args:string[],stdin='',timeout=120000):Promise<unknown>{
  return new Promise((resolve,reject)=>{
    // Do not hand model, HOST/capture/publisher signing or GitHub credentials to a transport.
    // Hermes loads its own native OAuth context internally; no MCP token is copied here.
    const names=['PATH','HOME','USER','LANG','LC_ALL','TZ','HERMES_HOME','HERMES_PROFILE','HERMES_SAFE_MODE','SSL_CERT_FILE','SSL_CERT_DIR','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','HENRY_ROUTER_OUTBOUND_URL','ATLAS_LINEAR_HOST_ENABLED','ATLAS_LINEAR_HOST_WRITES_ENABLED'];
    if(command==='/usr/local/bin/henry-out')names.push('USER_ID','HENRY_OUTBOUND_SECRET');
    const environment:NodeJS.ProcessEnv={NODE_ENV:process.env.NODE_ENV??'production'};for(const name of names)if(process.env[name]!==undefined)environment[name]=process.env[name];
    const child=spawn(command,args,{stdio:['pipe','pipe','pipe'],env:environment});
    let output='',size=0,settled=false;
    const done=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill('SIGKILL');reject(error);}else{try{resolve(JSON.parse(output));}catch{reject(new Error('host_transport:invalid_json'));}}};
    const timer=setTimeout(()=>done(new Error('host_transport:timeout_outcome_unknown')),timeout);
    child.stdout.on('data',(b:Buffer)=>{size+=b.length;if(size>8*1024*1024)done(new Error('host_transport:output_budget'));else output+=b.toString();});
    child.stderr.resume();
    child.once('error',()=>done(new Error('host_transport:executable_unavailable')));
    child.once('close',code=>done(code===0?undefined:new Error('host_transport:rejected_or_setup_missing')));
    child.stdin.on('error',()=>{});child.stdin.end(stdin);
  });
}
const writes=()=>{if(process.env.ATLAS_LINEAR_HOST_WRITES_ENABLED!=='true')fail('writes_disabled');};
/** No runtime URL/command/module option. The existing clients own their broker routing. */
export function livePorts():LivePorts{
  return {
    native:(op,payload)=>{if(op==='comment')writes();return jsonProcess('/opt/hermes/.venv/bin/python3',[fileURLToPath(new URL('./host_mcp.py',import.meta.url)),op],JSON.stringify(payload),180000);},
    search:b=>jsonProcess('/usr/local/bin/henry-slack-search',['','--channel',b.channelId,'--after',b.after,'--before',b.before,'--limit','2000','--per-channel','200','--max-threads','200','--timeout','12'], '',15000),
    fetchFile:async s=>{
      const value=await jsonProcess('/usr/local/bin/henry-slack-search',['--fetch-file',s.channelId,s.messageId,'--thread-ts',s.threadId,'--file-id',s.fileId,'--timeout','10'],'',12000) as {files?:{id?:string;container_path?:string;reason?:string}[]};
      if(!Array.isArray(value.files)||value.files.length!==1) return fail('file_unavailable');
      const f=value.files[0];
      if(f.id!==s.fileId||f.reason||typeof f.container_path!=='string'||!path.isAbsolute(f.container_path)||!f.container_path.startsWith('/opt/data/inbound-files/'))return fail('file_source');
      const info=await lstat(f.container_path),real=await realpath(f.container_path);
      if(!info.isFile()||info.isSymbolicLink()||real!==f.container_path||info.size<45||info.size>16*1024*1024)return fail('file_bytes');
      return readFile(f.container_path);
    },
    sendRoot:(channel,text)=>{writes();return jsonProcess('/usr/local/bin/henry-out',['reply','--channel',channel,'--verbatim','--no-unfurl','--no-ask'],text,30000);},
    sendFile:(channel,thread,file,caption)=>{writes();return jsonProcess('/usr/local/bin/henry-out',['file','--in-reply-to','atlas-private-host','--channel',channel,'--thread',thread,'--path',file,'--comment',caption,'--verbatim'],'',180000);},
  };
}
