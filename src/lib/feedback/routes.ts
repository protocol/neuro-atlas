import {randomBytes} from "node:crypto";
import type {FeedbackService} from "./service";
import {FEEDBACK_SESSION_HEADER} from "./contracts";
import {FeedbackError, invalid} from "./errors";

const safeHeaders={"Cache-Control":"private, no-store", "Referrer-Policy":"no-referrer", "X-Robots-Tag":"noindex, nofollow", "X-Content-Type-Options":"nosniff",Vary:"Origin, X-Atlas-Feedback-Session"};
export function feedbackJson(value:unknown,status=200) {return Response.json(value,{status,headers:safeHeaders});}
export async function readFeedbackJson(request:Request,limit=16384):Promise<unknown> {
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type")??""))throw new FeedbackError(415,"json_required","JSON is required.");
  const length=request.headers.get("content-length");
  if(length && (!/^\d+$/.test(length)||Number(length)>limit))throw new FeedbackError(413,"body_too_large","Feedback request is too large.");
  const reader=request.body?.getReader();if(!reader)return invalid();
  let bytes=0;const chunks:Uint8Array[]=[];
  for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw new FeedbackError(413,"body_too_large","Feedback request is too large.");}chunks.push(value);}
  try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));}catch{return invalid();}
}
export function createFeedbackRouteHandlers(getService:()=>FeedbackService|null|Promise<FeedbackService|null>) {
  function guard(request:Request,service:FeedbackService,mutation:boolean) {
    const origin=request.headers.get("origin"),site=request.headers.get("sec-fetch-site");
    if((mutation && origin!==service.config.origin)||(origin!==null&&origin!==service.config.origin)||(site!==null&&site!=="same-origin"&&site!=="none"))throw new FeedbackError(403,"origin_denied","Feedback requires the configured site.");
  }
  const run=(method:string,action:(r:Request,s:FeedbackService)=>Promise<Response>,checkOrigin=true)=>(async(request:Request)=>{
    try {
      if(request.method!==method)return feedbackJson({error:{code:"method_not_allowed",message:"Method not allowed."}},405);
      const service=await getService();if(!service)throw new FeedbackError(403,"disabled","Feedback is not connected.");
      if(checkOrigin)guard(request,service,method!=="GET");
      return await action(request,service);
    }catch(error){const e=error instanceof FeedbackError?error:new FeedbackError(503,"unavailable","Feedback is unavailable. Try again later.");return feedbackJson({error:{code:e.code,message:e.message}},e.status);}
  });
  return {
    config:async(request:Request)=>{if(request.method!=="GET")return feedbackJson({error:{code:"method_not_allowed",message:"Method not allowed."}},405);try{const s=await getService();return feedbackJson(s?await s.health():{enabled:false,connected:false});}catch{return feedbackJson({enabled:false,connected:false});}},
    start:run("POST",async(r,s)=>feedbackJson(await s.start(await readFeedbackJson(r,4096)))),
    finish:run("POST",async(r,s)=>feedbackJson(await s.finish(await readFeedbackJson(r,4096)))),
    callback:run("GET",async(r,s)=>{
      const params=new URL(r.url).searchParams;
      if([...params.keys()].some(k=>k!=="state"&&k!=="code")||params.getAll("state").length!==1||params.getAll("code").length!==1)return invalid();
      const data=await s.callback(params.get("state")??"",params.get("code")??"");
      const nonce=randomBytes(18).toString("base64"),json=JSON.stringify(data).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
      const origin=JSON.stringify(s.config.origin);
      const html=`<!doctype html><meta charset="utf-8"><title>Atlas feedback sign-in</title><p id="status">Complete sign-in in the original window. If it is closed, close this window and retry.</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${json},${origin});window.close();}</script>`;
      return new Response(html,{headers:{...safeHeaders,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}});
    },false),
    revoke:run("DELETE",async(r,s)=>{await s.revoke(r.headers.get(FEEDBACK_SESSION_HEADER)??"");return new Response(null,{status:204,headers:safeHeaders});}),
    create:run("POST",async(r,s)=>{const actor=await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER));await s.rate(`writes:${actor.githubId}`,30);return feedbackJson(await s.create(actor,r.headers.get("idempotency-key"),await readFeedbackJson(r)),202);}),
    status:(r:Request,id:string)=>run("GET",async(r,s)=>{const actor=await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER));await s.rate(`reads:${actor.githubId}`,120);return feedbackJson(await s.status(actor,id));})(r),
    followup:(r:Request,id:string)=>run("POST",async(r,s)=>{const actor=await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER));await s.rate(`writes:${actor.githubId}`,30);return feedbackJson(await s.followup(actor,id,r.headers.get("idempotency-key"),await readFeedbackJson(r)),202);})(r),
    list:run("GET",async(r,s)=>{const actor=await s.actor(r.headers.get(FEEDBACK_SESSION_HEADER));await s.rate(`reads:${actor.githubId}`,120);const params=new URL(r.url).searchParams;if([...params.keys()].some(k=>k!=="limit")||params.getAll("limit").length>1)return invalid();const raw=params.get("limit")??"20";if(!/^(?:[1-9]|[1-4][0-9]|50)$/.test(raw))return invalid();return feedbackJson(await s.list(actor,Number(raw)));}),
  };
}
