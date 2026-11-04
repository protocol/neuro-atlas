import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {store,scope} from './feedback-linear-witness-fixture.test.mjs';
export async function httpWitness(t){
 const {w,root}=await store(t);await w.initialize();
 const {createWitnessHttpHandler}=await import('../scripts/feedback-linear/witness-http.ts');
 const {createHttpIntakeWitness}=await import('../src/lib/feedback-linear/server/witness-client.ts');
 const writeToken=randomBytes(32).toString('base64url'),readToken=randomBytes(32).toString('base64url');
 const server=createServer(createWitnessHttpHandler({witness:w,writeToken,readToken}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const url=`http://127.0.0.1:${server.address().port}/v1/intake-witness`;
 return {w,root,url,writeToken,readToken,client:createHttpIntakeWitness({url,token:writeToken,scope,testMode:true}),createHttpIntakeWitness};
}
