import { readFileSync, mkdirSync, writeFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { validateCitationBundle, citationHash, citationFingerprint } from '../../src/lib/field-velocity/citation-latency-feed';
import { spawnSync } from 'node:child_process';
import { CITATION_BRANCH, CITATION_FEED_PATH, CITATION_REVISION } from '../../src/lib/field-velocity/citation-latency-reader';
import { z } from 'zod';

export const DATA_BRANCH_VERCEL = JSON.stringify({ '$schema': 'https://openapi.vercel.sh/vercel.json', git: { deploymentEnabled: false } }, null, 2) + '\n';
export type StagedFeed = { files: Record<string,string>; generatedAt:string; published:false };

/** Full private receipt replay is mandatory before public staging; never relabel old bytes. */
export async function stageCitationFeed(source:string,out:string,now=new Date(),allowHistoricalStage=false):Promise<StagedFeed> {
  const destination=resolve(out);
  if (!destination.startsWith(resolve('.qa')+'/') || existsSync(destination)) throw new Error('Use a fresh staging directory under .qa');
  const csv=readFileSync(resolve(source,'neurotech.csv'),'utf8');
  const provenance=JSON.parse(readFileSync(resolve(source,'provenance.json'),'utf8'));
  const validated=await validateCitationBundle({version:1,csv,provenance},now);
  const manifest=readFileSync(resolve(source,'manifest.json'),'utf8');
  if (await citationHash(manifest)!==validated.bundle.provenance.manifestSha256) throw new Error('Receipt manifest hash mismatch');
  const proof=JSON.parse(manifest),p=validated.bundle.provenance;
  if(proof.startedAt!==p.startedAt||proof.generatedAt!==p.generatedAt||proof.finishedAt!==p.finishedAt||proof.csvSha256!==p.csvSha256||proof.complete!==true||!Array.isArray(proof.receipts)||proof.receipts.length!==p.receiptCount)throw new Error('Public provenance does not match private receipt manifest');
  for(let i=0;i<proof.receipts.length;i++) {
    const entry=proof.receipts[i];
    if(entry.file!==`${String(i).padStart(5,'0')}.json`||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid private receipt identity');
    const path=resolve(source,entry.file);
    if(statSync(path).size>8000000)throw new Error('Private receipt size exceeded');
    const raw=readFileSync(path,'utf8');
    if(await citationHash(raw)!==entry.sha256)throw new Error('Private receipt hash mismatch');
    assertCitationReceipt(JSON.parse(raw));
  }
  if(!allowHistoricalStage && validated.generatedAt.slice(0,10)!==now.toISOString().slice(0,10))throw new Error('First source must be explicitly staged; historical source requires historical-stage opt-in');
  mkdirSync('.qa',{recursive:true});
  const replay=mkdtempSync(resolve('.qa/citation-replay-'));
  try {
    const env={...process.env};delete env.OPENALEX_API_KEY;delete env.OPENALEX_EMAIL;
    const result=spawnSync('python3',['scripts/openalex-citation-latency.py','--run',resolve(source),'--out',resolve(replay,'replayed.csv')],{encoding:'utf8',env,timeout:120000,maxBuffer:100000});
    if(result.status!==0 || result.error || readFileSync(resolve(replay,'replayed.csv'),'utf8')!==csv) throw new Error('Private source receipt replay failed; no stage written');
  }finally{rmSync(replay,{recursive:true,force:true});}
  const files={ [CITATION_FEED_PATH]:JSON.stringify(validated.bundle,null,2)+'\n', 'vercel.json':DATA_BRANCH_VERCEL };
  mkdirSync(destination,{recursive:true});
  for(const [path,bytes] of Object.entries(files)) {mkdirSync(dirname(resolve(destination,path)),{recursive:true});writeFileSync(resolve(destination,path),bytes,{flag:'wx'});}
  return {files,generatedAt:validated.generatedAt,published:false};
}
export const citationPublishTarget = { repository: 'https://github.com/protocol/neuro-atlas.git', ref: `refs/heads/${CITATION_BRANCH}` } as const;

const workId=z.string().regex(/^https:\/\/openalex\.org\/W[1-9]\d*$/);
const receiptWork=z.object({id:workId,publication_year:z.number().int().min(1).max(9999).nullable(),referenced_works:z.array(workId).nullable().optional()}).passthrough();
const receiptShape=z.object({
  request:z.object({filter:z.string(),'per-page':z.number().int().min(1).max(80),sample:z.number().int().min(1).max(80).optional(),seed:z.literal(42).optional(),select:z.enum(['id,publication_year','id,publication_year,referenced_works']).optional()}).strict(),
  response:z.object({meta:z.object({count:z.number().int().nonnegative().safe()}).passthrough().optional(),results:z.array(receiptWork).max(80).optional()}).passthrough(),
}).strict();
/** Private-only source schema gate; a malformed HTTP 200 cannot masquerade as an evidence gap. */
export function assertCitationReceipt(input:unknown) {
  const parsed=receiptShape.safeParse(input);
  if(!parsed.success)throw new Error('Malformed private citation source receipt');
  const {request:q,response:r}=parsed.data;
  if(q.sample!==undefined) {
    const year=Number(q.filter.split('publication_year:').at(-1));
    if(q.seed!==42||q.select!=='id,publication_year,referenced_works'||!r.results||r.results.length>q.sample||(q.sample>1&&r.results.length!==q.sample)||new Set(r.results.map(w=>w.id)).size!==r.results.length||r.results.some(w=>w.publication_year!==year||w.referenced_works===undefined))throw new Error('Incomplete private citation sample receipt');
  } else if(q.select==='id,publication_year') {
    const requested=new Set(q.filter.replace(/^openalex_id:/,'').split('|'));
    if(!q.filter.startsWith('openalex_id:')||!r.results||r.results.length>50||new Set(r.results.map(w=>w.id)).size!==r.results.length||r.results.some(w=>!requested.has(w.id.split('/').at(-1)!)))throw new Error('Malformed private citation reference receipt');
  } else if(q.select!==undefined||!r.meta||q['per-page']!==1)throw new Error('Malformed private citation count receipt');
}

export type GitRunner = (args: string[], options: { cwd: string; input?: string; env?: Partial<NodeJS.ProcessEnv> }) => string;
const runGit: GitRunner = (args, options) => {
  const result = spawnSync('git', args, { ...options, encoding: 'utf8', timeout: 60_000, maxBuffer: 2_000_000, env: { ...process.env, ...options.env, GIT_TERMINAL_PROMPT: '0' } });
  if (result.status !== 0 || result.error) throw new Error('Git feed operation failed; inspect exact ref before retrying');
  return result.stdout;
};

/** Explicit publish only. Exact target and exact expected ref; no code trees or automatic retry. */
export async function publishCitationFeed(files: Record<string, string>, expected: string, options: {allowAbsentBootstrap?:boolean} = {}, run: GitRunner = runGit, now = new Date()) {
  if (Object.keys(files).sort().join('\n') !== [CITATION_FEED_PATH, 'vercel.json'].sort().join('\n') || files['vercel.json'] !== DATA_BRANCH_VERCEL) throw new Error('Only approved feed paths and deployment suppression are publishable');
  if (expected !== 'absent' && !CITATION_REVISION.test(expected)) throw new Error('Explicit expected revision or absent is required');
  if (expected === 'absent' && options.allowAbsentBootstrap !== true) throw new Error('Absent bootstrap requires explicit parent-controlled installation opt-in');
  const next = await validateCitationBundle(JSON.parse(files[CITATION_FEED_PATH]),now);
  if (next.generatedAt.slice(0,10)!==now.toISOString().slice(0,10)) throw new Error('Publish acquisition must be current; historical staging never authorizes publication');
  const { repository, ref } = citationPublishTarget;
  // Empty helper resets configured providers; gh's existing broker handles credentials natively.
  const auth = ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential'];
  const remoteHead = () => run([...auth, 'ls-remote', '--refs', repository, ref], { cwd: process.cwd() }).trim().split(/\s/)[0] || 'absent';
  if (remoteHead() !== expected) throw new Error('Data branch changed from expected revision; stop and inspect');
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa/feed-publish-'));
  const git = (args: string[], input?: string, env?: Partial<NodeJS.ProcessEnv>) => run(['--git-dir', dir, ...args], { cwd: process.cwd(), input, env });
  try {
    run(['init', '--bare', dir], { cwd: process.cwd() });
    if (expected !== 'absent') {
      git([...auth, 'fetch', '--no-tags', '--depth=1', repository, ref]);
      if (git(['rev-parse', 'FETCH_HEAD']).trim() !== expected) throw new Error('Data branch changed during fetch');
      assertCitationTree(git(['ls-tree','-r','-t',expected]));
      if (git(['show', `${expected}:vercel.json`]) !== DATA_BRANCH_VERCEL) throw new Error('Existing branch lacks deployment suppression');
      const previous = await validateCitationBundle(JSON.parse(git(['show', `${expected}:${CITATION_FEED_PATH}`])),now);
      if (Date.parse(previous.generatedAt)>Date.parse(next.generatedAt)) throw new Error('Refusing to publish an older acquisition');
      if (await citationFingerprint(previous)===await citationFingerprint(next)) {
        if(remoteHead()!==expected)throw new Error('Data branch changed during no-op check');
        return {revision:expected,ref,paths:Object.keys(files),verified:true,unchanged:true};
      }
    }
    const blob = (content: string) => git(['hash-object', '-w', '--stdin'], content).trim();
    const feedBlob = blob(files[CITATION_FEED_PATH]), configBlob = blob(files['vercel.json']);
    const leaf = git(['mktree'], `100644 blob ${feedBlob}\tfeed.json\n`).trim();
    const feedTree = git(['mktree'], `040000 tree ${leaf}\topenalex-citation-latency\n`).trim();
    const tree = git(['mktree'], `040000 tree ${feedTree}\tfeed\n100644 blob ${configBlob}\tvercel.json\n`).trim();
    const name = 'Neuro Atlas data refresh', email = 'neuro-atlas-data@users.noreply.github.com';
    const message = `OpenAlex citation latency ${next.generatedAt.slice(0,10)}`;
    // Git's author/committer environment overrides -c user.* configuration.
    const revision = git(['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit-tree', tree, ...(expected === 'absent' ? [] : ['-p', expected]), '-m', message], undefined, {
      GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email,
    }).trim();
    // Inspect the actual object, not just commit arguments. Never echo unexpected
    // private metadata (including a failed inspection's output) into operator logs.
    try {
      const metadata = CITATION_REVISION.test(revision) && git(['show', '--no-patch', '--format=format:%an%x00%ae%x00%cn%x00%ce%x00%B', revision]);
      if (metadata !== [name, email, name, email, `${message}\n`].join('\0')) throw new Error('Unapproved commit metadata');
    } catch {
      throw new Error('Created data commit metadata failed public identity/message verification');
    }
    git([...auth, 'push', `--force-with-lease=${ref}:${expected === 'absent' ? '' : expected}`, repository, `${revision}:${ref}`]);
    if (remoteHead() !== revision) throw new Error('Published ref readback changed; do not retry automatically');
    git([...auth, 'fetch', '--no-tags', '--depth=1', repository, ref]);
    if (git(['rev-parse', 'FETCH_HEAD']).trim() !== revision) throw new Error('Published fetch readback changed');
    assertCitationTree(git(['ls-tree','-r','-t',revision]));
    const parents=git(['cat-file','-p',revision]).split('\n\n')[0].split('\n').filter(line=>line.startsWith('parent ')).map(line=>line.slice(7)).join(' ');
    if(parents!==(expected==='absent'?'':expected))throw new Error('Published parent verification failed');
    const readbackMetadata=git(['show','--no-patch','--format=format:%an%x00%ae%x00%cn%x00%ce%x00%B',revision]);
    if(readbackMetadata!==[name,email,name,email,`${message}\n`].join('\0'))throw new Error('Published metadata verification failed');
    for (const [path, bytes] of Object.entries(files)) if (git(['show', `FETCH_HEAD:${path}`]) !== bytes) throw new Error('Published source bytes differ');
    return { revision, ref, paths: Object.keys(files), verified: true };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Complete tree includes exact regular-file modes and directory identities. */
export function assertCitationTree(output:string) {
  const expected:Record<string,string>={'feed':'040000 tree','feed/openalex-citation-latency':'040000 tree',[CITATION_FEED_PATH]:'100644 blob','vercel.json':'100644 blob'};
  const rows=output.trim().split('\n');
  if(rows.length!==4)throw new Error('Unapproved data tree paths');
  const seen=new Set<string>();
  for(const row of rows){const match=/^(\d{6} (?:blob|tree)) ([a-f0-9]{40})\t(.+)$/.exec(row);if(!match||expected[match[3]]!==match[1]||seen.has(match[3]))throw new Error('Unapproved data tree path/mode');seen.add(match[3]);}
}
