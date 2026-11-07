// Explicitly private QA utilities; never imported by an application route.
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {git,loadSnapshot,applyValidatedPatch,verifyAppliedPatch} from '../feedback/git-sandbox.ts';
import {validatePatch,sha256} from '../feedback/validator.ts';
import {canonical} from '../feedback/engine.ts';

export function fixtureEnvironment(source = process.env) {
  return {PATH:source.PATH ?? '/usr/local/bin:/usr/bin:/bin',HOME:'/nonexistent',TMPDIR:source.TMPDIR ?? tmpdir(),LANG:'C.UTF-8',TZ:'UTC',CI:'1',NEXT_TELEMETRY_DISABLED:'1',UV_THREADPOOL_SIZE:'1',NEXT_PUBLIC_BASE_PATH:'/neuro-atlas',ATLAS_SITE_URL:'https://www.plneuro.xyz',ATLAS_PRIVATE_FEEDBACK_QA:'1'};
}
export async function prepareFixture(value) {
  if(!value || typeof value!=='object' || Object.keys(value).some(k=>!['repo','port','revision','phase','patch'].includes(k)))throw new Error('private_fixture_rejected');
  const {repo,port,revision,phase,patch}=value;
  if(process.env.VERCEL || process.env.VERCEL_ENV || (phase==='candidate')!==(patch!==undefined))throw new Error('private_fixture_rejected');
  const plan=fixturePlan({port,revision,phase});
  const directory=await mkdtemp(path.join(tmpdir(),'atlas-linear-native-')),root=path.join(directory,'checkout');
  let added=false,cleaned=false;
  const cleanup=async()=>{if(cleaned)return;try{if(added)await git(repo,['worktree','remove','--force',root]);}finally{await rm(directory,{recursive:true,force:true});cleaned=true;}};
  try {
    await git(repo,['worktree','add','--detach',root,revision]);added=true;
    if((await git(root,['rev-parse','HEAD'])).trim()!==revision)throw new Error('private_fixture_rejected');
    if(patch!==undefined){
      const sources=await loadSnapshot(root,revision);
      validatePatch(patch,sources,revision,'css-only');
      await applyValidatedPatch(root,patch,revision);await verifyAppliedPatch(root,patch);
    }
    const gate=(await git(root,['ls-files','--','src/proxy.ts','proxy.ts'])).trim().split('\n');
    if(gate.length!==1 || !['src/proxy.ts','proxy.ts'].includes(gate[0]))throw new Error('private_fixture_rejected');
    await writeFile(path.join(root,gate[0]),fixtureProxySource({port,revision,phase},patch===undefined?'none':sha256(canonical(patch))));
    return {directory,root,plan,cleanup};
  } catch(error) {await cleanup();throw error;}
}

export function fixtureProxySource(value) {
  const plan = fixturePlan(value);
  return `import {NextResponse, type NextRequest} from 'next/server';
export function proxy(request: NextRequest) {
  const allowed = process.env.ATLAS_PRIVATE_FEEDBACK_QA === '1' && !process.env.VERCEL && !process.env.VERCEL_ENV && request.headers.get('host') === ${JSON.stringify(`127.0.0.1:${plan.port}`)};
  const response = allowed ? NextResponse.next() : new NextResponse('Private QA fixture only', {status:403});
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('X-Robots-Tag','noindex, nofollow');
  response.headers.set('X-Atlas-QA-Revision',${JSON.stringify(plan.marker)});
  return response;
}
export const config = {matcher:['/','/:path*']};
`;
}
export function fixturePlan(value) {
  if (!value || typeof value !== 'object' || Object.keys(value).sort().join(',') !== 'phase,port,revision' || !Number.isSafeInteger(value.port) || value.port < 1024 || value.port > 65535 || !/^[a-f0-9]{40}$/.test(value.revision) || !['baseline','candidate'].includes(value.phase)) throw new Error('private_fixture_rejected');
  return {origin:`http://127.0.0.1:${value.port}`,marker:`linear-feedback-${value.phase}-${value.revision}`, ...value};
}
