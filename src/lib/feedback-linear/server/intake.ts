import {z} from 'zod';
import {isLoopbackUrl} from '../../feedback/config';
import {createHttpIntakeWitness} from './witness-client';
import {assertWitnessChain,witnessOperation} from './witness';
import {FeedbackError, invalid, unavailable} from '../../feedback/errors';
import type {LinearFeedbackInput, LinearFeedbackPrivateRecord} from '../contracts';
import type {LinearConfig} from './config';
import {UUID_V4} from './config';
import type {createLinearProvider} from './provider';
import type {LinearActor} from './service';
import {corrupt,linearInputSchema,linearFollowupSchema,managedCommentId,parsePrivateComment,privateRecordHash,requestHash,signPrivateRecord,renderPrivateComment,PRIVATE_PURPOSE} from './records';
const TITLE='Atlas presentation feedback';
const description=(config:LinearConfig,id:string)=>`Private feedback is held in managed, non-synced comments. Human review is required before any draft PR.\n\natlas-linear-managed-v1:${id}:${config.projectId}:${config.teamId}`;
const issueSchema=z.object({id:z.string().regex(UUID_V4),title:z.literal(TITLE),description:z.string(),identifier:z.string().regex(/^[A-Z][A-Z0-9]*-[1-9][0-9]*$/),url:z.string(),project:z.object({id:z.string()}),team:z.object({id:z.string()}),creator:z.object({id:z.string()}),createdAt:z.iso.datetime(),updatedAt:z.iso.datetime(),archivedAt:z.null()});
type Issue=z.infer<typeof issueSchema>;
const ISSUE_FIELDS='id title description identifier url project { id } team { id } creator { id } createdAt updatedAt archivedAt';
const ISSUE=`query AtlasIssue($id: ID!) { issues(first: 2, includeArchived: true, filter: {id: {eq: $id}}) { nodes { ${ISSUE_FIELDS} } pageInfo { hasNextPage } } }`;
const CREATE=`mutation AtlasIssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id } } }`;
const COMMENTS=`query AtlasComments($id: ID!, $after: String) { comments(first: 20, after: $after, includeArchived: true, filter: {issue: {id: {eq: $id}}}) { nodes { id body issue { id } user { id } parent { id } externalThread { id } syncedWith { id } archivedAt createdAt } pageInfo { hasNextPage endCursor } } }`;
const COMMENT_CREATE=`mutation AtlasCommentCreate($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id } } }`;
const LIST=`query AtlasList($projectId: ID!, $teamId: ID!, $ownerId: ID!, $after: String) { issues(first: 20, after: $after, includeArchived: true, filter: {project: {id: {eq: $projectId}}, team: {id: {eq: $teamId}}, creator: {id: {eq: $ownerId}}, title: {eq: "Atlas presentation feedback"}, description: {contains: "atlas-linear-managed-v1:"}}) { nodes { ${ISSUE_FIELDS} } pageInfo { hasNextPage endCursor } } }`;
const pageSchema=z.object({nodes:z.array(z.unknown()).max(100),pageInfo:z.object({hasNextPage:z.boolean(),endCursor:z.string().nullable().optional()})});
const commentSchema=z.object({id:z.string(),body:z.string().max(32768),issue:z.object({id:z.string()}).nullable(),user:z.object({id:z.string()}).nullable(),parent:z.object({id:z.string()}).nullable(),externalThread:z.object({id:z.string()}).nullable(),syncedWith:z.array(z.unknown()).nullable(),archivedAt:z.string().nullable(),createdAt:z.string()});
export function createLinearIntake(config:LinearConfig,provider:ReturnType<typeof createLinearProvider>,now:()=>Date) {
  const witness=config.witness?createHttpIntakeWitness({...config.witness,scope:{workspaceId:config.workspaceId,projectId:config.projectId,teamId:config.teamId,ownerId:config.ownerId},testMode:config.testMode&&isLoopbackUrl(config.origin)}):undefined;
  async function requireWitness(){if(witness)await witness.assertAvailable();else if(!(config.testMode&&isLoopbackUrl(config.origin)))return unavailable();}
  const query=(actor:LinearActor,name:string,text:string,variables:Record<string,unknown>)=>provider.graphql(actor.token,name,text,variables);
  function validateIssue(value:unknown,id?:string):Issue {
    const parsed=issueSchema.safeParse(value);if(!parsed.success)return corrupt();const issue=parsed.data;
    if((id && issue.id!==id)||issue.project.id!==config.projectId||issue.team.id!==config.teamId||issue.creator.id!==config.ownerId||issue.description!==description(config,issue.id))return corrupt();
    let url:URL;try{url=new URL(issue.url);}catch{return corrupt();}
    if(url.origin!=='https://linear.app'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(`/${config.workspaceKey}/issue/${issue.identifier}/`))return corrupt();
    return issue;
  }
  async function readIssue(actor:LinearActor,id:string):Promise<Issue|null> {
    const data=await query(actor,'AtlasIssue',ISSUE,{id}),page=pageSchema.safeParse(data.issues);
    if(!page.success||page.data.pageInfo.hasNextPage||page.data.nodes.length>1)return corrupt();
    return page.data.nodes.length?validateIssue(page.data.nodes[0],id):null;
  }
  async function records(actor:LinearActor,id:string) {
    const found:LinearFeedbackPrivateRecord[]=[],seen=new Set<string>();let after:string|null=null;
    const reserved=new Set(Array.from({length:1000},(_,i)=>managedCommentId(id,i+1)));
    for(let pages=0;pages<50;pages++) {
      const data=await query(actor,'AtlasComments',COMMENTS,{id,after}),page=pageSchema.safeParse(data.comments);
      if(!page.success)return corrupt();
      for(const raw of page.data.nodes) {
        const parsed=commentSchema.safeParse(raw);if(!parsed.success)return corrupt();const c=parsed.data;
        if(seen.has(c.id))return corrupt();seen.add(c.id);
        if(!c.body.startsWith(PRIVATE_PURPOSE)&&!reserved.has(c.id))continue;
        if(c.issue?.id!==id||c.user?.id!==config.ownerId||c.parent!==null||c.externalThread!==null||(c.syncedWith!==null&&c.syncedWith.length!==0)||c.archivedAt!==null)return corrupt();
        const record=parsePrivateComment(config,c.body);
        if(record.feedbackId!==id||c.id!==managedCommentId(id,record.version)||Date.parse(record.createdAt)>now().getTime())return corrupt();
        found.push(record);
      }
      if(!page.data.pageInfo.hasNextPage) {
        found.sort((a,b)=>a.version-b.version);
        for(let i=0;i<found.length;i++)if(found[i].version!==i+1||(i>0&&found[i].previousRecordHash!==privateRecordHash(found[i-1])))return corrupt();
        return found;
      }
      const cursor=page.data.pageInfo.endCursor;if(!cursor||cursor===after)return corrupt();after=cursor;
    }
    return corrupt();
  }
  function uuid(value:string|null) {if(!value||!UUID_V4.test(value))return invalid();return value;}
  const receipt=(id:string,version:number)=>({id,state:'received' as const,version});
  async function saveRecord(actor:LinearActor,record:LinearFeedbackPrivateRecord) {
    if(witness&&!await witness.claimEffect(witnessOperation(record),'comment'))return unavailable();
    try {
      const data=await query(actor,'AtlasCommentCreate',COMMENT_CREATE,{input:{id:managedCommentId(record.feedbackId,record.version),issueId:record.feedbackId,body:renderPrivateComment(record),createOnSyncedSlackThread:false,doNotSubscribeToIssue:true}});
      const result=z.object({success:z.literal(true),comment:z.object({id:z.literal(managedCommentId(record.feedbackId,record.version))})}).safeParse(data.commentCreate);
      if(!result.success)return unavailable();
    }catch(error){if(!(error instanceof FeedbackError)||error.status!==503)throw error; /* Ambiguous/duplicate write: read the exact identity below. */}
    const issue=await readIssue(actor,record.feedbackId);if(!issue)return corrupt();
    const history=await records(actor,record.feedbackId),saved=history[record.version-1];
    if(!saved)return unavailable();
    if(privateRecordHash(saved)!==privateRecordHash(record))return conflict();
    if(witness){await witness.complete(witnessOperation(record));await witness.assertLatest(history);}
    return receipt(record.feedbackId,record.version);
  }
  function conflict():never {throw new FeedbackError(409,'conflict','This feedback changed. Refresh its status before submitting again.');}
  const statusValue=(issue:Issue,history:LinearFeedbackPrivateRecord[])=>{
    if(!history.length)return corrupt();
    return {...receipt(issue.id,history.length),createdAt:history[0].createdAt,updatedAt:history.at(-1)!.createdAt,reasonCode:'human_review_required'};
  };
  async function reserveRecord(record:LinearFeedbackPrivateRecord){
    const rows=await witness!.reserve(witnessOperation(record)),op=rows[record.version-1];
    const {signature: _signature,...unsigned}=record;void _signature;
    const canonicalRecord=signPrivateRecord(config,{...unsigned,createdAt:op.createdAt});
    if(privateRecordHash(canonicalRecord)!==op.recordHash)return corrupt();
    return canonicalRecord;
  }
  async function witnessedCreate(actor:LinearActor,id:string,input:LinearFeedbackInput) {
    const rows=await witness!.read(id),known=rows[0];
    const base={schema:'atlas-linear-feedback-v1' as const,feedbackId:id,operationId:id,ownerLinearId:config.ownerId,version:1,createdAt:known?.createdAt??now().toISOString(),input};
    let record=signPrivateRecord(config,{...base,requestHash:requestHash(base)});
    if(known&&known.requestHash!==record.requestHash)return conflict();
    let issue=await readIssue(actor,id);
    if(!known&&issue)return corrupt(); // Never adopt an unknown source identity/history.
    if(known?.state==='committed'){
      if(!issue)return corrupt();await witness!.assertLatest(await records(actor,id));return receipt(id,1);
    }
    record=await reserveRecord(record); // Durable canonical reservation before first issue mutation.
    if(!issue){
      if(!await witness!.claimEffect(witnessOperation(record),'issue'))return unavailable();
      try{
        const data=await query(actor,'AtlasIssueCreate',CREATE,{input:{id,teamId:config.teamId,projectId:config.projectId,title:TITLE,description:description(config,id),useDefaultTemplate:false,labelIds:[],subscriberIds:[],priority:0}});
        if(!z.object({success:z.literal(true),issue:z.object({id:z.literal(id)})}).safeParse(data.issueCreate).success)return unavailable();
      }catch(error){if(!(error instanceof FeedbackError)||error.status!==503)throw error;}
      issue=await readIssue(actor,id);if(!issue)return unavailable();
    }
    const history=await records(actor,id);
    if(history.length){
      if(history.length!==1||privateRecordHash(history[0])!==privateRecordHash(record))return corrupt();
      await witness!.complete(witnessOperation(history[0]));await witness!.assertLatest(history);return receipt(id,1);
    }
    return saveRecord(actor,record);
  }
  async function witnessedFollowup(actor:LinearActor,id:string,operationId:string,value:ReturnType<typeof linearFollowupSchema.parse>) {
    const issue=await readIssue(actor,id);if(!issue)return corrupt();
    const history=await records(actor,id),rows=await witness!.read(id),{expectedVersion,...input}=value,version=expectedVersion+1,known=rows[version-1];
    const base={schema:'atlas-linear-feedback-v1' as const,feedbackId:id,operationId,ownerLinearId:config.ownerId,version,createdAt:known?.createdAt??now().toISOString(),input:input as LinearFeedbackInput};
    const fingerprint=requestHash(base);
    if(known&&known.requestHash!==fingerprint)return conflict();
    if(known?.state==='committed'){await witness!.assertLatest(history);return receipt(id,version);}
    if(known){
      if(rows.length!==version||history.length<expectedVersion||history.length>version)return corrupt();
      assertWitnessChain(rows.slice(0,-1),history.slice(0,expectedVersion),config.ownerId);
    }else{
      await witness!.assertLatest(history);
      if(history.length!==expectedVersion||rows.some(r=>r.operationId===operationId))return conflict();
    }
    let record=signPrivateRecord(config,{...base,requestHash:fingerprint,previousRecordHash:privateRecordHash(history[expectedVersion-1])});
    record=await reserveRecord(record);
    if(history[version-1]){
      if(privateRecordHash(history[version-1])!==privateRecordHash(record))return corrupt();
      await witness!.complete(witnessOperation(history[version-1]));await witness!.assertLatest(history);return receipt(id,version);
    }
    return saveRecord(actor,record);
  }
  return {
    async create(actor:LinearActor,key:string|null,value:unknown) {
      await requireWitness();
      const id=uuid(key),parsed=linearInputSchema.safeParse(value);if(!parsed.success)return invalid();
      if(witness)return witnessedCreate(actor,id,parsed.data as LinearFeedbackInput);
      let issue=await readIssue(actor,id);
      if(!issue) {
        try {
          const data=await query(actor,'AtlasIssueCreate',CREATE,{input:{id,teamId:config.teamId,projectId:config.projectId,title:TITLE,description:description(config,id),useDefaultTemplate:false,labelIds:[],subscriberIds:[],priority:0}});
          const result=z.object({success:z.literal(true),issue:z.object({id:z.literal(id)})}).safeParse(data.issueCreate);if(!result.success)return unavailable();
        }catch(error){if(!(error instanceof FeedbackError)||error.status!==503)throw error;}
        issue=await readIssue(actor,id);if(!issue)return unavailable();
      }
      const history=await records(actor,id),base={schema:'atlas-linear-feedback-v1' as const,feedbackId:id,operationId:id,ownerLinearId:config.ownerId,version:1,createdAt:issue.createdAt,input:parsed.data as LinearFeedbackInput};
      const fingerprint=requestHash(base);
      if(history.length){if(history[0].requestHash!==fingerprint)return conflict();return receipt(id,1);}
      return saveRecord(actor,signPrivateRecord(config,{...base,requestHash:fingerprint}));
    },
    async followup(actor:LinearActor,value:string,key:string|null,body:unknown) {
      await requireWitness();
      const id=uuid(value),operationId=uuid(key),parsed=linearFollowupSchema.safeParse(body);if(!parsed.success)return invalid();
      if(witness)return witnessedFollowup(actor,id,operationId,parsed.data);
      const issue=await readIssue(actor,id);if(!issue)throw new FeedbackError(404,'not_found','Feedback not found.');
      const history=await records(actor,id);if(!history.length)return corrupt();
      const {expectedVersion,...input}=parsed.data,version=expectedVersion+1;
      const base={schema:'atlas-linear-feedback-v1' as const,feedbackId:id,operationId,ownerLinearId:config.ownerId,version,createdAt:now().toISOString(),input:input as LinearFeedbackInput};
      const fingerprint=requestHash(base),existing=history[version-1];
      if(existing){if(existing.requestHash!==fingerprint)return conflict();return receipt(id,version);}
      if(history.length!==expectedVersion||history.some(r=>r.operationId===operationId))return conflict();
      return saveRecord(actor,signPrivateRecord(config,{...base,requestHash:fingerprint,previousRecordHash:privateRecordHash(history.at(-1)!)}));
    },
    async status(actor:LinearActor,value:string) {
      await requireWitness();
      const id=uuid(value),issue=await readIssue(actor,id);if(!issue)throw new FeedbackError(404,'not_found','Feedback not found.');
      const history=await records(actor,id);if(witness)await witness.assertLatest(history);return statusValue(issue,history);
    },
    async list(actor:LinearActor,limit:number) {
      await requireWitness();
      const witnessedIds=witness?await witness.identities():undefined,seen=new Set<string>();
      const items=[];let after:string|null=null;
      for(let pages=0;pages<25;pages++) {
        const data=await query(actor,'AtlasList',LIST,{projectId:config.projectId,teamId:config.teamId,ownerId:config.ownerId,after}),page=pageSchema.safeParse(data.issues);
        if(!page.success)return corrupt();
        for(const raw of page.data.nodes){const issue=validateIssue(raw),history=await records(actor,issue.id);if(seen.has(issue.id))return corrupt();seen.add(issue.id);if(witness)await witness.assertLatest(history);items.push(statusValue(issue,history));if(!witness&&items.length===limit)return {items};}
        if(!page.data.pageInfo.hasNextPage){if(witnessedIds&&(witnessedIds.length!==seen.size||witnessedIds.some(id=>!seen.has(id))||JSON.stringify(witnessedIds)!==JSON.stringify(await witness!.identities())))return corrupt();return {items:items.slice(0,limit)};}
        const cursor=page.data.pageInfo.endCursor;if(!cursor||cursor===after)return corrupt();after=cursor;
      }
      return corrupt();
    },
  };
}
