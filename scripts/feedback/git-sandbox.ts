import { execFile } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { SOURCE_PATHS, validatePatch, reject, sha256, type Patch } from './validator';

export const minimalEnvironment = ():NodeJS.ProcessEnv => ({NODE_ENV:'test',PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C.UTF-8',TZ:'UTC',CI:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'});
export function git(cwd:string,args:string[],input?:string):Promise<string> {
  return new Promise((resolve,rejectPromise)=>{
    const child=execFile('/usr/bin/git',['--no-optional-locks','-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','diff.external=',...args],{cwd,env:minimalEnvironment(),timeout:15000,maxBuffer:1048576,encoding:'utf8'},(err,stdout)=>err?rejectPromise(new Error('needs_human_review')):resolve(stdout));
    child.stdin?.end(input);
  });
}
async function regularPath(cwd:string,file:string) {
  let current=cwd;
  for (const part of file.split('/')) {
    current=path.join(current,part);
    const stat=await lstat(current);
    if (stat.isSymbolicLink() || (current!==path.join(cwd,file) && !stat.isDirectory())) reject();
  }
  const stat=await lstat(current);
  if (!stat.isFile() || stat.size>131072 || (stat.mode&0o111)) reject();
}
export async function loadSnapshot(cwd:string,baseSha:string):Promise<Record<string,string>> {
  try {
    if (!/^[0-9a-f]{40}$/.test(baseSha) || (await git(cwd,['rev-parse','HEAD'])).trim()!==baseSha || (await git(cwd,['status','--porcelain=v1','--untracked-files=all'])).trim()) reject();
    const sources:Record<string,string>={};
    for (const file of SOURCE_PATHS) {
      const tree=(await git(cwd,['ls-tree',baseSha,'--',file])).trim();
      if (!tree) continue;
      if (!tree.startsWith('100644 blob ') || tree.split('\t')[1]!==file) reject();
      await regularPath(cwd,file);
      const content=await readFile(path.join(cwd,file),'utf8');
      if (content!==await git(cwd,['show',`${baseSha}:${file}`])) reject();
      // Deliberately fail closed on credential-shaped source, rather than masking and invalidating hashes.
      if (/-----BEGIN|(?:sk-ant-|github_pat_|gh[pousr]_)[A-Za-z0-9_-]{12,}|(?:password|api[_-]?key|secret|authorization)\s*[:=]\s*["'`][^"'`]{6,}/i.test(content)) reject();
      sources[file]=content;
    }
    if (!Object.keys(sources).length) reject();
    return sources;
  } catch { return reject(); }
}
function wholeFileHunk(before:string,after:string,file:string):string {
  function lines(text:string,prefix:string) {
    const array=text.split('\n');
    const trailing=array.at(-1)==='';
    if (trailing) array.pop();
    return {count:array.length,text:array.map((line,i)=>`${prefix}${line}\n${!trailing&&i===array.length-1?'\\ No newline at end of file\n':''}`).join('')};
  }
  const a=lines(before,'-'),b=lines(after,'+');
  return `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1,${a.count} +1,${b.count} @@\n${a.text}${b.text}`;
}
export async function applyValidatedPatch(cwd:string,input:unknown,baseSha:string):Promise<Patch> {
  const sources=await loadSnapshot(cwd,baseSha);
  const patch=validatePatch(input,sources,baseSha);
  const diff=patch.files.map(f=>wholeFileHunk(sources[f.path],f.content,f.path)).join('');
  await git(cwd,['apply','--check','--whitespace=nowarn','-'],diff);
  await git(cwd,['apply','--whitespace=nowarn','-'],diff);
  for (const file of patch.files) {
    await regularPath(cwd,file.path);
    if (sha256(await readFile(path.join(cwd,file.path)))!==sha256(file.content)) reject();
  }
  validatePatch(patch,sources,baseSha);
  const actual=(await git(cwd,['diff','--name-only','--no-ext-diff','--no-textconv'])).trim().split('\n').sort();
  if (actual.join('|')!==patch.files.map(f=>f.path).sort().join('|')) reject();
  return patch;
}

export async function verifyAppliedPatch(cwd:string,patch:Patch):Promise<void> {
  try {
    for(const file of patch.files){await regularPath(cwd,file.path);if(sha256(await readFile(path.join(cwd,file.path)))!==sha256(file.content))reject();}
    if((await git(cwd,['rev-parse','HEAD'])).trim()!==patch.baseSha || (await git(cwd,['diff','--cached','--name-only'])).trim() || (await git(cwd,['ls-files','--others','--exclude-standard'])).trim())reject();
    const paths=(await git(cwd,['diff','HEAD','--name-only','--no-ext-diff','--no-textconv'])).trim().split('\n').sort();
    if(paths.join('|')!==patch.files.map(f=>f.path).sort().join('|'))reject();
  }catch{reject();}
}
