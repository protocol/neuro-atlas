import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('preview password comes only from a server-side deployment secret, never a source literal', () => {
  const source=readFileSync(new URL('../src/proxy.ts',import.meta.url),'utf8');
  assert.ok(/const PASSWORD = process\.env\.ATLAS_PREVIEW_PASSWORD;/.test(source), "uses server environment configuration");
  assert.ok(!/const PASSWORD\s*=\s*["']/.test(source), "no credential literal");
});

test('configured synthetic server secret works and missing configuration fails closed', () => {
  for(const configured of [false,true]) {
    const env={...process.env, ATLAS_PREVIEW_PASSWORD:configured?'SYNTHETIC-CONFIG-ONLY':'',NEXT_PUBLIC_BASE_PATH:'/neuro-atlas',ATLAS_SITE_URL:'https://www.plneuro.xyz'};
    const result=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`
      import { proxy } from './src/proxy.ts';
      import { NextRequest } from 'next/server.js';
      Date.now=()=>Date.parse('2026-11-18T14:00:00Z');
      const headers={authorization:'Basic '+Buffer.from('qa:SYNTHETIC-CONFIG-ONLY').toString('base64'),accept:'text/html'};
      const response=await proxy(new NextRequest('https://example.test/neuro-atlas',{headers,nextConfig:{basePath:'/neuro-atlas'}}));
      console.log(JSON.stringify({status:response.status,next:response.headers.get('x-middleware-next')}));
    `],{encoding:'utf8',env}));
    assert.equal(result.status,configured?200:401);
    assert.equal(result.next,configured?'1':null);
  }
});
