import {timingSafeEqual} from 'node:crypto';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {FileIntakeWitness} from './witness-store';
import {WITNESS_PATH,WITNESS_REQUEST_BYTES,WITNESS_RESPONSE_BYTES,WITNESS_TIMEOUT_MS,witnessRequestSchema} from '../../src/lib/feedback-linear/server/witness';
const tokenPattern=/^[A-Za-z0-9_-]{43,128}$/;
export function createWitnessHttpHandler(options:{witness:FileIntakeWitness;readToken:string;writeToken:string}) {
 const {witness,readToken,writeToken}=options;
 if(!(witness instanceof FileIntakeWitness)||!tokenPattern.test(readToken)||!tokenPattern.test(writeToken)||readToken===writeToken)throw new Error('witness_configuration');
 const equal=(actual:string,expected:string)=>Buffer.byteLength(actual)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
 return async function handler(req:IncomingMessage,res:ServerResponse){
  const send=(status:number,value:unknown)=>{const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Connection:'close'});res.once('finish',()=>req.destroy());res.end(body);};
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   if(req.url!==WITNESS_PATH||req.method!=='POST')return send(404,{error:'witness_request_rejected'});
   const auth=req.headers.authorization??'',write=equal(auth,`Bearer ${writeToken}`),read=equal(auth,`Bearer ${readToken}`);
   if(!write&&!read)return send(403,{error:'witness_request_rejected'});
   if(req.headers['content-type']!=='application/json'||req.headers['content-encoding']||Number(req.headers['content-length']??0)>WITNESS_REQUEST_BYTES)return send(413,{error:'witness_request_rejected'});
   timer=setTimeout(()=>req.destroy(),WITNESS_TIMEOUT_MS);timer.unref();
   const chunks:Buffer[]=[];let count=0;
   for await(const chunk of req){const bytes=Buffer.from(chunk);count+=bytes.length;if(count>WITNESS_REQUEST_BYTES)return send(413,{error:'witness_request_rejected'});chunks.push(bytes);}
   clearTimeout(timer);
   const parsed=witnessRequestSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
   if(!parsed.success)return send(400,{error:'witness_request_rejected'});
   const body=parsed.data;
   if(body.policyDigest!==witness.policyDigest||(!write&&(body.action==='reserve'||body.action==='complete'||body.action==='claim')))return send(403,{error:'witness_request_rejected'});
   const claimed=body.action==='claim'?await witness.claimEffect(body.operation,body.effect):undefined;
   const identities=body.action==='inventory'?await witness.identities():undefined;
   const rows=body.action==='inventory'?[]:body.action==='claim'?await witness.read(body.operation.feedbackId):body.action==='available'?(await witness.assertAvailable(),[]):body.action==='read'?await witness.read(body.feedbackId):await witness[body.action](body.operation);
   const response={identity:witness.identity,policyDigest:witness.policyDigest,rows,...(claimed!==undefined?{claimed}:{}),...(identities?{identities}:{})};
   if(Buffer.byteLength(JSON.stringify(response))>WITNESS_RESPONSE_BYTES)throw new Error('witness_response_limit');
   return send(200,response);
  }catch(error){if(error instanceof SyntaxError)return send(400,{error:'witness_request_rejected'});return error instanceof Error&&error.message==='witness_conflict'?send(409,{error:'witness_conflict'}):send(503,{error:'witness_unavailable'});}finally{if(timer)clearTimeout(timer);}
 };
}
