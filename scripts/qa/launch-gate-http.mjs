import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const atlas = process.env.QA_ATLAS_ORIGIN ?? 'http://localhost:3185';
const host = process.env.QA_HOST_ORIGIN ?? 'http://localhost:3187';
for (const value of [atlas, host]) {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:');
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname), 'Synthetic-password QA is loopback-only');
}
const PASSWORD = 'SYNTHETIC-LAUNCH-QA-ONLY';
const results=[];
async function check(label, run){await run();results.push({label,status:'PASS'});}
const request=(base,path,init={})=>fetch(base+path,{redirect:'manual',...init});
const page='/neuro-atlas/field-velocity?view=charts#neural-recording';
let session,html,asset;
await check('anonymous native entry is standalone HTML401 without Basic dialog or Atlas bundles',async()=>{
  for(const base of [atlas,host]){
    const r=await request(base,'/neuro-atlas',{headers:{Accept:'text/html'}});assert.equal(r.status,401);assert.equal(r.headers.get('www-authenticate'),null);assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('x-robots-tag'),/noindex/);const body=await r.text();assert.match(body,/Neuro Atlas/);assert.doesNotMatch(body,/_next\/static|SYNTHETIC-LAUNCH-QA-ONLY|Show password|Move over the title|Have the password\?|No password needed/);
  }
});
await check('native mounted POST rejects wrong passwords and cross-origin/missing Origin',async()=>{
  for(const base of [atlas,host]){
    for(const origin of [undefined,'https://untrusted.example',base]){
      const headers={'Content-Type':'application/x-www-form-urlencoded'};if(origin)headers.Origin=origin;
      const r=await request(base,'/neuro-atlas/__launch/auth',{method:'POST',headers,body:new URLSearchParams({password:'INVALID-SYNTHETIC-ONLY',returnTo:page})});assert.equal(r.status,origin===base?401:403);assert.equal(r.headers.get('set-cookie'),null);if(origin===base){assert.equal(r.headers.get('www-authenticate'),null);assert.match(await r.text(),/didn’t match/);}
    }
  }
});
await check('positive native login through actual host rewrite issues a scoped signed cookie and preserves deep link',async()=>{
  const r=await request(host,'/neuro-atlas/__launch/auth',{method:'POST',headers:{Origin:host,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:PASSWORD,returnTo:page})});assert.equal(r.status,303);assert.equal(r.headers.get('location'),host+page);const cookie=r.headers.get('set-cookie');assert.match(cookie,/^__Secure-atlas-preview=\d{13}\.[a-f0-9]{64};/);for(const flag of ['Path=/neuro-atlas','HttpOnly','Secure','SameSite=Lax'])assert.ok(cookie.includes(flag));session=cookie.split(';',1)[0];
});
await check('valid cookie opens actual Atlas content through host and origin; forged/duplicate cookies fail',async()=>{
  for(const base of [atlas,host]){
    for(const cookie of ['__Secure-atlas-preview=true',session+'; '+session,session.slice(0,-4)+'ffff']){
      const r=await request(base,'/neuro-atlas/field-velocity',{headers:{Accept:'text/html',Cookie:cookie}});assert.equal(r.status,401);
    }
    const r=await request(base,'/neuro-atlas/field-velocity',{headers:{Accept:'text/html',Cookie:session+'; unrelated-owner-session=NOT-FOR-ATLAS'}});assert.equal(r.status,200);html=await r.text();assert.match(html,/Field velocity|Metrics/);assert.doesNotMatch(html,/data-title-stage/);assert.match(r.headers.get('cache-control'),/no-store/);
  }
  asset=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).find(s=>s.startsWith('/neuro-atlas/_next/static/'));assert.ok(asset);
});
await check('real published JS asset is inaccessible anonymously, accessible only with session, same bytes through host',async()=>{
  let bytes;
  for(const base of [atlas,host]){
    const denied=await request(base,asset);assert.equal(denied.status,401);assert.equal(await denied.text(),'Authentication required.');
    const r=await request(base,asset,{headers:{Cookie:session}});assert.equal(r.status,200);const data=Buffer.from(await r.arrayBuffer());assert.ok(data.length>0);if(bytes)assert.deepEqual(data,bytes);else bytes=data;
  }
});
await check('legacy Basic works and middleware bypass hints do not open without credentials',async()=>{
  for(const base of [atlas,host]){
    const yes=await request(base,'/neuro-atlas/field-velocity',{headers:{Authorization:'Basic '+Buffer.from('qa:'+PASSWORD).toString('base64')}});assert.equal(yes.status,200);
    const no=await request(base,'/neuro-atlas/field-velocity',{headers:{Accept:'text/html','x-middleware-subrequest':'src/proxy:src/proxy:src/proxy:src/proxy:src/proxy','x-launch-now':'9999999999999'}});assert.equal(no.status,401);
  }
});
const output={fixtureOnly:true,atlas,host,checks:results.length,results};
await writeFile('/opt/data/tmp/atlas-launch-http-report.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
