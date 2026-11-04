/** Shared private intake/worker validators. Never imported by the browser composer. */
import {z} from 'zod';
import {FEEDBACK_TARGET_IDS,FEEDBACK_CHART_IDS,FEEDBACK_SCENARIOS,FEEDBACK_POLICY_VERSION,FEEDBACK_SIMPLE_POLICY_VERSION,type FeedbackSubmission} from './contracts';
export const feedbackText=(max:number)=>z.string().min(1).max(max).refine(s=>s.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s));
export const publicContextSchema=z.object({
  route:z.enum(['/','/field-velocity','/funding','/milestones','/ecosystem','/methodology']),
  targetId:z.enum(FEEDBACK_TARGET_IDS).optional(),chartId:z.enum(FEEDBACK_CHART_IDS).optional(),scenario:z.enum(FEEDBACK_SCENARIOS).optional(),
  viewport:z.object({width:z.number().int().min(1).max(10000),height:z.number().int().min(1).max(10000)}).strict(),
  theme:z.enum(['light','dark','system']),deployedRevision:z.string().regex(/^[a-f0-9]{40}$/).optional(),
}).strict();
const tag=/^[a-z][a-z0-9-]{0,31}$/;
export const elementReferenceSchema=z.object({
  selector:z.string().min(1).max(1024),tagName:z.string().regex(tag),
  role:z.string().min(1).max(32).regex(/^[a-z][a-z-]*$/).optional(),
  classes:z.array(z.string().min(1).max(64).regex(/^[A-Za-z_][A-Za-z0-9_-]*$/)).max(8).optional(),
}).strict().refine(e=>{
  const segments=e.selector.split(' > ');
  return segments.length<=24 && segments.every(s=>{
    const m=/^([a-z][a-z0-9-]{0,31})(?::nth-of-type\(([1-9][0-9]{0,4})\))?$/.exec(s);
    return m!==null && (!m[2]||Number(m[2])<=10000);
  }) && segments.at(-1)?.split(':')[0]===e.tagName;
});
export const legacyTaskSchema=z.object({title:feedbackText(100),summary:feedbackText(1500),acceptance:z.array(feedbackText(200)).min(1).max(5)}).strict();
// Fixed server-owned public prose. Origin is immutable and bound by public approval hash/signature.
export const PRIVATE_FEEDBACK_TASK=Object.freeze({
  origin:'private-feedback-v1' as const,title:'Presentation update',
  summary:'Apply a bounded presentation adjustment from private feedback.',
  acceptance:Object.freeze(['Only approved CSS declaration values change.','Trusted baseline and candidate checks pass.']),
});
export const privateTaskSchema=z.object({
  origin:z.literal(PRIVATE_FEEDBACK_TASK.origin),title:z.literal(PRIVATE_FEEDBACK_TASK.title),summary:z.literal(PRIVATE_FEEDBACK_TASK.summary),
  acceptance:z.tuple([z.literal(PRIVATE_FEEDBACK_TASK.acceptance[0]),z.literal(PRIVATE_FEEDBACK_TASK.acceptance[1])]),
}).strict();
export const publicTaskSchema=z.union([legacyTaskSchema,privateTaskSchema]);
export const privateInstructionSchema=z.object({feedback:feedbackText(3000),element:elementReferenceSchema.optional()}).strict();
const legacyShape={privateComment:feedbackText(3000),publicTask:legacyTaskSchema,publicApproval:z.object({approved:z.literal(true),policyVersion:z.literal(FEEDBACK_POLICY_VERSION)}).strict(),context:publicContextSchema};
const simpleShape={feedback:feedbackText(3000),processingConsent:z.object({approved:z.literal(true),policyVersion:z.literal(FEEDBACK_SIMPLE_POLICY_VERSION)}).strict(),context:publicContextSchema.extend({element:elementReferenceSchema.optional()}).strict()};
export const feedbackInputSchema=z.union([z.object(legacyShape).strict(),z.object(simpleShape).strict()]);
const version={expectedVersion:z.number().int().min(1).max(2147483646)};
export const feedbackFollowupSchema=z.union([z.object({...legacyShape,...version}).strict(),z.object({...simpleShape,...version}).strict()]);
export function normalizeFeedback(input:FeedbackSubmission) {
  if('feedback' in input) {
    const {element,...publicContext}=input.context;
    const privateInstruction={feedback:input.feedback,...(element?{element}:{})};
    return {publicTask:{...PRIVATE_FEEDBACK_TASK,acceptance:[...PRIVATE_FEEDBACK_TASK.acceptance]},publicContext,privateInput:privateInstruction,privateInstruction};
  }
  return {publicTask:input.publicTask,publicContext:input.context,privateInput:{privateComment:input.privateComment}};
}

export type PrivateInstruction=z.infer<typeof privateInstructionSchema>;
/** Only the fixed marker admits private processing. Unknown/missing/mixed modes fail closed. */
export function approvedPrivateInstruction(task:unknown,context:unknown,value:unknown):PrivateInstruction|undefined {
  const marked=!!task && typeof task==='object' && Object.hasOwn(task,'origin');
  if(!marked) {if(value!==undefined)throw new Error('needs_human_review');return undefined;}
  const t=privateTaskSchema.safeParse(task),c=publicContextSchema.safeParse(context),p=privateInstructionSchema.safeParse(value);
  if(!t.success||!c.success||!p.success)throw new Error('needs_human_review');
  return p.data;
}
