// Disposable actual Next app with a synthetic, loopback-only gate. Never a hosted bypass.
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [repo, revision, name, portText] = process.argv.slice(2);
const port = Number(portText);
if (!repo || !/^[0-9a-f]{40}$/.test(revision ?? '') || !['baseline', 'candidate'].includes(name)
  || ![45831, 45832].includes(port)) throw Error('fixture_args');
const root = resolve('/opt/data/tmp/atlas-plr118', name + '-fixture');
await mkdir(root, { recursive: false });
execFileSync('sh', ['-c', 'git archive "$1" | tar -x -C "$2"', 'fixture', revision, root], { cwd: repo });
// Private physical directory; hardlinks are read-only dependencies. Never install into this fixture.
execFileSync('cp', ['-al', resolve(repo, 'node_modules'), root + '/node_modules']);
await writeFile(root + '/src/proxy.ts', `import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
export function proxy(req:NextRequest){
 if(process.env.ATLAS_LOCAL_QA!=='milestones-panel-20261116'||req.headers.get('host')!=='127.0.0.1:${port}')return new NextResponse('Fixture refused',{status:403});
 const r=NextResponse.next();r.headers.set('x-atlas-qa-source','${revision}');return r;
}
export const config={matcher:['/','/:path*']};\n`);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, stdio: 'inherit', env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_BASE_PATH: '/neuro-atlas', ATLAS_SITE_URL: 'https://www.plneuro.xyz',
    ATLAS_LOCAL_QA: 'milestones-panel-20261116', WATCHPACK_POLLING: 'true', UV_THREADPOOL_SIZE: '1' },
});
console.log(JSON.stringify({ pid: child.pid, root, revision, port, actualNext: true, syntheticLoopbackGate: true }));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
child.on('close', code => { process.exitCode = code ?? 1; });
