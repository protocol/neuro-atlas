import {createHash, randomBytes, timingSafeEqual} from "node:crypto";
import {z} from "zod";
import type {QueryDatabase} from "./database";
import {isLoopbackUrl, type FeedbackConfig} from "./config";
import type {FeedbackSession} from "./contracts";
import {FeedbackError, invalid, unavailable} from "./errors";
import {createFeedbackIntake} from "./intake";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const opaque = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const verifier = z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/);
const startSchema = z.object({state:opaque, codeChallenge:opaque}).strict();
const finishSchema = z.object({state:opaque, code:z.string().min(1).max(512).regex(/^[A-Za-z0-9_.-]+$/),codeVerifier:verifier}).strict();
const unauthorized = () => {throw new FeedbackError(401,"unauthorized","Sign in to feedback again.");};
export type Actor = {githubId:number;login:string};
export type FeedbackService = ReturnType<typeof createFeedbackService>;
export function createFeedbackService(options: {
  database:QueryDatabase;config:FeedbackConfig;now?:()=>Date;
  provider?:{authorizeUrl:string;tokenUrl:string;userUrl:string};
}) {
  const db=options.database, config=options.config, now=options.now ?? (()=>new Date());
  const provider=options.provider ?? {authorizeUrl:"https://github.com/login/oauth/authorize",tokenUrl:"https://github.com/login/oauth/access_token",userUrl:"https://api.github.com/user"};
  if (options.provider && (!config.testMode || !Object.values(provider).every(isLoopbackUrl))) throw new Error("Provider overrides are local-test only");
  async function rate(bucket:string, limit:number) {
    const window=new Date(Math.floor(now().getTime()/60000)*60000).toISOString();
    const result=await db.query<{count:number}>(`INSERT INTO atlas_feedback.rate_limits(bucket,window_start,count) VALUES($1,$2,1)
      ON CONFLICT(bucket,window_start) DO UPDATE SET count=atlas_feedback.rate_limits.count+1 RETURNING count`,[bucket,window]);
    if(result.rows[0].count>limit) throw new FeedbackError(429,"rate_limited","Too many feedback requests. Try again later.");
  }
  async function actor(token:string|null):Promise<Actor> {
    if(!token || !opaque.safeParse(token).success) return unauthorized();
    const r=await db.query<{github_id:string;login:string}>("SELECT github_id,login FROM atlas_feedback.sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>$2",[hash(token),now().toISOString()]);
    if(!r.rows[0] || Number(r.rows[0].github_id)!==config.ownerGithubId) return unauthorized();
    return {githubId:Number(r.rows[0].github_id),login:r.rows[0].login};
  }
  async function providerJson(url:string,init:RequestInit) {
    try {
      const r=await fetch(url,{...init,redirect:"error",signal:AbortSignal.timeout(8000),cache:"no-store"});
      if(!r.ok) return unavailable();
      const reader=r.body?.getReader(); if(!reader) return unavailable();
      let bytes=0;const chunks:Uint8Array[]=[];
      for(;;) {const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384){await reader.cancel();return unavailable();}chunks.push(value);}
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {return unavailable();}
  }
  return {
    config,
    async health() {try {const r=await db.query("SELECT singleton FROM atlas_feedback.control WHERE singleton=true");return {enabled:r.rows.length===1,connected:r.rows.length===1};}catch{return {enabled:false,connected:false};}},
    actor, rate,
    async start(input:unknown) {
      const parsed=startSchema.safeParse(input);if(!parsed.success)return invalid();
      await rate("auth:start",20);
      const {state,codeChallenge}=parsed.data, expiresAt=new Date(now().getTime()+300000).toISOString();
      try {await db.query("INSERT INTO atlas_feedback.auth_transactions(state_hash,challenge,canonical_origin,created_at,expires_at) VALUES($1,$2,$3,$4,$5)",[hash(state),codeChallenge,config.origin,now().toISOString(),expiresAt]);}
      catch(e) {if((e as {code?:string}).code==="23505")return invalid();throw e;}
      const url=new URL(provider.authorizeUrl);
      url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.callbackUrl,state,code_challenge:codeChallenge,code_challenge_method:"S256"}).toString();
      return {authorizeUrl:url.href,expiresAt};
    },
    async callback(state:string,code:string) {
      if(!opaque.safeParse(state).success || !finishSchema.shape.code.safeParse(code).success)return invalid();
      await rate("auth:callback",60);
      const r=await db.query("SELECT state_hash FROM atlas_feedback.auth_transactions WHERE state_hash=$1 AND canonical_origin=$2 AND claimed_at IS NULL AND expires_at>$3",[hash(state),config.origin,now().toISOString()]);
      if(!r.rows.length)return invalid();
      return {type:"atlas-feedback-oauth",code,state};
    },
    async finish(input:unknown):Promise<FeedbackSession> {
      const parsed=finishSchema.safeParse(input);if(!parsed.success)return invalid();
      await rate("auth:finish",20);
      const {state,code,codeVerifier}=parsed.data;
      const r=await db.query<{challenge:string}>("UPDATE atlas_feedback.auth_transactions SET claimed_at=$3 WHERE state_hash=$1 AND canonical_origin=$2 AND claimed_at IS NULL AND expires_at>$3 RETURNING challenge",[hash(state),config.origin,now().toISOString()]);
      if(!r.rows[0])return invalid();
      const challenge=createHash("sha256").update(codeVerifier).digest("base64url");
      if(!timingSafeEqual(Buffer.from(challenge),Buffer.from(r.rows[0].challenge)))return invalid();
      const token=await providerJson(provider.tokenUrl,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:codeVerifier,redirect_uri:config.callbackUrl})});
      if(typeof token.access_token!=="string" || token.access_token.length>4096 || !/^[A-Za-z0-9_\-.]+$/.test(token.access_token))return unavailable();
      const user=await providerJson(provider.userUrl,{headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${token.access_token}`,"X-GitHub-Api-Version":"2022-11-28"}});
      if(!Number.isSafeInteger(user.id) || user.id!==config.ownerGithubId)throw new FeedbackError(403,"owner_required","Feedback is limited to its configured owner.");
      if(typeof user.login!=="string" || !/^[A-Za-z0-9-]{1,39}$/.test(user.login))return unavailable();
      const session=randomBytes(32).toString("base64url"),expiresAt=new Date(now().getTime()+900000).toISOString();
      await db.query("INSERT INTO atlas_feedback.sessions(token_hash,github_id,login,created_at,expires_at) VALUES($1,$2,$3,$4,$5)",[hash(session),user.id,user.login,now().toISOString(),expiresAt]);
      return {session,expiresAt,actor:{githubId:user.id,login:user.login}};
    },
    async revoke(token:string) {await actor(token);await db.query("UPDATE atlas_feedback.sessions SET revoked_at=$2 WHERE token_hash=$1",[hash(token),now().toISOString()]);},
    ...createFeedbackIntake(db,now),
  };
}
