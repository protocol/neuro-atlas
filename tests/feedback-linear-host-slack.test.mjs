import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const url=new URL('../scripts/feedback-linear/host-slack.ts',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
const channelId='C000SYNTH',bot='U000BOT',human='U000HUMAN',threadId='1790000000.000001';
const proposalDigest='a'.repeat(64);
const before=await readFile(new URL('../docs/qa/feedback/hover-mobile-midpage-390.png',import.meta.url));
const after=await readFile(new URL('../docs/qa/feedback/mobile-anchored-390.png',import.meta.url));
const binding={proposalDigest,channelId,threadId,before:{messageId:'1790000000.000002',digest:hash(before),width:390,height:1000},after:{messageId:'1790000000.000003',digest:hash(after),width:390,height:1000}};
const request=()=>({nonce:randomUUID(),requestedAt:Date.now(),channelId,threadId,proposalDigest});
function data(){return {matches:[{channel:channelId,ts:threadId,user:bot,text:`Atlas feedback review ${proposalDigest}\nReview both images. Reply exactly: approve ${proposalDigest} or reject ${proposalDigest}`,thread_ts:threadId,is_reply:false,reply_count:3},...['before','after'].map((p,i)=>({channel:channelId,ts:binding[p].messageId,user:bot,text:`${p} ${proposalDigest} ${binding[p].digest}`,thread_ts:threadId,is_reply:true,files:[{id:'F'+i,name:p+'.png',mimetype:'image/png',size:(i?after:before).length}]})),{channel:channelId,ts:'1790000000.000004',user:human,text:'approve '+proposalDigest,thread_ts:threadId,is_reply:true}],channels_searched:1,query:'',scope:'mine',truncated:false,total_matched:4,threads_searched:1,threads_total:1};}
test('fresh nonce-bound complete exact thread verifies root, every counted unique message, both actual PNG byte digests and genuine source approval',async()=>{
 const {HostSlack}=await import(url.href);let source=data(),reads=0,fetches=[];
 const slack=new HostSlack({channelId,verifiedHumanReviewerIds:[human],botIds:[bot]}, {search:async b=>{reads++;assert.equal(b.channelId,channelId);assert.ok(Number(b.before)>Number(threadId));return structuredClone(source);},fetchFile:async p=>{fetches.push(p);return p.fileId==='F0'?before:after;}});
 const q=request(),receipt=await slack.publicationThread(q,binding);
 assert.deepEqual(receipt.request,q);assert.equal(receipt.messageCount,4);assert.equal(receipt.messages.at(-1).speakerType,'human');assert.equal(fetches.length,2);assert.equal(reads,1);
 for(const mutate of [d=>d.truncated=true,d=>d.partial=true,d=>d.note='Stopped',d=>d.total_matched=5,d=>d.threads_searched=0,d=>d.matches[0].reply_count=4,d=>d.matches.push(d.matches.at(-1)),d=>d.matches[0].text='Other revision',d=>d.matches[3].text='reject '+proposalDigest,d=>d.matches[3].user=bot,d=>d.matches[3].user='U000OTHER',d=>d.matches[3].text='approve '+proposalDigest+'\nplease',d=>d.matches[1].files=[]]){
   source=data();mutate(source);await assert.rejects(slack.publicationThread(request(),binding));
 }
 source=data();await assert.rejects(slack.publicationThread({...request(),requestedAt:0},binding));
 const bad=new HostSlack({channelId,verifiedHumanReviewerIds:[human],botIds:[bot]},{search:async()=>data(),fetchFile:async()=>before});
 await assert.rejects(bad.publicationThread(request(),binding));
});

test('declared continuation disagrees with ostensibly complete broker counts and must block',async()=>{
 const {HostSlack}=await import(url.href);
 for(const extra of [{has_more:true},{hasNextPage:true},{next_cursor:'still-more'},{nextCursor:'still-more'}]){
 const slack=new HostSlack({channelId,verifiedHumanReviewerIds:[human],botIds:[bot]},{search:async()=>({...data(),...extra}),fetchFile:async s=>s.fileId==='F0'?before:after});
 await assert.rejects(slack.publicationThread(request(),binding));
 }
});
