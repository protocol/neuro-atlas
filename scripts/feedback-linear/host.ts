import {sign,createPublicKey,type KeyLike} from 'node:crypto';
import {z} from 'zod';
import {canonical} from '../feedback/engine';
import {validateNative,type InputPolicy,uuid} from './input';
import {managedCommentId,renderPrivateComment,PRIVATE_PURPOSE} from '../../src/lib/feedback-linear/server/records';

const actor=z.string().uuid();
export const hostScopeSchema=z.object({issueId:uuid,ownerId:actor,projectId:actor,teamId:actor,workspaceId:actor,workspace:z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/)}).strict();
export type HostScope=z.infer<typeof hostScopeSchema>;
export type HostConfig={scope:HostScope;inputPolicy:InputPolicy;signingKey:KeyLike};
/** Trusted code-level ports for fixture peers; never configurable modules, commands or URLs. */
export type HostPorts={native:(operation:'read'|'comment',payload:unknown)=>Promise<unknown>};
const block=(reason:string):never=>{throw new Error('host_blocked:'+reason);};
const commentSchema=z.object({id:actor,body:z.string().max(32768),issue:z.object({id:actor}).nullable(),user:z.object({id:actor}).nullable(),parent:z.unknown(),externalThread:z.unknown(),syncedWith:z.unknown(),archivedAt:z.unknown(),quotedText:z.unknown()});
export function nativeCommentAuthor(value:unknown){
  const source=z.object({user:z.object({id:actor}).nullable().optional(),author:z.object({id:actor}).nullable().optional()}).parse(value);
  if(source.user&&source.author&&source.user.id!==source.author.id)block('native_author_disagreement');
  const author=source.user??source.author;
  if(!author)return block('native_author_unavailable');
  return {...value as Record<string,unknown>,user:{id:author.id}};
}
const nativeSchema=z.object({workspace:z.object({id:actor,url:z.string()}),issue:z.object({id:z.string(),uuid:uuid,title:z.string(),description:z.string(),url:z.string(),projectId:actor,teamId:actor,createdById:actor,archivedAt:z.null(),updatedAt:z.string().datetime()}),comments:z.array(z.unknown()).max(10000),complete:z.literal(true)});
export class PrivateHost {
  constructor(readonly config:HostConfig,readonly ports:HostPorts){
    hostScopeSchema.parse(config.scope);
    const {scope,inputPolicy:p}=config;
    if(scope.ownerId!==p.ownerId||scope.workspace!==p.workspace||scope.projectId!==p.projectId||scope.teamId!==p.teamId||createPublicKey(config.signingKey).asymmetricKeyType!=='ed25519'||createPublicKey(config.signingKey).export({format:'der',type:'spki'}).toString('hex')!==createPublicKeyPublic(p.hostPublicKey))block('trust_config');
  }
  private attest<T>(purpose:string,payload:T){return {payload,signature:sign(null,Buffer.from(canonical({purpose,payload})),this.config.signingKey).toString('base64')};}
  async readNative(){return (await this.readSource()).receipt;}
  async readSource(){
    const s=this.config.scope, data=nativeSchema.parse(await this.ports.native('read',s));
    if(data.workspace.id!==s.workspaceId||data.workspace.url!==`https://linear.app/${s.workspace}`||data.issue.uuid!==s.issueId||data.issue.projectId!==s.projectId||data.issue.teamId!==s.teamId||data.issue.createdById!==s.ownerId||data.issue.title!=='Atlas presentation feedback'||data.issue.description!==`Private feedback is held in managed, non-synced comments. Human review is required before any draft PR.\n\natlas-linear-managed-v1:${s.issueId}:${s.projectId}:${s.teamId}`)block('native_scope_or_managed_marker');
    const seen=new Set<string>(),records:ReturnType<typeof validateNative>['record'][]=[];
    const reserved=new Set(Array.from({length:1000},(_,i)=>managedCommentId(s.issueId,i+1)));
    for(const raw of data.comments){
      const c=z.object({id:actor,body:z.string().max(32768)}).parse(raw);
      if(seen.has(c.id))block('duplicate_comment');seen.add(c.id);
      if(!c.body.startsWith(PRIVATE_PURPOSE)&&!reserved.has(c.id))continue;
      const lane=commentSchema.parse(nativeCommentAuthor(raw));
      for(const field of ['parent','externalThread','syncedWith','archivedAt','quotedText'])if(!Object.hasOwn(raw as object,field))block('native_comment_lane_unavailable');
      if(lane.issue?.id!==s.issueId||lane.user?.id!==s.ownerId||lane.parent!==null||lane.externalThread!==null||lane.archivedAt!==null||lane.quotedText!==null||(lane.syncedWith!==null&&(!Array.isArray(lane.syncedWith)||lane.syncedWith.length)))block('native_comment_not_ordinary');
      const match=/^atlas-linear-private-v1\n```json\n([\s\S]+)\n```$/.exec(c.body);
      if(!match||c.body.length>16384)return block('backend_comment_codec');
      const record=JSON.parse(match[1]);
      if(c.id!==managedCommentId(s.issueId,record.version)||renderPrivateComment(record)!==c.body)block('backend_comment_codec');
      records.push(record);
    }
    records.sort((a,b)=>a.version-b.version);
    const receipt=this.attest('atlas-linear-native-read-v1',{readAt:Date.now(),workspace:s.workspace,issue:{id:data.issue.uuid,identifier:data.issue.id,url:data.issue.url,projectId:s.projectId,teamId:s.teamId},records});
    validateNative(receipt,this.config.inputPolicy);return {receipt,comments:data.comments};
  }
}
function createPublicKeyPublic(key:KeyLike){
  // createPublicKey() itself rejects an already-public KeyObject on some Node versions.
  const publicKey=typeof key==='object'&&'type' in key&&key.type==='public'?key:createPublicKey(key);
  return publicKey.export({format:'der',type:'spki'}).toString('hex');
}
