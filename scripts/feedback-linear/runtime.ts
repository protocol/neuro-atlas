import {readFile, lstat} from 'node:fs/promises';
import {createPublicKey} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {ReviewController, type ReviewConfig, type Job} from './controller';
import {uuid} from './input';

const absolute = z.string().refine(path.isAbsolute);
const positive = z.number().finite().positive();
const configSchema = z.object({
  root:absolute,repo:absolute,nativeReadPath:absolute,hostPublicKeyPath:absolute,capturePublicKeyPath:absolute,
  ownerId:z.string(),workspace:z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),projectId:z.string(),teamId:z.string(),channelId:z.string().min(1),reviewerIds:z.array(z.string().min(1)).min(1),
  maxJobUsd:positive,maxDayUsd:positive,maxTokens:positive.int(),maxWallMs:positive.int().max(600000),proposalTtlMs:positive.int().max(86400000),
  provider:z.literal('anthropic'),
  model:z.object({model:z.string().min(1),inputUsdPerMillion:positive,outputUsdPerMillion:positive,maxInputTokens:positive.int(),maxOutputTokens:positive.int().max(8192),maxBodyBytes:positive.int().max(131072),maxResponseBytes:positive.int().max(262144),timeoutMs:positive.int().max(120000)}).strict(),
}).strict();
async function privateBytes(file: string): Promise<Buffer> {
  if (!path.isAbsolute(file)) throw new Error('runtime_blocked');
  const s = await lstat(file);
  if (!s.isFile() || s.isSymbolicLink() || (s.mode & 0o077) || s.uid !== process.getuid?.() || s.size > 8 * 1024 * 1024) throw new Error('runtime_blocked');
  return readFile(file);
}
const privateJson = async (file: string) => JSON.parse((await privateBytes(file)).toString());
/** Local operator CLI only. No listener, HTTP route, service, scheduler or receipt signer. */
export async function runtimeMain(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<unknown> {
  if (env.ATLAS_LINEAR_REVIEW_ENABLED !== 'true') return {state:'disabled'};
  try {
    const [role,id,receiptPath,beforePath,afterPath] = args;
    if (!['prepare','status','capture','delivered','decide','publish'].includes(role) || (role !== 'prepare' && !uuid.safeParse(id).success)) throw new Error();
    if (role === 'publish') {
      if (env.ATLAS_LINEAR_REVIEW_PUBLISH_ENABLED !== 'true') return {state:'disabled'};
      // No fake file-based current-thread adapter. The qualified HOST invokes publish() directly.
      throw new Error('runtime_blocked');
    }
    if (role === 'prepare' && ['FEEDBACK_GITHUB_INSTALLATION_TOKEN','GH_TOKEN','GITHUB_TOKEN','ATLAS_LINEAR_REVIEW_RECEIPT_PRIVATE_KEY'].some(k=>env[k])) throw new Error();
    const c = configSchema.parse(await privateJson(env.ATLAS_LINEAR_REVIEW_CONFIG ?? ''));
    const key = env.ATLAS_LINEAR_REVIEW_RECORD_KEY ?? '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(key) || Buffer.from(key,'base64url').length !== 32 || Buffer.from(key,'base64url').toString('base64url') !== key) throw new Error();
    const hostPublicKey = createPublicKey(await privateBytes(c.hostPublicKeyPath)), capturePublicKey = createPublicKey(await privateBytes(c.capturePublicKeyPath));
    if (hostPublicKey.asymmetricKeyType !== 'ed25519' || capturePublicKey.asymmetricKeyType !== 'ed25519') throw new Error();
    const config: ReviewConfig = {enabled:true,root:c.root,repo:c.repo,inputPolicy:{ownerId:c.ownerId,workspace:c.workspace,projectId:c.projectId,teamId:c.teamId,hostPublicKey,recordKey:Buffer.from(key,'base64url')},channelId:c.channelId,reviewerIds:c.reviewerIds,capturePublicKey,readNative:()=>privateJson(c.nativeReadPath),mainOrigin:'https://api.github.com',maxJobUsd:c.maxJobUsd,maxDayUsd:c.maxDayUsd,maxTokens:c.maxTokens,maxWallMs:c.maxWallMs,proposalTtlMs:c.proposalTtlMs,model:{...c.model,enabled:true,origin:'https://api.anthropic.com'},modelKey:()=>env.FEEDBACK_ANTHROPIC_API_KEY ?? ''};
    const controller = new ReviewController(config);
    let result: Job | {state:'disabled'};
    if (role === 'prepare') result = await controller.prepare();
    else if (role === 'status') result = await controller.status(id);
    else if (role === 'capture') result = await controller.attachCapture(id,await privateJson(receiptPath),await privateBytes(beforePath),await privateBytes(afterPath));
    else if (role === 'delivered') result = await controller.delivered(id,await privateJson(receiptPath));
    else if (role === 'decide') result = await controller.decide(id,await privateJson(receiptPath));
    else throw new Error('runtime_blocked');
    // Private local receipt, not a public website status endpoint or an image preview assertion.
    return result;
  } catch {throw new Error('runtime_blocked');}
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runtimeMain(process.argv.slice(2)).then(value=>process.stdout.write(JSON.stringify(value)+'\n')).catch(()=>{process.stderr.write('{"state":"blocked"}\n');process.exitCode=1;});
}
