import test from 'node:test';
import assert from 'node:assert/strict';

test('native capture fixture accepts only a pinned loopback plan and never hosted overrides', async () => {
  const {fixturePlan} = await import('../scripts/qa/feedback-linear-fixture.mjs');
  const source = {port: 40589, revision: 'a'.repeat(40), phase: 'baseline'};
  assert.equal(fixturePlan(source).origin, 'http://127.0.0.1:40589');
  assert.equal(fixturePlan(source).marker, `linear-feedback-baseline-${'a'.repeat(40)}`);
  for (const bad of [{...source, port:80}, {...source, port:65536}, {...source, revision:'main'}, {...source, phase:'public'}, {...source, origin:'https://example.com'}, {...source, hostname:'0.0.0.0'}]) {
    assert.throws(() => fixturePlan(bad), /private_fixture_rejected/);
  }
});

import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
test('generated QA proxy runs the installed Next response and fails closed on hosted mode or wrong raw Host', async () => {
  const {fixtureProxySource} = await import('../scripts/qa/feedback-linear-fixture.mjs');
  const ts = require('typescript'), compiledModule = {exports:{}};
  const raw = fixtureProxySource({port:40589,revision:'a'.repeat(40),phase:'candidate'});
  const compiled = ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const env = {ATLAS_PRIVATE_FEEDBACK_QA:'1'};
  new Function('exports','require','process',compiled)(compiledModule.exports, require,{env});
  const request = host => new Request('http://127.0.0.1:40589/neuro-atlas/field-velocity',{headers:{host}});
  const accepted = compiledModule.exports.proxy(request('127.0.0.1:40589'));
  assert.equal(accepted.headers.get('x-atlas-qa-revision'),`linear-feedback-candidate-${'a'.repeat(40)}`);
  assert.match(accepted.headers.get('x-robots-tag'),/noindex/);
  assert.equal(compiledModule.exports.proxy(request('example.com')).status,403);
  env.VERCEL='1'; assert.equal(compiledModule.exports.proxy(request('127.0.0.1:40589')).status,403);
  delete env.VERCEL; delete env.ATLAS_PRIVATE_FEEDBACK_QA;
  assert.equal(compiledModule.exports.proxy(request('127.0.0.1:40589')).status,403);
});

import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
test('fixture preparation modifies only a disposable pinned checkout and copies no account environment', async t => {
  const {prepareFixture,fixtureEnvironment} = await import('../scripts/qa/feedback-linear-fixture.mjs');
  const dir = await mkdtemp(path.join(tmpdir(),'atlas-capture-unit-'));
  let fixture;
  t.after(async()=>{if(fixture)await fixture.cleanup();await rm(dir,{recursive:true,force:true});});
  const run = args => execFileSync('/usr/bin/git',args,{cwd:dir,encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
  run(['init','-q','--initial-branch=main']);
  await mkdir(path.join(dir,'src'),{recursive:true});
  await writeFile(path.join(dir,'src/proxy.ts'),'// original access gate\n');
  run(['add','src/proxy.ts']);
  run(['-c','user.name=Synthetic QA','-c','user.email=qa@example.invalid','commit','-qm','synthetic gate']);
  const revision=run(['rev-parse','HEAD']);
  fixture = await prepareFixture({repo:dir,port:40589,revision,phase:'baseline'});
  assert.equal(await readFile(path.join(dir,'src/proxy.ts'),'utf8'),'// original access gate\n');
  assert.equal(run(['status','--porcelain']),'');
  assert.match(await readFile(path.join(fixture.root,'src/proxy.ts'),'utf8'),/Private QA fixture only/);
  assert.equal(fixture.plan.revision,revision);
  const env=fixtureEnvironment({PATH:'/usr/bin:/bin',HOME:'/secret/home',TMPDIR:tmpdir(),GH_TOKEN:'synthetic-secret',FEEDBACK_ENABLED:'true'});
  assert.equal(env.HOME,'/nonexistent');assert.equal(env.ATLAS_PRIVATE_FEEDBACK_QA,'1');
  assert.equal(env.GH_TOKEN,undefined);assert.equal(env.FEEDBACK_ENABLED,undefined);
});

import {createHash} from 'node:crypto';
test('candidate capture applies the real CSS-only validator before installing the private QA guard', async t => {
  const {prepareFixture} = await import('../scripts/qa/feedback-linear-fixture.mjs');
  const dir=await mkdtemp(path.join(tmpdir(),'atlas-capture-patch-unit-'));let fixture;
  t.after(async()=>{if(fixture)await fixture.cleanup();await rm(dir,{recursive:true,force:true});});
  const run=args=>execFileSync('/usr/bin/git',args,{cwd:dir,encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
  run(['init','-q','--initial-branch=main']);
  await mkdir(path.join(dir,'src/components'),{recursive:true});
  const css='.draft-popout-card { padding: 16px; }\n', file='src/components/draft-chart-panel.css';
  await writeFile(path.join(dir,'src/proxy.ts'),'// original gate\n');await writeFile(path.join(dir,file),css);
  run(['add','src']);run(['-c','user.name=Synthetic QA','-c','user.email=qa@example.invalid','commit','-qm','synthetic source']);
  const revision=run(['rev-parse','HEAD']),patch={baseSha:revision,files:[{path:file,beforeSha256:createHash('sha256').update(css).digest('hex'),content:css.replace('16px','18px')}]};
  fixture=await prepareFixture({repo:dir,port:40589,revision,phase:'candidate',patch});
  assert.equal(await readFile(path.join(fixture.root,file),'utf8'),patch.files[0].content);
  assert.equal(await readFile(path.join(dir,file),'utf8'),css);
  await assert.rejects(prepareFixture({repo:dir,port:40590,revision,phase:'candidate'}),/private_fixture_rejected/);
  await assert.rejects(prepareFixture({repo:dir,port:40590,revision,phase:'baseline',patch}),/private_fixture_rejected/);
  await assert.rejects(prepareFixture({repo:dir,port:40590,revision,phase:'candidate',patch:{...patch,files:[{...patch.files[0],content:css.replace('16px','url(https://example.com)')}]}}));
});
