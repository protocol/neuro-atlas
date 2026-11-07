import {isLoopbackUrl} from '../../feedback/config';
import {canonical} from './records';
import {FeedbackError,unavailable} from '../../feedback/errors';
import {assertWitnessChain,WITNESS_PATH,WITNESS_REQUEST_BYTES,WITNESS_RESPONSE_BYTES,WITNESS_TIMEOUT_MS,witnessPolicyDigest,witnessRequestSchema,witnessResponseSchema,type WitnessOperation,type WitnessScope,type IntakeWitness} from './witness';
export function createHttpIntakeWitness(options:{url:string;token:string;scope:WitnessScope;testMode?:boolean}):IntakeWitness {
 const url=new URL(options.url),policyDigest=witnessPolicyDigest(options.scope),identity='atlas-intake-witness-v1';
 if(url.username||url.password||url.search||url.hash||url.pathname!==WITNESS_PATH||!(/^[A-Za-z0-9_-]{43,128}$/.test(options.token))||(url.protocol!=='https:'&&!(options.testMode&&isLoopbackUrl(url.href))))throw new Error('witness_configuration');
 async function call(input:unknown){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),WITNESS_TIMEOUT_MS);let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  try{
   const request=witnessRequestSchema.parse(input),body=canonical(request);if(Buffer.byteLength(body)>WITNESS_REQUEST_BYTES)return unavailable();
   const response=await fetch(url,{method:'POST',redirect:'error',cache:'no-store',signal:controller.signal,headers:{Authorization:`Bearer ${options.token}`,'Content-Type':'application/json',Accept:'application/json'},body});
   if(response.status===409)throw new FeedbackError(409,'conflict','This feedback changed. Refresh its status before submitting again.');
   if(!response.ok||response.headers.get('content-type')!=='application/json'||response.headers.get('content-encoding')||Number(response.headers.get('content-length')??0)>WITNESS_RESPONSE_BYTES||!response.body)return unavailable();
   reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>WITNESS_RESPONSE_BYTES)return unavailable();chunks.push(value);}
   const parsed=witnessResponseSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
   if(parsed.policyDigest!==policyDigest)return unavailable();
   const id=request.action==='available'||request.action==='inventory'?undefined:request.action==='read'?request.feedbackId:request.operation.feedbackId;
   for(const [i,row]of parsed.rows.entries())if(row.feedbackId!==id||row.version!==i+1||row.previousRecordHash!==(i?parsed.rows[i-1].recordHash:undefined)||(i<parsed.rows.length-1&&row.state!=='committed'))return unavailable();
   return parsed;
  }catch(error){if(error instanceof FeedbackError&&error.status===409)throw error;return unavailable();}finally{clearTimeout(timer);controller.abort();await reader?.cancel().catch(()=>{});}
 }
 const read=async(feedbackId:string)=>(await call({action:'read',policyDigest,feedbackId})).rows;
 return {identity,policyDigest,async identities(){const r=await call({action:'inventory',policyDigest});if(!r.identities||new Set(r.identities).size!==r.identities.length)return unavailable();return r.identities;},async assertAvailable(){await call({action:'available',policyDigest});},read,reserve:async(operation:WitnessOperation)=>(await call({action:'reserve',policyDigest,operation})).rows,complete:async(operation:WitnessOperation)=>(await call({action:'complete',policyDigest,operation})).rows,claimEffect:async(operation:WitnessOperation,effect:'issue'|'comment')=>{const r=await call({action:'claim',policyDigest,operation,effect});if(r.claimed===undefined)return unavailable();return r.claimed;},async assertLatest(records){assertWitnessChain(await read(records[0]?.feedbackId),records,options.scope.ownerId);}};
}
