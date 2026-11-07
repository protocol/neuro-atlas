import {readFile,lstat} from 'node:fs/promises';
import {createPrivateKey,createPublicKey,type KeyLike} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {hostScopeSchema,PrivateHost} from './host';
import {slackConfigSchema} from './host-slack';
import {HostWorkflow} from './host-workflow';
import {ReviewController} from './controller';
import {livePorts} from './host-transport';
import {uuid,validateNative,type InputPolicy} from './input';
import {FileIntakeWitness} from './witness-store';
import {loadReviewController} from './runtime';

const absolute=z.string().refine(path.isAbsolute),envName=z.string().regex(/^[A-Z][A-Z0-9_]{0,99}$/);
const schema=z.object({
  root:absolute,repo:absolute,scope:hostScopeSchema,slack:slackConfigSchema,
  reviewConfigPath:absolute.optional(),inputAuthority:z.enum(['ordinary-v1','witnessed-intake-v1']).optional(),historyWitnessRoot:absolute.optional(),
  hostPublicKeyPath:absolute,capturePublicKeyPath:absolute,hostSigningKeyEnv:envName,recordKeyEnv:envName,publisherSigningKeyEnv:envName,githubTokenEnv:envName,
  reviewerVerificationReferences:z.record(z.string(),z.string().min(1).max(1000)),syncAuditReference:z.string().min(1).max(1000),
}).strict().refine(c=>c.inputAuthority==='witnessed-intake-v1'?!!c.historyWitnessRoot:c.historyWitnessRoot===undefined);
const blocked=(reason:string):never=>{throw new Error('host_blocked:'+reason);};
async function bytes(file:string,max=16*1024*1024){
  if(!path.isAbsolute(file))return blocked('private_file_path');
  const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)||s.uid!==process.getuid?.()||s.size>max)return blocked('private_file');return readFile(file);
}
const required=(env:NodeJS.ProcessEnv,name:string)=>{if(!env[name])throw new Error('host_setup_missing:'+name);return env[name]!;};
function publicDer(key:KeyLike){const k=typeof key==='object'&&'type'in key&&key.type==='public'?key:createPublicKey(key);return k.export({type:'spki',format:'der'});}
/** One-shot HOST entry. The owner-account/model/quota lane supplies an actual constructed
 * ReviewController in trusted code. Its discriminated account/pricing/count policy is not
 * decoded, defaulted or rewritten here. In particular UNPRICED is never fabricated USD.
 * No serialized module/command/provider hook, signing endpoint, service or scheduler exists.
 */
export async function hostRuntimeMain(args:string[],env:NodeJS.ProcessEnv=process.env,controller?:ReviewController):Promise<unknown>{
  if(env.ATLAS_LINEAR_HOST_ENABLED!=='true')return {state:'disabled'};
  const [command,id,message,before,after]=args;
  if(!['native','prepare','status','capture','deliver','decide','publish'].includes(command))return blocked('command');
  if(!['native','prepare'].includes(command)&&!uuid.safeParse(id).success)return blocked('issue_id');
  if(command==='decide'&&(args.length!==3||!/^[0-9]{10,16}\.[0-9]{6}$/.test(message)))return blocked('source_message');
  if(command==='capture'&&args.length!==5)return blocked('capture_arguments');
  if(['deliver','decide'].includes(command)&&env.ATLAS_LINEAR_HOST_WRITES_ENABLED!=='true')return {state:'disabled'};
  if(command==='publish'&&(env.ATLAS_LINEAR_HOST_WRITES_ENABLED!=='true'||env.ATLAS_LINEAR_HOST_PUBLISH_ENABLED!=='true'))return {state:'disabled'};
  const c=schema.parse(JSON.parse((await bytes(required(env,'ATLAS_LINEAR_HOST_CONFIG'),65536)).toString()));
  const reviewers=c.slack.verifiedHumanReviewerIds;
  if(Object.keys(c.reviewerVerificationReferences).length!==reviewers.length||reviewers.some(r=>!Object.hasOwn(c.reviewerVerificationReferences,r)))return blocked('verified_reviewers_required');
  if(command!=='native'&&!(controller instanceof ReviewController)){
    if(!c.reviewConfigPath)throw new Error('host_setup_missing:OWNER_ACCOUNT_CONTROLLER');
    controller=await loadReviewController({...env,ATLAS_LINEAR_REVIEW_CONFIG:c.reviewConfigPath,ATLAS_LINEAR_REVIEW_RECORD_KEY:required(env,c.recordKeyEnv)});
    if(controller.config.provider!=='hermes-astra')return blocked('selected_account_required');
  }
  if(command==='prepare'&&[c.publisherSigningKeyEnv,c.githubTokenEnv].some(name=>env[name]))return blocked('publisher_credentials_in_preparation');
  const recordKeyText=required(env,c.recordKeyEnv);
  if(!/^[A-Za-z0-9_-]{43}$/.test(recordKeyText)||Buffer.from(recordKeyText,'base64url').toString('base64url')!==recordKeyText)return blocked('derived_record_key');
  const hostPublicKey=createPublicKey(await bytes(c.hostPublicKeyPath,8192)),capturePublicKey=createPublicKey(await bytes(c.capturePublicKeyPath,8192)),signingKey=createPrivateKey(required(env,c.hostSigningKeyEnv));
  if(hostPublicKey.asymmetricKeyType!=='ed25519'||capturePublicKey.asymmetricKeyType!=='ed25519')return blocked('ed25519_required');
  const configuredAuthority=c.inputAuthority??'ordinary-v1';
  if(controller && (controller.config.inputPolicy.authority??'ordinary-v1')!==configuredAuthority)return blocked('controller_authority_binding');
  const historyWitness=configuredAuthority==='witnessed-intake-v1'?new FileIntakeWitness({root:c.historyWitnessRoot!,scope:{workspaceId:c.scope.workspaceId,ownerId:c.scope.ownerId,projectId:c.scope.projectId,teamId:c.scope.teamId}}):undefined;
  if(controller && historyWitness && (controller.config.historyWitness?.root!==historyWitness.root||controller.config.historyWitness?.policyDigest!==historyWitness.policyDigest))return blocked('controller_authority_binding');
  const inputPolicy:InputPolicy=controller?.config.inputPolicy??{ownerId:c.scope.ownerId,workspace:c.scope.workspace,projectId:c.scope.projectId,teamId:c.scope.teamId,hostPublicKey,recordKey:Buffer.from(recordKeyText,'base64url'),...(configuredAuthority==='witnessed-intake-v1'?{authority:'witnessed-intake-v1' as const,workspaceId:c.scope.workspaceId,issueId:c.scope.issueId}:{authority:'ordinary-v1' as const})};
  if(!inputPolicy.recordKey.equals(Buffer.from(recordKeyText,'base64url'))||!publicDer(inputPolicy.hostPublicKey).equals(publicDer(hostPublicKey)))return blocked('controller_trust_binding');
  const host={scope:c.scope,inputPolicy,signingKey,historyWitness:controller?.config.historyWitness??historyWitness};
  if(command==='native'){const verified=validateNative(await new PrivateHost(host,livePorts()).readNative(),inputPolicy);return {state:'verified',issueId:c.scope.issueId,version:verified.record.version,recordHash:verified.recordHash};}
  const common=controller!.config;
  if(common.root!==c.root||common.repo!==c.repo||common.inputPolicy.ownerId!==c.scope.ownerId||common.inputPolicy.workspace!==c.scope.workspace||common.inputPolicy.projectId!==c.scope.projectId||common.inputPolicy.teamId!==c.scope.teamId||!publicDer(common.capturePublicKey).equals(publicDer(capturePublicKey)))return blocked('controller_trust_binding');
  const w=new HostWorkflow({host,slack:c.slack,controller:controller!,writesEnabled:env.ATLAS_LINEAR_HOST_WRITES_ENABLED==='true',publishEnabled:env.ATLAS_LINEAR_HOST_PUBLISH_ENABLED==='true'});
  if(!['native','prepare'].includes(command)&&id!==c.scope.issueId)return blocked('issue_scope');
  if(command==='prepare')return w.controller.prepare();
  if(command==='status')return w.controller.status(id);
  if(command==='capture')return w.controller.attachCapture(id,JSON.parse((await bytes(message)).toString()),await bytes(before),await bytes(after));
  if(command==='deliver')return w.deliver(id);
  if(command==='decide')return w.admitDecision(id,message);
  return w.publish(id,{enabled:true,signingKey:createPrivateKey(required(env,c.publisherSigningKeyEnv)),github:{origin:'https://api.github.com',token:()=>required(env,c.githubTokenEnv)}});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  hostRuntimeMain(process.argv.slice(2)).then(v=>process.stdout.write(JSON.stringify(v)+'\n')).catch(error=>{
    const reason=error instanceof Error&&/^host_(?:setup_missing:[A-Z0-9_]+|blocked:[a-z_]+|transport:[a-z_]+)$/.test(error.message)?error.message:'host_blocked:invalid_or_unavailable_setup';
    process.stderr.write(JSON.stringify({state:'blocked',reason})+'\n');process.exitCode=1;
  });
}
