import test from 'node:test';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const url=new URL('../scripts/feedback-linear/host-transport.ts',import.meta.url);
test('SYNTHETIC broker: actual henry-out and henry-slack-search execute root/file/read/fetch with source receipt bindings, no copied broker credential',{skip:existsSync('/usr/local/bin/henry-out')&&existsSync('/usr/local/bin/henry-slack-search')?false:'Private HOST executables unavailable; transport integration not exercised here'},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'host-broker-fixture-')),seen=[];const file=path.join(dir,'before.png');await writeFile(file,Buffer.alloc(50,3));
 const server=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);seen.push({url:req.url,b});res.setHeader('content-type','application/json');
 if(req.url==='/internal/slack-search')return res.end(JSON.stringify({matches:[],channels_searched:1,query:'',scope:'mine',truncated:false,total_matched:0,threads_searched:0,threads_total:0}));
 if(req.url==='/internal/slack-file')return res.end(JSON.stringify({files:[{id:'F0',container_path:file}]}));
 return res.end(JSON.stringify({status:'delivered',delivery_id:'SYNTHETIC',platform:'slack',channel:'C000SYNTH',ts:b.kind==='file'?'1790000000.000002':'1790000000.000001',...(b.payload.source.thread?{thread_ts:b.payload.source.thread}:{})}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const old={...process.env};Object.assign(process.env,{HENRY_ROUTER_OUTBOUND_URL:'http://127.0.0.1:'+server.address().port,USER_ID:'SYNTHETIC',HENRY_OUTBOUND_SECRET:'SYNTHETIC_NOT_A_CREDENTIAL',HERMES_HOME:dir,ATLAS_LINEAR_HOST_WRITES_ENABLED:'true'});
 try {
 const {livePorts}=await import(url.href),ports=livePorts();
 const root=await ports.sendRoot('C000SYNTH','SYNTHETIC root $47 `literal`');assert.equal(root.channel,'C000SYNTH');
 const upload=await ports.sendFile('C000SYNTH',root.ts,file,'before synthetic');assert.equal(upload.thread_ts,root.ts);
 await ports.search({channelId:'C000SYNTH',after:'1790000000',before:'1790000002'});
 // Fixture file outside inbound-files must be rejected, even when the broker says it exists.
 await assert.rejects(ports.fetchFile({channelId:'C000SYNTH',threadId:root.ts,messageId:upload.ts,fileId:'F0'}));
 assert.equal(seen[0].b.payload.text,'SYNTHETIC root $47 `literal`');
 assert.equal(seen[2].b.query,'');assert.equal(seen[2].b.include_threads,true);assert.equal(seen[2].b.limit,2000);
 assert.equal(seen[3].b.thread_ts,root.ts);assert.equal(seen[3].b.file_id,'F0');
 } finally {for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
