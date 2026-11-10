import {z} from 'zod';
import {sha256} from '../feedback/validator';
import {fresh,digest} from './input';
import {threadRequestSchema,threadSchema,assertPng,type ThreadRequest} from './evidence';

const ts=z.string().regex(/^[0-9]{10,16}\.[0-9]{6}$/),user=z.string().regex(/^[UBW][A-Z0-9]+$/);
export const slackConfigSchema=z.object({channelId:z.string().regex(/^[CG][A-Z0-9]+$/),verifiedHumanReviewerIds:z.array(user.regex(/^U[A-Z0-9]+$/)).min(1),botIds:z.array(user).min(1)}).strict().refine(c=>new Set([...c.verifiedHumanReviewerIds,...c.botIds]).size===c.verifiedHumanReviewerIds.length+c.botIds.length);
export type SlackConfig=z.infer<typeof slackConfigSchema>;
const image=z.object({messageId:ts,digest,width:z.number().int().positive(),height:z.number().int().positive()}).strict();
export const bindingSchema=z.object({proposalDigest:digest,channelId:z.string(),threadId:ts,before:image,after:image}).strict();
export type ReviewBinding=z.infer<typeof bindingSchema>;
export type SearchBounds={channelId:string;after:string;before:string};
export type FileSource={channelId:string;messageId:string;threadId:string;fileId:string};
export type SlackPorts={search:(bounds:SearchBounds)=>Promise<unknown>;fetchFile:(source:FileSource)=>Promise<Buffer>};
const file=z.object({id:z.string().regex(/^F[A-Z0-9]+$/),name:z.string(),mimetype:z.string(),size:z.number().int().nonnegative()});
const message=z.object({channel:z.string(),ts,user,text:z.string().max(3000),thread_ts:ts.optional(),is_reply:z.boolean().optional(),reply_count:z.number().int().nonnegative().optional(),files:z.array(file).optional()});
const page=z.object({has_more:z.literal(false).optional(),hasNextPage:z.literal(false).optional(),next_cursor:z.union([z.null(),z.literal('')]).optional(),nextCursor:z.union([z.null(),z.literal('')]).optional(),matches:z.array(message).max(2000),channels_searched:z.literal(1),query:z.literal(''),scope:z.literal('mine'),truncated:z.literal(false),total_matched:z.number().int().nonnegative(),threads_searched:z.number().int().nonnegative(),threads_total:z.number().int().nonnegative(),partial:z.literal(false).optional(),threads_partial:z.array(z.unknown()).max(0).optional(),note:z.union([z.null(),z.literal('')]).optional()});
const fail=(reason:string):never=>{throw new Error('host_blocked:'+reason);};
export const reviewRoot=(p:string)=>`Atlas feedback review ${p}\nReview both images. Reply exactly: approve ${p} or reject ${p}`;
export const imageCaption=(phase:'before'|'after',p:string,d:string)=>`${phase} ${p} ${d}`;
/** Real henry-slack-search performs bounded paging. We admit only reconciled complete output.
 * Searches use root-time bounds, EMPTY query/no sender filter, so disagreement is not hidden.
 * No cached read, caller actor, reaction or body assertion can substitute for a source message.
 */
export class HostSlack {
  readonly config:SlackConfig;
  constructor(config:SlackConfig,readonly ports:SlackPorts){this.config=slackConfigSchema.parse(config);}
  async readThread(request:ThreadRequest,binding:ReviewBinding){
    threadRequestSchema.parse(request);bindingSchema.parse(binding);fresh(request.requestedAt,15000);
    if(request.channelId!==this.config.channelId||binding.channelId!==request.channelId||binding.threadId!==request.threadId||binding.proposalDigest!==request.proposalDigest||binding.before.messageId===binding.after.messageId||[binding.before.messageId,binding.after.messageId].includes(binding.threadId))fail('thread_binding');
    const second=Math.floor(Number(request.threadId));
    const p=page.parse(await this.ports.search({channelId:request.channelId,after:String(second-1),before:String(second+1)}));
    if(p.total_matched!==p.matches.length||p.threads_searched!==p.threads_total||new Set(p.matches.map(m=>m.channel+':'+m.ts)).size!==p.matches.length||p.matches.some(m=>m.channel!==request.channelId))fail('thread_coverage');
    const selected=p.matches.filter(m=>m.ts===request.threadId||m.thread_ts===request.threadId);
    const roots=selected.filter(m=>m.ts===request.threadId),root=roots[0];
    if(roots.length!==1||!this.config.botIds.includes(root.user)||root.is_reply===true||root.text!==reviewRoot(binding.proposalDigest)||root.reply_count===undefined||root.reply_count!==selected.length-1||selected.some(m=>m.ts!==root.ts&&(m.thread_ts!==root.ts||m.is_reply!==true)))fail('thread_root_or_count');
    for(const phase of ['before','after'] as const){
      const expected=binding[phase],matches=selected.filter(m=>m.ts===expected.messageId),m=matches[0];
      if(matches.length!==1||!this.config.botIds.includes(m.user)||m.text!==imageCaption(phase,binding.proposalDigest,expected.digest)||m.files?.length!==1)fail('image_message');
      const f=m.files![0];
      if(f.name!==phase+'.png'||f.mimetype!=='image/png'||f.size<45||f.size>16*1024*1024)fail('image_metadata');
      const bytes=await this.ports.fetchFile({channelId:request.channelId,messageId:m.ts,threadId:root.ts,fileId:f.id});
      if(bytes.length!==f.size||sha256(bytes)!==expected.digest)fail('image_bytes');assertPng(bytes,expected);
    }
    fresh(request.requestedAt,15000);
    return threadSchema.parse({request,readAt:Date.now(),messages:selected.sort((a,b)=>Number(a.ts)-Number(b.ts)).map(m=>({messageId:m.ts,speakerId:m.user,speakerType:this.config.botIds.includes(m.user)||m.user.startsWith('B')?'bot':'human',text:m.text})),messageCount:selected.length,nextCursor:null});
  }
  async publicationThread(request:ThreadRequest,binding:ReviewBinding){
    const thread=await this.readThread(request,binding),human=thread.messages.filter(m=>m.speakerType==='human');
    if(!human.length||human.some(m=>!this.config.verifiedHumanReviewerIds.includes(m.speakerId)||m.text!=='approve '+request.proposalDigest))fail('human_disagreement_or_no_approval');
    return thread;
  }
}
