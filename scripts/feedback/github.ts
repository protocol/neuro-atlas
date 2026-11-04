import { allowedOrigin,boundedJson } from './http';
export const REPOSITORY='protocol/neuro-atlas';
export type GitHubConfig={origin:string;fixture?:boolean;token:()=>string};
export class GitHubRest {
  constructor(private config:GitHubConfig,private beforeWrite:()=>Promise<void>) {
    if (!allowedOrigin(config.origin,'https://api.github.com',config.fixture)) throw new Error('publisher_disabled');
  }
  async request(method:'GET'|'POST'|'PATCH',path:string,body?:unknown,optional=false):Promise<any> {
    if(!path.startsWith('/') || /[\\\r\n]/.test(path))throw new Error('publisher_rejected');
    const allowed=method==='GET' ? /^\/(?:git\/ref\/heads\/(?:main|atlas-feedback\/[0-9a-f-]{36})|git\/commits\/[0-9a-f]{40}|git\/trees\/[0-9a-f]{40}\?recursive=1|pulls(?:\/[1-9]\d*|\?state=all&head=[^&]+&base=main&per_page=100))$/.test(path) : method==='POST' ? ['/git/trees','/git/commits','/git/refs','/pulls'].includes(path) : /^\/(?:git\/refs\/heads\/atlas-feedback\/[0-9a-f-]{36}|pulls\/[1-9]\d*)$/.test(path);
    if(!allowed)throw new Error('publisher_rejected');
    if(method!=='GET')await this.beforeWrite();
    try {
      const token=this.config.token();if(!token)throw new Error();
      const response=await fetch(this.config.origin+'/repos/'+REPOSITORY+path,{method,headers:{accept:'application/vnd.github+json','x-github-api-version':'2022-11-28',authorization:'Bearer '+token,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
      if(optional && response.status===404){await response.body?.cancel();return null;}
      return await boundedJson(response,1048576);
    }catch{throw new Error('publisher_remote_unknown');}
  }
  async ref(branch:string):Promise<string|null> {const r=await this.request('GET','/git/ref/heads/'+branch,undefined,true);if(r===null)return null;if(r.ref!=='refs/heads/'+branch||!/^[0-9a-f]{40}$/.test(r.object?.sha))throw new Error('publisher_rejected');return r.object.sha;}
}
