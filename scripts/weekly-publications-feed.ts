import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {z} from 'zod';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const PUBLICATION_BRANCH='data/openalex-publications-feed';
export const PUBLICATION_SNAPSHOT_PATH='feed/openalex-publications/snapshot.json';
export const PUBLICATION_MANIFEST_PATH='feed/openalex-publications/manifest.json';
export const PUBLICATION_REPOSITORY='https://github.com/protocol/neuro-atlas.git';
export const PUBLICATION_MAX_BYTES=2_000_000;
export const PUBLICATION_MANIFEST_MAX_BYTES=32_000;
export const DATA_BRANCH_VERCEL=JSON.stringify({'$schema':'https://openapi.vercel.sh/vercel.json',git:{deploymentEnabled:false}},null,2)+'\n';
const REVISION=/^[a-f0-9]{40}$/;
const HASH=z.string().regex(/^[a-f0-9]{64}$/);
const UTC=z.string().datetime({offset:true});
export const PUBLICATION_RUNTIME_PATHS=[
 'scripts/publications/acquire.py','scripts/publications/transport.py','scripts/publications/derive.py',
 'scripts/publications/matched_baselines.py','scripts/publications/refresh.py','scripts/publications/acquire_baselines.py',
 'scripts/weekly-publications-feed.ts','src/lib/publication-data.ts','src/lib/publication-feed-server.ts',
 'src/components/publication-source-provider.tsx','src/app/api/publications/route.ts','package.json','package-lock.json','tsconfig.json',
] as const;
/** Structural carrier only; the application parser owns the strict full schema. */
export type PublicationData={schemaVersion:2;source:{url:string;testOnly:boolean;capturedAt:string;methodSha256:string;
 scienceBaseline?:{methodId:string};[key:string]:unknown};tables:unknown;audit:unknown;
 matchedGrowth?:{rows:Record<string,unknown>[];evidence?:Record<string,{retrievedAt?:string;[key:string]:unknown}>;[key:string]:unknown}};
export type PublicationParser=(input:unknown)=>unknown|Promise<unknown>;
export type ValidationOptions={parser?:PublicationParser;allowTestOnly?:boolean;now?:()=>Date};
const proofSchema=z.object({acquisitionManifestSha256:HASH,normalizedSha256:HASH,acquisitionMethodSha256:HASH,
 historyCoverageSha256:HASH,acquisitionStartedAt:UTC,acquisitionCompletedAt:UTC,rawReceiptCount:z.number().int().positive().max(100000),
 scienceInputSha256:HASH,matchedInputSha256:HASH,derivationManifestSha256:HASH,
 scienceEvidence:z.object(Object.fromEntries(['all','life','social','physical','health'].map(k=>[k,
  z.object({responseSha256:HASH,requestSha256:HASH,retrievedAt:UTC}).strict()]))).strict(),
}).strict();
const runtimeSchema=z.object(Object.fromEntries(PUBLICATION_RUNTIME_PATHS.map(p=>[p,HASH]))).strict();
const manifestSchema=z.object({schemaVersion:z.literal(1),snapshotSha256:HASH,fingerprint:HASH,capturedAt:UTC,
 testOnly:z.boolean(),runtimeHashes:runtimeSchema,sourceProof:proofSchema}).strict();

// Tool-only attestation: do not let the server consumer trace arbitrary staging files.
export function publicationRuntimeHashes() {
 return Object.fromEntries(PUBLICATION_RUNTIME_PATHS.map(p=>[p,publicationHash(readFileSync(/* turbopackIgnore: true */ resolve(ROOT,p)))]));
}
export async function validatePublicationSnapshot(input:unknown,options:ValidationOptions={}) {
 const candidate=input as PublicationData;
 if(candidate?.schemaVersion!==2||candidate?.source?.url!=='https://api.openalex.org'||
    (candidate.source.testOnly!==false&&!(options.allowTestOnly===true&&candidate.source.testOnly===true)))throw new Error('Only primary production snapshots are publishable');
 const parser=options.parser??((await import('../src/lib/publication-data')).parsePublicationSnapshot as PublicationParser);
 const value=await parser(input);
 if(canonical(value)!==canonical(input))throw new Error('Production parser must validate the full snapshot without stripping fields');
 return value as PublicationData;
}
export async function validatePublicationFiles(files:Record<string,string>,options:ValidationOptions={}) {
 if(Object.keys(files).sort().join('\n')!==[PUBLICATION_SNAPSHOT_PATH,PUBLICATION_MANIFEST_PATH,'vercel.json'].sort().join('\n')||files['vercel.json']!==DATA_BRANCH_VERCEL)throw new Error('Only exact approved data paths/deployment suppression may publish');
 if(Buffer.byteLength(files[PUBLICATION_SNAPSHOT_PATH])>PUBLICATION_MAX_BYTES||Buffer.byteLength(files[PUBLICATION_MANIFEST_PATH])>PUBLICATION_MANIFEST_MAX_BYTES)throw new Error('Publication size exceeded');
 const snapshot=await validatePublicationSnapshot(JSON.parse(files[PUBLICATION_SNAPSHOT_PATH]),options);
 const manifest=manifestSchema.parse(JSON.parse(files[PUBLICATION_MANIFEST_PATH]));
 if(files[PUBLICATION_SNAPSHOT_PATH]!==JSON.stringify(snapshot,null,2)+'\n'||
    files[PUBLICATION_MANIFEST_PATH]!==JSON.stringify(manifest,null,2)+'\n')throw new Error('Only normalized exact-byte JSON may publish; duplicate keys/hidden fields refused');
 if(manifest.snapshotSha256!==publicationHash(files[PUBLICATION_SNAPSHOT_PATH])||manifest.fingerprint!==publicationFingerprint(snapshot)||
    manifest.capturedAt!==snapshot.source.capturedAt||manifest.testOnly!==snapshot.source.testOnly||
    manifest.sourceProof.acquisitionCompletedAt!==manifest.capturedAt||
    Date.parse(manifest.sourceProof.acquisitionStartedAt)>Date.parse(manifest.capturedAt))throw new Error('Publication manifest/source binding failed');
 return {snapshot,manifest};
}
export async function stagePublicationFiles(snapshot:unknown,proof:unknown,out:string,options:ValidationOptions={}) {
 const destination=resolve(out),qa=resolve(ROOT,'.qa');
 if(!destination.startsWith(qa+'/')||existsSync(destination))throw new Error('Use a fresh .qa staging directory');
 mkdirSync(qa,{recursive:true});
 if(realpathSync(qa)!==qa)throw new Error('Symlink staging root refused');
 // Existing ancestors may not redirect the final destination outside .qa.
 let ancestor=dirname(destination);while(!existsSync(ancestor))ancestor=dirname(ancestor);
 if(realpathSync(ancestor)!==ancestor)throw new Error('Symlink staging ancestor refused');
 const value=await validatePublicationSnapshot(snapshot,options),sourceProof=proofSchema.parse(proof);
 const bytes=JSON.stringify(value,null,2)+'\n';
 const manifest={schemaVersion:1,snapshotSha256:publicationHash(bytes),fingerprint:publicationFingerprint(value),
  capturedAt:value.source.capturedAt,testOnly:value.source.testOnly,runtimeHashes:publicationRuntimeHashes(),sourceProof};
 const files={[PUBLICATION_SNAPSHOT_PATH]:bytes,[PUBLICATION_MANIFEST_PATH]:JSON.stringify(manifest,null,2)+'\n','vercel.json':DATA_BRANCH_VERCEL};
 await validatePublicationFiles(files,options);
 mkdirSync(destination,{recursive:true});
 try {for(const [path,content] of Object.entries(files)) {mkdirSync(dirname(resolve(destination,path)),{recursive:true});writeFileSync(resolve(destination,path),content,{flag:'wx'});}}
 catch(error){rmSync(destination,{recursive:true,force:true});throw error;}
 return files;
}
/** Entire tree, regular modes and directories; no symlinks, executables or code. */
export function assertPublicationTree(output:string) {
 const expected:Record<string,string>={feed:'040000 tree','feed/openalex-publications':'040000 tree',
  [PUBLICATION_SNAPSHOT_PATH]:'100644 blob',[PUBLICATION_MANIFEST_PATH]:'100644 blob','vercel.json':'100644 blob'};
 const seen=new Set<string>(),rows=output.trim().split('\n');
 if(rows.length!==Object.keys(expected).length)throw new Error('Unapproved publication tree paths');
 for(const row of rows){const m=/^(\d{6} (?:blob|tree)) ([a-f0-9]{40})\t(.+)$/.exec(row);if(!m||expected[m[3]]!==m[1]||seen.has(m[3]))throw new Error('Unapproved publication tree path/mode');seen.add(m[3]);}
}


function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export const publicationHash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
/** Evidence receipts are retained in each release, but capture-only churn is quiet. */
export function publicationFingerprint(snapshot: PublicationData): string {
  const s=snapshot.source;
  const source=Object.fromEntries(['url','methodologyVersion','methodSha256','corpus','testOnly','observedThrough',
    'baselineYear','paperEndYear','authorEndYear','coveragePolicy'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]]));
  const matched=snapshot.matchedGrowth ? {...snapshot.matchedGrowth,
    rows:snapshot.matchedGrowth.rows.map(r=>{const row={...r};delete row.evidence;return row;})} : undefined;
  if(matched)delete matched.evidence;
  return publicationHash(canonical({schemaVersion:snapshot.schemaVersion,source,tables:snapshot.tables,audit:snapshot.audit,
    ...(matched ? {matchedGrowth:matched}:{}),scienceMethod:s.scienceBaseline?.methodId??null}));
}


export type PublicationFetch=(url:string,options:RequestInit)=>Promise<Response>;
async function readBounded(url:string,maxBytes:number,fetcher:PublicationFetch) {
 const response=await fetcher(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
 if(response.status!==200||response.redirected||!response.body||
  !/^(application\/(json|vnd.github\+json)|text\/plain)(;|$)/i.test(response.headers.get('content-type')??''))throw new Error('Invalid publication HTTP response');
 const length=response.headers.get('content-length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){await response.body.cancel();throw new Error('Publication source too large');}
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try {for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new Error('Publication source too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function fetchPublicationRevision(revision:string,fetcher:PublicationFetch=fetch,options:ValidationOptions={}) {
 if(!REVISION.test(revision))throw new Error('Invalid publication revision');
 const base=`https://raw.githubusercontent.com/protocol/neuro-atlas/${revision}/`;
 const [snapshot,manifest]=await Promise.all([
  readBounded(base+PUBLICATION_SNAPSHOT_PATH,PUBLICATION_MAX_BYTES,fetcher),
  readBounded(base+PUBLICATION_MANIFEST_PATH,PUBLICATION_MANIFEST_MAX_BYTES,fetcher)]);
 const value=await validatePublicationFiles({[PUBLICATION_SNAPSHOT_PATH]:snapshot,[PUBLICATION_MANIFEST_PATH]:manifest,'vercel.json':DATA_BRANCH_VERCEL},options);
 return {revision,...value};
}
export async function fetchLatestPublication(fetcher:PublicationFetch=fetch,options:ValidationOptions={}) {
 const data=JSON.parse(await readBounded(`https://api.github.com/repos/protocol/neuro-atlas/git/ref/heads/${PUBLICATION_BRANCH}`,4096,fetcher));
 const revision=z.object({object:z.object({sha:z.string().regex(REVISION)})}).parse(data).object.sha;
 return fetchPublicationRevision(revision,fetcher,options);
}
export function retainingPublicationReader<T extends {snapshot:{source:{capturedAt:string}}}>(load:()=>Promise<T>,fallback:T) {
 let lastGood=fallback;
 return async()=>{try{const next=await load();if(Date.parse(next.snapshot.source.capturedAt)>=Date.parse(lastGood.snapshot.source.capturedAt))lastGood=next;}catch{/* Retain actual last-good, not an error-shaped replacement. */}return lastGood;};
}


export type PublicationGitRunner=(args:string[],options:{cwd:string;input?:string;env?:Partial<NodeJS.ProcessEnv>})=>string;
const runGit:PublicationGitRunner=(args,options)=>{
 const result=spawnSync('git',args,{...options,encoding:'utf8',timeout:60000,maxBuffer:3_000_000,
  env:{...process.env,...options.env,GIT_TERMINAL_PROMPT:'0'}});
 if(result.status!==0||result.error)throw new Error('Publication Git operation failed; inspect exact ref, never retry blindly');
 return result.stdout;
};
type PublishOptions=ValidationOptions&{approvedRuntime:string;allowAbsentBootstrap?:boolean;allowReviewedMethodChange?:boolean};
/** Pinned reviewed main runtime, exact data tree and compare-and-swap ref; never main. */
export async function publishPublicationFeed(files:Record<string,string>,expected:string,options:PublishOptions,run:PublicationGitRunner=runGit,now=new Date()) {
 if((expected!=='absent'&&!REVISION.test(expected))||!REVISION.test(options.approvedRuntime)||
   (expected==='absent'&&!options.allowAbsentBootstrap))throw new Error('Explicit expected ref, reviewed runtime and bootstrap opt-in required');
 const next=await validatePublicationFiles(files,options);
 if(canonical(next.manifest.runtimeHashes)!==canonical(publicationRuntimeHashes()))throw new Error('Staged runtime differs from current runtime');
 if(!next.snapshot.source.testOnly&&next.snapshot.source.methodSha256!==next.manifest.runtimeHashes['scripts/publications/derive.py'])throw new Error('Derivation method is not the staged reviewed method');
 const current=now.getTime(),fresh=(time:string)=>{const age=current-Date.parse(time);return age>=-300000&&age<=14*86400000;};
 if(!fresh(next.manifest.capturedAt)||Object.values(next.manifest.sourceProof.scienceEvidence).some(e=>!fresh(e.retrievedAt))||
   Object.values(next.snapshot.matchedGrowth?.evidence??{}).some(e=>e.retrievedAt&&!fresh(e.retrievedAt)))throw new Error('Fresh complete source required; no relabeling old acquisition');
 const ref='refs/heads/'+PUBLICATION_BRANCH,repository=PUBLICATION_REPOSITORY;
 const auth=['-c','credential.helper=','-c','credential.helper=!gh auth git-credential'];
 const remoteHead=(target:string)=>{
  const out=run([...auth,'ls-remote','--refs',repository,target],{cwd:ROOT}).trim();
  if(!out)return 'absent';const parts=out.split(/\s+/);if(parts.length!==2||!REVISION.test(parts[0])||parts[1]!==target)throw new Error('Unexpected remote ref result');return parts[0];
 };
 if(remoteHead('refs/heads/main')!==options.approvedRuntime)throw new Error('Runtime must match explicitly approved current main revision');
 if(remoteHead(ref)!==expected)throw new Error('Data ref changed from expected; inspect without automatic retry');
 mkdirSync(resolve(ROOT,'.qa'),{recursive:true});const dir=mkdtempSync(resolve(ROOT,'.qa/publications-publish-'));
 const git=(args:string[],input?:string,env?:Partial<NodeJS.ProcessEnv>)=>run(['--git-dir',dir,...args],{cwd:ROOT,input,env});
 try {
  run(['init','--bare',dir],{cwd:ROOT});
  git([...auth,'fetch','--no-tags','--depth=1',repository,'refs/heads/main']);
  if(git(['rev-parse','FETCH_HEAD']).trim()!==options.approvedRuntime)throw new Error('Reviewed main changed during fetch');
  for(const path of PUBLICATION_RUNTIME_PATHS)if(publicationHash(git(['show',options.approvedRuntime+':'+path]))!==next.manifest.runtimeHashes[path])throw new Error('Unreviewed runtime/method bytes cannot publish');
  if(expected!=='absent') {
   git([...auth,'fetch','--no-tags','--depth=1',repository,ref]);
   if(git(['rev-parse','FETCH_HEAD']).trim()!==expected)throw new Error('Data ref changed during fetch');
   assertPublicationTree(git(['ls-tree','-r','-t',expected]));
   const oldFiles=Object.fromEntries(Object.keys(files).map(p=>[p,git(['show',expected+':'+p])]));
   const previous=await validatePublicationFiles(oldFiles,options);
   if(Date.parse(previous.manifest.capturedAt)>Date.parse(next.manifest.capturedAt))throw new Error('Older acquisition cannot replace last-good');
   const methodChanged=canonical(previous.manifest.runtimeHashes)!==canonical(next.manifest.runtimeHashes);
   if(methodChanged&&!options.allowReviewedMethodChange)throw new Error('Runtime/method changes require separate reviewed installation, not weekly data-only refresh');
   if(!methodChanged&&previous.manifest.fingerprint===next.manifest.fingerprint){
    if(remoteHead(ref)!==expected||remoteHead('refs/heads/main')!==options.approvedRuntime)throw new Error('Ref changed during no-op check');
    return {revision:expected,ref,verified:true,unchanged:true,notification:null};
   }
  }
  const blob=(content:string)=>git(['hash-object','-w','--stdin'],content).trim();
  const leaf=git(['mktree'],`100644 blob ${blob(files[PUBLICATION_MANIFEST_PATH])}\tmanifest.json\n100644 blob ${blob(files[PUBLICATION_SNAPSHOT_PATH])}\tsnapshot.json\n`).trim();
  const feed=git(['mktree'],`040000 tree ${leaf}\topenalex-publications\n`).trim();
  const tree=git(['mktree'],`040000 tree ${feed}\tfeed\n100644 blob ${blob(DATA_BRANCH_VERCEL)}\tvercel.json\n`).trim();
  const name='Neuro Atlas data refresh',email='neuro-atlas-data@users.noreply.github.com';
  const message='OpenAlex publications '+next.manifest.capturedAt.slice(0,10);
  const revision=git(['-c','user.name='+name,'-c','user.email='+email,'commit-tree',tree,...(expected==='absent'?[]:['-p',expected]),'-m',message],undefined,
   {GIT_AUTHOR_NAME:name,GIT_AUTHOR_EMAIL:email,GIT_COMMITTER_NAME:name,GIT_COMMITTER_EMAIL:email}).trim();
  const verify=()=>{
   if(!REVISION.test(revision))throw new Error('Invalid publication commit');
   assertPublicationTree(git(['ls-tree','-r','-t',revision]));
   const metadata=git(['show','--no-patch','--format=format:%an%x00%ae%x00%cn%x00%ce%x00%B',revision]);
   if(metadata!==[name,email,name,email,message+'\n'].join('\0'))throw new Error('Unapproved public commit metadata');
   const parents=git(['cat-file','-p',revision]).split('\n\n')[0].split('\n').filter(s=>s.startsWith('parent ')).map(s=>s.slice(7));
   if(parents.join(' ')!==(expected==='absent'?'':expected))throw new Error('Data commit parent mismatch');
   for(const [p,bytes] of Object.entries(files))if(git(['show',revision+':'+p])!==bytes)throw new Error('Publication byte readback differs');
  };
  verify();
  if(remoteHead('refs/heads/main')!==options.approvedRuntime)throw new Error('Reviewed main changed before push');
  git([...auth,'push','--force-with-lease='+ref+':'+(expected==='absent'?'':expected),repository,revision+':'+ref]);
  if(remoteHead(ref)!==revision)throw new Error('Published ref readback failed; inspect, never automatically retry');
  git([...auth,'fetch','--no-tags','--depth=1',repository,ref]);
  if(git(['rev-parse','FETCH_HEAD']).trim()!==revision)throw new Error('Published fetch readback changed');
  verify();
  return {revision,ref,verified:true,unchanged:false,notification:{channel:'C0CFPQGLVKJ',screenshotThreadRequired:true,
   surfaces:['publication-output','publication-growth','researcher-sectors','researcher-sector-changes']}};
 }finally{rmSync(dir,{recursive:true,force:true});}
}


function readRegular(path:string,maxBytes:number) {
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)throw new Error('Unapproved or oversized staged file');
 return readFileSync(path,'utf8');
}
export function readPublicationStage(directory:string) {
 const root=resolve(directory),seen:string[]=[];
 if(lstatSync(root).isSymbolicLink()||!lstatSync(root).isDirectory())throw new Error('Unapproved stage directory');
 const expectedDirs=new Set(['feed','feed/openalex-publications']);
 const expectedFiles=new Set([PUBLICATION_SNAPSHOT_PATH,PUBLICATION_MANIFEST_PATH,'vercel.json']);
 const visit=(dir:string)=>{for(const name of readdirSync(dir)){
  const path=resolve(dir,name),rel=relative(root,path),stat=lstatSync(path);
  if(stat.isDirectory()&&!stat.isSymbolicLink()&&expectedDirs.has(rel))visit(path);
  else if(stat.isFile()&&!stat.isSymbolicLink()&&expectedFiles.has(rel))seen.push(rel);
  else throw new Error('Only exact approved stage paths/modes may publish');
 }};
 visit(root);
 if(seen.length!==3)throw new Error('Missing approved staged files');
 return Object.fromEntries(seen.map(p=>[p,readRegular(resolve(root,p),p===PUBLICATION_SNAPSHOT_PATH?PUBLICATION_MAX_BYTES:PUBLICATION_MANIFEST_MAX_BYTES)]));
}
async function main() {
 const {values:v}=parseArgs({options:{'stage-json':{type:'string'},'proof-json':{type:'string'},out:{type:'string'},
  publish:{type:'boolean'},staged:{type:'string'},expected:{type:'string'},'approved-runtime':{type:'string'},
  'allow-absent-bootstrap':{type:'boolean'},'allow-reviewed-method-change':{type:'boolean'}}});
 if(v.publish){
  if(!v.staged||!v.expected||!v['approved-runtime']||v['stage-json']||v['proof-json']||v.out)throw new Error('Publish is a separate explicit staged action');
  const result=await publishPublicationFeed(readPublicationStage(v.staged),v.expected,{approvedRuntime:v['approved-runtime'],
   allowAbsentBootstrap:v['allow-absent-bootstrap'],allowReviewedMethodChange:v['allow-reviewed-method-change']});
  console.log(JSON.stringify(result));
 }else{
  if(!v['stage-json']||!v['proof-json']||!v.out||v.staged||v.expected||v['approved-runtime']||v['allow-absent-bootstrap']||v['allow-reviewed-method-change'])throw new Error('Offline staging needs snapshot, proof and fresh .qa output');
  const files=await stagePublicationFiles(JSON.parse(readRegular(v['stage-json'],PUBLICATION_MAX_BYTES)),
   JSON.parse(readRegular(v['proof-json'],PUBLICATION_MANIFEST_MAX_BYTES)),v.out);
  const manifest=JSON.parse(files[PUBLICATION_MANIFEST_PATH]);
  console.log(JSON.stringify({stage:resolve(v.out),fingerprint:manifest.fingerprint,capturedAt:manifest.capturedAt,published:false}));
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{
 console.error('Publication feed operation refused or failed. Inspect source completeness, production parser, runtime review, explicit stage/expected ref; no automatic retry.');process.exitCode=1;
});
