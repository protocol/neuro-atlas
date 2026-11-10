import {sign,randomUUID,type KeyLike} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {canonical} from '../feedback/engine';
import {sha256} from '../feedback/validator';
import {PrivateHost,nativeCommentAuthor,type HostConfig} from './host';
import {HostSlack,reviewRoot,imageCaption,type SlackConfig,type ReviewBinding} from './host-slack';
import {livePorts,type LivePorts} from './host-transport';
import {ReviewController,type ReviewConfig,type Job} from './controller';
import {PrivateFiles} from './files';
import {hostPayload,validateNative,fresh,uuid,digest} from './input';
import {captureSchema,deliverySchema,decisionSchema,witnessedDeliverySchema,witnessedDecisionSchema,deliveryPurpose,decisionPurpose,readDelivery,readDecision,threadSchema,type ThreadRequest,type Proposal} from './evidence';

type WithoutReaders<T> = T extends unknown ? Omit<T,'readNative'|'readReviewThread'> : never;
export type WorkflowConfig={host:HostConfig;slack:SlackConfig;writesEnabled?:boolean;publishEnabled?:boolean}&({controller:ReviewController;review?:never}|{review:WithoutReaders<ReviewConfig>;controller?:never});
const blocked=(reason:string):never=>{throw new Error('host_blocked:'+reason);};
const proposalSchema=z.object({schema:z.literal(1),revision:z.literal(1),candidateDigest:digest,captureDigest:digest,beforeDigest:digest,afterDigest:digest,channelId:z.string(),inputHash:digest,baseSha:z.string(),patchDigest:digest,checksDigest:digest,expiresAt:z.number().int()}).strict();
const postSchema=z.object({status:z.literal('delivered'),platform:z.literal('slack'),channel:z.string(),ts:z.string().regex(/^[0-9]{10,16}\.[0-9]{6}$/),event_id:uuid,partial:z.literal(false).optional(),thread_ts:z.string().optional(),redirected_to:z.never().optional()});
const ordinarySchema=z.object({id:uuid,body:z.string(),issue:z.object({id:uuid}),user:z.object({id:z.string()}),parent:z.null(),externalThread:z.null(),syncedWith:z.union([z.null(),z.array(z.unknown()).max(0)]),archivedAt:z.null(),quotedText:z.null()});
const proposalBody=(d:z.infer<typeof deliverySchema>)=>'atlas-linear-proposal-v1\n'+canonical({proposalDigest:d.proposalDigest,channelId:d.channelId,threadId:d.threadId,beforeDigest:d.beforeDigest,afterDigest:d.afterDigest,messageIds:d.messageIds});
const decisionBody=(d:z.infer<typeof decisionSchema>)=>'atlas-linear-decision-v1\n'+canonical({proposalDigest:d.proposalDigest,channelId:d.channelId,threadId:d.threadId,messageId:d.messageId,speakerId:d.speakerId,decision:d.decision,text:d.decision+' '+d.proposalDigest,source:'henry-slack-search'});
const sourceEvent=(channel:string,thread:string,message:string)=>{const hex=sha256(canonical({purpose:'atlas-linear-slack-source-v1',channel,thread,message}));return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);};
/** Qualified private HOST handler only. Public input is an issue id or a source message id,
 * never a signer request, claimed speaker, approval boolean, command or plugin module.
 */
export class HostWorkflow {
  readonly host:PrivateHost;readonly slack:HostSlack;readonly controller:ReviewController;readonly journal:PrivateFiles;
  private readonly review:Pick<ReviewConfig,'enabled'|'root'|'repo'|'inputPolicy'|'channelId'|'reviewerIds'|'capturePublicKey'>;
  constructor(readonly config:WorkflowConfig,readonly ports:LivePorts=livePorts()){
    this.host=new PrivateHost(config.host,ports);this.slack=new HostSlack(config.slack,ports);
    const review=config.controller?.config??config.review??blocked('controller_required');
    if(config.host.inputPolicy.authority==='witnessed-intake-v1' && (!review.historyWitness||review.historyWitness.root!==config.host.historyWitness?.root||review.historyWitness.policyDigest!==config.host.historyWitness?.policyDigest))blocked('witness_authority_mismatch');
    if(review.historyWitness && review.historyWitness.scope.workspaceId!==config.host.scope.workspaceId)blocked('witness_workspace_mismatch');
    this.review=review;
    if(review.channelId!==config.slack.channelId||canonical(review.reviewerIds)!==canonical(config.slack.verifiedHumanReviewerIds)||review.inputPolicy!==config.host.inputPolicy)blocked('workflow_trust_config');
    const readers={readNative:()=>this.host.readNative(),readReviewThread:(r:ThreadRequest)=>this.readReviewThread(r)};
    if(config.controller){
      this.controller=config.controller;
      // Trusted code-level integration; no serialized module/command/provider loader.
      Object.assign(this.controller.config,readers);
    }else this.controller=new ReviewController({...config.review!,...readers});
    this.journal=new PrivateFiles(path.join(review.root,'host-operations'));
  }
  private witnessed(){return this.config.host.inputPolicy.authority==='witnessed-intake-v1';}
  private attest<T>(purpose:string,payload:T){return {payload,signature:sign(null,Buffer.from(canonical({purpose,payload})),this.config.host.signingKey).toString('base64')};}
  private enabledWrite(){if(this.review.enabled!==true||this.config.writesEnabled!==true)blocked('writes_disabled');this.controller.assertHistoryWitness();}
  private id(id:string){uuid.parse(id);if(id!==this.config.host.scope.issueId)blocked('issue_scope');}
  private async material(id:string){
    this.id(id);const job=await this.controller.status(id);
    if(!job.proposalDigest) return blocked('proposal_missing');
    const proposal=proposalSchema.parse(JSON.parse((await this.controller.files.artifactBytes(job.proposalDigest)).toString()));
    if(proposal.channelId!==this.config.slack.channelId||proposal.expiresAt<=Date.now()||proposal.inputHash!==job.inputHash)blocked('proposal_stale');
    const cap=hostPayload(JSON.parse((await this.controller.files.artifactBytes(proposal.captureDigest)).toString()),'atlas-linear-capture-v1',this.review.capturePublicKey,captureSchema);
    if(cap.candidateDigest!==proposal.candidateDigest||cap.before.digest!==proposal.beforeDigest||cap.after.digest!==proposal.afterDigest)blocked('capture_binding');
    return {job,proposal,cap};
  }
  private binding(proposal:Proposal,delivery:ReturnType<typeof readDelivery>,cap:z.infer<typeof captureSchema>):ReviewBinding{
    return {proposalDigest:delivery.proposalDigest,channelId:delivery.channelId,threadId:delivery.threadId,before:{...cap.before,messageId:delivery.messageIds[0]},after:{...cap.after,messageId:delivery.messageIds[1]}};
  }
  private exactComment(value:unknown,id:string,body:string){
    const c=ordinarySchema.parse(nativeCommentAuthor(value));
    if(c.id!==id||c.body!==body||c.issue.id!==this.config.host.scope.issueId||c.user.id!==this.config.host.scope.ownerId)blocked('linear_comment_readback');return c;
  }
  private checkComment(comments:unknown[],id:string,body:string){
    const found=comments.filter(c=>c&&typeof c==='object'&&'id'in c&&c.id===id);
    if(found.length!==1)return blocked('linear_comment_missing');return this.exactComment(found[0],id,body);
  }
  private async comment(body:string,inputHash:string){
    await this.controller.assertCurrentInput(inputHash);
    const s=this.config.host.scope;
    const result=ordinarySchema.parse(nativeCommentAuthor(await this.ports.native('comment',{...s,body})));
    this.exactComment(result,result.id,body);
    const source=await this.host.readSource();this.checkComment(source.comments,result.id,body);
    return result.id;
  }
  private async delivery(job:Job){
    if(!job.deliveryDigest)return blocked('delivery_missing');
    return readDelivery(JSON.parse((await this.controller.files.artifactBytes(job.deliveryDigest)).toString()),this.config.host.inputPolicy);
  }
  /** Durable reservation BEFORE any external side effect. Unknown/partial attempts never retry. */
  private async once<T>(key:string,fn:(checkpoint:(value:unknown)=>Promise<void>)=>Promise<T>):Promise<T>{
    return this.journal.lock(async state=>{
      if(state.jobs[key])return blocked('host_attempt_exists_reconcile_manually');
      state.jobs[key]={state:'reserved'};await this.journal.save(state);
      try{
        const result=await fn(async value=>{const artifact=await this.journal.artifact(Buffer.from(canonical(value)));state.jobs[key]={state:'in_progress',artifact};await this.journal.save(state);});
        state.jobs[key]={state:'completed'};await this.journal.save(state);return result;
      }catch(error){state.jobs[key]={state:'blocked_or_unknown'};await this.journal.save(state);throw error;}
    });
  }
  async deliver(id:string){
    this.enabledWrite();const {job,proposal,cap}=await this.material(id);
    if(job.state!=='awaiting_delivery')return blocked('delivery_state');
    await this.controller.assertCurrentInput(job.inputHash);
    return this.once('delivery:'+id,async checkpoint=>{
      const dir=path.join(this.review.root,'host-images-'+id);await mkdir(dir,{mode:0o700});
      const [before,after]=await Promise.all([this.controller.image(id,'before'),this.controller.image(id,'after')]);
      await writeFile(path.join(dir,'before.png'),before,{mode:0o600,flag:'wx'});await writeFile(path.join(dir,'after.png'),after,{mode:0o600,flag:'wx'});
      await this.controller.assertCurrentInput(job.inputHash);
      const root=postSchema.parse(await this.ports.sendRoot(proposal.channelId,reviewRoot(job.proposalDigest!)));
      if(root.channel!==proposal.channelId||(root.thread_ts&&root.thread_ts!==root.ts))blocked('root_receipt');await checkpoint({root});
      const posts:z.infer<typeof postSchema>[]=[];
      for(const phase of ['before','after'] as const){
        await this.controller.assertCurrentInput(job.inputHash);
        const post=postSchema.parse(await this.ports.sendFile(proposal.channelId,root.ts,path.join(dir,phase+'.png'),imageCaption(phase,job.proposalDigest!,proposal[phase==='before'?'beforeDigest':'afterDigest'])));
        if(post.channel!==proposal.channelId||post.thread_ts!==root.ts||post.ts===root.ts||posts.some(p=>p.ts===post.ts))blocked('file_receipt');posts.push(post);await checkpoint({root,posts});
      }
      const d:ReturnType<typeof readDelivery>={eventId:randomUUID(),at:Date.now(),channelId:proposal.channelId,threadId:root.ts,proposalDigest:job.proposalDigest!,beforeDigest:proposal.beforeDigest,afterDigest:proposal.afterDigest,messageIds:[posts[0].ts,posts[1].ts] as [string,string],...(!this.witnessed()?{linearCommentId:randomUUID()}:{schema:'atlas-linear-witnessed-delivery-v2' as const})};
      await this.slack.readThread({nonce:randomUUID(),requestedAt:Date.now(),channelId:d.channelId,threadId:d.threadId,proposalDigest:d.proposalDigest},this.binding(proposal,d,cap));
      if('linearCommentId' in d)d.linearCommentId=await this.comment(proposalBody(d),job.inputHash);d.at=Date.now();
      await checkpoint(d);return this.controller.delivered(id,this.attest(deliveryPurpose(this.config.host.inputPolicy),this.witnessed()?witnessedDeliverySchema.parse(d):deliverySchema.parse(d)));
    });
  }
  async admitDecision(id:string,messageId:string){
    this.enabledWrite();if(typeof messageId!=='string'||!/^[0-9]{10,16}\.[0-9]{6}$/.test(messageId))return blocked('source_message_id_only');
    const {job,proposal,cap}=await this.material(id),d=await this.delivery(job);
    await this.controller.assertCurrentInput(job.inputHash);
    if(!['awaiting_review','approved','rejected','conflicted'].includes(job.state)||d.proposalDigest!==job.proposalDigest)return blocked('decision_state');
    const request={nonce:randomUUID(),requestedAt:Date.now(),channelId:d.channelId,threadId:d.threadId,proposalDigest:d.proposalDigest};
    const [thread,native]=await Promise.all([this.slack.readThread(request,this.binding(proposal,d,cap)),this.host.readSource()]);
    if('linearCommentId' in d)this.checkComment(native.comments,d.linearCommentId,proposalBody(d));
    const m=thread.messages.find(m=>m.messageId===messageId);
    if(!m||m.speakerType!=='human'||!this.config.slack.verifiedHumanReviewerIds.includes(m.speakerId)||![`approve ${d.proposalDigest}`,`reject ${d.proposalDigest}`].includes(m.text)||messageId===d.threadId||d.messageIds.includes(messageId))return blocked('not_verified_human_exact_decision');
    const at=Math.floor(Number(messageId)*1000);fresh(at);if(at<d.at)blocked('decision_predates_delivery');
    const a:ReturnType<typeof readDecision>={eventId:sourceEvent(d.channelId,d.threadId,messageId),at,channelId:d.channelId,threadId:d.threadId,messageId,proposalDigest:d.proposalDigest,decision:m.text.startsWith('approve ')?'approve' as const:'reject' as const,speakerId:m.speakerId,speakerType:'human' as const,...(!this.witnessed()?{linearCommentId:randomUUID()}:{schema:'atlas-linear-witnessed-decision-v2' as const})};
    return this.once('decision:'+a.eventId,async checkpoint=>{
      if('linearCommentId' in a)a.linearCommentId=await this.comment(decisionBody(a),job.inputHash);await this.controller.assertCurrentInput(job.inputHash);await checkpoint(a);
      return this.controller.decide(id,this.attest(decisionPurpose(this.config.host.inputPolicy),this.witnessed()?witnessedDecisionSchema.parse(a):decisionSchema.parse(a)));
    });
  }
  /** Called by the current controller.publish BEFORE credentials and repeatedly at write guards. */
  private async readReviewThread(request:ThreadRequest){
    const {job,proposal,cap}=await this.material(this.config.host.scope.issueId),d=await this.delivery(job);
    await this.controller.assertCurrentInput(job.inputHash);
    if(!job.decisionDigest||request.proposalDigest!==job.proposalDigest)return blocked('approval_missing');
    const a=readDecision(JSON.parse((await this.controller.files.artifactBytes(job.decisionDigest)).toString()),this.config.host.inputPolicy);
    const [thread,native]=await Promise.all([this.slack.publicationThread(request,this.binding(proposal,d,cap)),this.host.readSource()]);
    if(validateNative(native.receipt,this.config.host.inputPolicy).recordHash!==job.inputHash||!thread.messages.some(m=>m.messageId===a.messageId&&m.speakerId===a.speakerId&&m.text==='approve '+a.proposalDigest&&m.speakerType==='human'))blocked('approval_source_changed');
    if('linearCommentId' in d)this.checkComment(native.comments,d.linearCommentId,proposalBody(d));if('linearCommentId' in a)this.checkComment(native.comments,a.linearCommentId,decisionBody(a));
    if(this.witnessed())await this.controller.assertCurrentInput(job.inputHash);
    fresh(request.requestedAt,15000);thread.readAt=Date.now();return this.attest('atlas-linear-review-thread-v1',threadSchema.parse(thread));
  }
  async publish(id:string,options:{enabled?:boolean;signingKey:KeyLike;github:Parameters<ReviewController['publish']>[1]['github']}){
    this.id(id);this.enabledWrite();if(this.config.publishEnabled!==true)return blocked('publish_disabled');
    return this.controller.publish(id,options);
  }
}
