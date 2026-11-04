import {randomBytes} from 'node:crypto';
import {FEEDBACK_SESSION_HEADER} from '../../feedback/contracts';
import {FeedbackError, invalid} from '../../feedback/errors';
import {feedbackJson, readFeedbackJson} from '../../feedback/routes';
import type {LinearService} from './service';
const headers = {'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff',Vary:'Origin, X-Atlas-Feedback-Session'};
export function createLinearRoutes(getService:()=>LinearService | null | Promise<LinearService | null>) {
  function run(method:string, action:(r:Request,s:LinearService)=>Promise<Response>, checkOrigin=true) {
    return async(r:Request) => {
      try {
        if (r.method !== method) return feedbackJson({error:{code:'method_not_allowed',message:'Method not allowed.'}},405);
        const s = await getService(); if (!s) throw new FeedbackError(403,'disabled','Feedback is not connected.');
        const origin=r.headers.get('origin'), site=r.headers.get('sec-fetch-site');
        if (checkOrigin && ((method !== 'GET' && origin !== s.config.origin) || (origin !== null && origin !== s.config.origin) || (site !== null && !['same-origin','none'].includes(site)))) throw new FeedbackError(403,'origin_denied','Feedback requires the configured site.');
        return await action(r,s);
      } catch(error) {const e=error instanceof FeedbackError?error:new FeedbackError(503,'unavailable','Feedback is unavailable. Try again later.'); return feedbackJson({error:{code:e.code,message:e.message}},e.status);}
    };
  }
  return {
    config:async(r:Request)=>{if(r.method!=='GET')return feedbackJson({},405);try{const s=await getService();return feedbackJson(s?await s.health():{enabled:false,connected:false,provider:'linear',policyVersion:'atlas-feedback-linear-v1'});}catch{return feedbackJson({enabled:false,connected:false,provider:'linear',policyVersion:'atlas-feedback-linear-v1'});}},
    followup:(r:Request,id:string)=>run('POST',async(r,s)=>feedbackJson(await s.followup(await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER)),id,r.headers.get('idempotency-key'),await readFeedbackJson(r)),202))(r),
    create:run('POST',async(r,s)=>feedbackJson(await s.create(await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER)),r.headers.get('idempotency-key'),await readFeedbackJson(r)),202)),
    status:(r:Request,id:string)=>run('GET',async(r,s)=>feedbackJson(await s.status(await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER)),id)))(r),
    list:run('GET',async(r,s)=>{const p=new URL(r.url).searchParams;if([...p.keys()].some(k=>k!=='limit')||p.getAll('limit').length>1)return invalid();const limit=p.get('limit')??'20';if(!/^(?:[1-9]|[1-4][0-9]|50)$/.test(limit))return invalid();return feedbackJson(await s.list(await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER)),Number(limit)));}),
    start:run('POST',async(r,s)=>feedbackJson(await s.start(await readFeedbackJson(r,4096)))),
    finish:run('POST',async(r,s)=>feedbackJson(await s.finish(await readFeedbackJson(r,4096)))),
    callback:run('GET',async(r,s)=>{
      const p=new URL(r.url).searchParams;
      if([...p.keys()].some(k=>k!=='state'&&k!=='code')||p.getAll('state').length!==1||p.getAll('code').length!==1)return invalid();
      const data=await s.callback(p.get('state')??'',p.get('code')??''), nonce=randomBytes(18).toString('base64');
      const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      return new Response(`<!doctype html><meta charset="utf-8"><title>Atlas feedback sign-in</title><p>Complete sign-in in the original window. If it is closed, close this window and retry.</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${json},${JSON.stringify(s.config.origin)});window.close();}</script>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}});
    },false),
    revoke:run('DELETE',async(r,s)=>{await s.revoke(r.headers.get(FEEDBACK_SESSION_HEADER)??'');return new Response(null,{status:204,headers});}),
  };
}
