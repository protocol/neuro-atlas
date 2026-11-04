import {open,mkdir,lstat,realpath,readdir,rename,rmdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {LinearFeedbackPrivateRecord} from '../../src/lib/feedback-linear/contracts';
import {canonical} from '../../src/lib/feedback-linear/server/records';
import {assertWitnessChain,witnessDigest,witnessOperationSchema,witnessPolicyDigest,witnessScopeSchema,type IntakeWitness,type WitnessScope,type WitnessOperation,type WitnessRow} from '../../src/lib/feedback-linear/server/witness';
const fail=():never=>{throw new Error('witness_unavailable');};
const eventSchema=z.object({sequence:z.number().int().positive(),previous:z.string().regex(/^[a-f0-9]{64}$/),kind:z.enum(['reserve','complete']),operation:witnessOperationSchema}).strict();
type Event=z.infer<typeof eventSchema>;
type Journal={events:Event[];rows:Map<string,WitnessRow[]>;head:string};
/** Dedicated single-host trusted private volume. Never auto-initializes or takes over orphan locks. */
export class FileIntakeWitness implements IntakeWitness {
 readonly identity='atlas-intake-witness-v1';readonly policyDigest:string;readonly root:string;readonly scope:WitnessScope;
 constructor(options:{root:string;scope:WitnessScope}){this.root=path.resolve(options.root);this.scope=Object.freeze(witnessScopeSchema.parse(options.scope));this.policyDigest=witnessPolicyDigest(this.scope);}
 private async directory(){const s=await lstat(this.root);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o777)!==0o700||s.uid!==process.getuid?.()||await realpath(this.root)!==this.root)fail();}
 private async sync(){const h=await open(this.root,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
 private async bytes(name:string){const h=await open(path.join(this.root,name),constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await h.stat();if(!s.isFile()||(s.mode&0o777)!==0o600||s.uid!==process.getuid?.()||s.nlink!==1||s.size>8192)fail();return await h.readFile('utf8');}finally{await h.close();}}
 private async atomic(name:string,value:unknown){const tmp=path.join(this.root,'.tmp-'+randomUUID()),h=await open(tmp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await h.writeFile(canonical(value));await h.sync();}finally{await h.close();}await rename(tmp,path.join(this.root,name));await this.sync();}
 async initialize(){await mkdir(this.root,{recursive:true,mode:0o700});await this.directory();const lock=path.join(this.root,'.lock');await mkdir(lock,{mode:0o700});try{if((await readdir(this.root)).some(n=>n!=='.lock'))fail();await this.atomic('scope.json',{identity:this.identity,scope:this.scope});}finally{await rmdir(lock);await this.sync();}}
 private apply(rows:Map<string,WitnessRow[]>,kind:Event['kind'],op:WitnessOperation){
  const history=rows.get(op.feedbackId)??[],existing=history[op.version-1];
  if(kind==='reserve'){
   if(existing||history.length!==op.version-1||history.some(r=>r.state!=='committed'||r.operationId===op.operationId)||op.previousRecordHash!==history.at(-1)?.recordHash)fail();
   rows.set(op.feedbackId,[...history,{...op,state:'reserved'}]);
  }else{
   if(!existing||existing.state!=='reserved'||canonical({...existing,state:undefined})!==canonical(op))fail();
   existing.state='committed';
  }
 }
 private async journal(held=false):Promise<Journal>{
  await this.directory();const names=(await readdir(this.root)).sort();
  if(!names.includes('scope.json')||(!held&&names.includes('.lock'))||names.some(n=>n!=='.lock'&&n!=='scope.json'&&!/^[0-9]{8}\.json$/.test(n)))fail();
  if(await this.bytes('scope.json')!==canonical({identity:this.identity,scope:this.scope}))fail();
  const files=names.filter(n=>/^[0-9]{8}\.json$/.test(n));if(files.length>10000)fail();
  const rows=new Map<string,WitnessRow[]>(),events:Event[]=[];let head=this.policyDigest;
  for(const [i,name]of files.entries()){
   if(name!==String(i+1).padStart(8,'0')+'.json')fail();
   const event=eventSchema.parse(JSON.parse(await this.bytes(name)));
   if(event.sequence!==i+1||event.previous!==head)fail();this.apply(rows,event.kind,event.operation);events.push(event);head=witnessDigest(event);
  }
  return {rows,events,head};
 }
 async assertAvailable(){await this.journal();}
 async read(id:string){return structuredClone((await this.journal()).rows.get(id)??[]);}
 private async mutate(kind:Event['kind'],value:WitnessOperation){
  const op=witnessOperationSchema.parse(value);await this.directory();const lock=path.join(this.root,'.lock');
  try{await mkdir(lock,{mode:0o700});}catch{throw new Error('witness_locked');}
  try{
   await this.sync();const journal=await this.journal(true),history=journal.rows.get(op.feedbackId)??[],existing=history[op.version-1];
   if(existing&&canonical({...existing,state:undefined})===canonical(op)&&(kind==='reserve'||existing.state==='committed'))return structuredClone(history);
   if(journal.events.length>=10000)fail();
   this.apply(journal.rows,kind,op);
   const event:Event={sequence:journal.events.length+1,previous:journal.head,kind,operation:op};
   await this.atomic(String(event.sequence).padStart(8,'0')+'.json',event);
   return structuredClone(journal.rows.get(op.feedbackId)!);
  }finally{await rmdir(lock);await this.sync();}
 }
 async reserve(op:WitnessOperation){return this.mutate('reserve',op);}
 async complete(op:WitnessOperation){return this.mutate('complete',op);}
 async assertLatest(records:LinearFeedbackPrivateRecord[]){assertWitnessChain(await this.read(records[0]?.feedbackId),records,this.scope.ownerId);}
}
