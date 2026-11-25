import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFundingIndexSources, buildFundingIndex, parseCsv } from '../scripts/lib/funding-index.mjs';
import { readFile } from 'node:fs/promises';
import { CHINA_BACKFILL_EVENTS as expected } from './helpers/china-funding-current.mjs';
test('reviewed China financings occur exactly once in canonical and generated data', async () => {
 const sources=await loadFundingIndexSources('data/funding-index');
 const built=buildFundingIndex(sources);
 const generated=JSON.parse(await readFile('src/data/funding-index.json','utf8'));
 for(const [slug,date,amount,reviewedOn] of expected) {
  const matches=sources.rounds.filter(r=>r.company_slug===slug&&r.announced_on===date);
  assert.equal(matches.length,1,`${slug} ${date} canonical count`);
  assert.equal(Number(matches[0].amount_native_m),amount);
  assert.equal(matches[0].source_kind,'primary');
  assert.equal(matches[0].reviewed_on,reviewedOn,`${slug} ${date} latest source review`);
  for(const rows of [built.rounds,generated.rounds]) {
   const found=rows.filter(r=>r.companySlug===slug&&r.announcedOn===date);
   assert.equal(found.length,1,`${slug} ${date} plotted count`);
   assert.equal(found[0].amountNativeM,amount);
   assert.ok(Number.isFinite(found[0].amountUsdM));
  }
 }
 assert.equal(sources.companies.length,31);
 assert.equal(sources.rounds.length,78); // Exact November 25 source-backed additions; no historical projection.
});
test('China backfill keeps approximate, aggregate, check-size and timing distinctions',async()=>{
 const s=await loadFundingIndexSources('data/funding-index');
 const pick=(slug,date)=>s.rounds.find(r=>r.company_slug===slug&&r.announced_on===date);
 assert.match(pick('conmind','2026-04-08')?.display_amount??'',/nearly/i);
 assert.match(pick('xinsheng-shijie','2026-06-18')?.display_amount??'',/nearly/i);
 assert.match(pick('neuracle-technology','2024-11-08')?.note??'',/two.*125m/i);
 assert.equal(pick('neuracle-technology','2024-11-08')?.date_basis,'event');
 assert.equal(s.rounds.some(r=>r.company_slug==='mindtrix'),false);
 assert.equal(s.rounds.some(r=>r.company_slug==='ruiyi-xulian'),false);
 assert.equal(s.rounds.some(r=>r.company_slug==='gestala'&&Number(r.amount_native_m)===570),false);
 const timeline=parseCsv(await readFile('data/market-memo-q1-2026/milestones.csv','utf8'));
 for(const [slug,date] of expected) assert.equal(timeline.filter(r=>r.nf_slug===slug&&r.date===date&&r.stage==='capital').length,1,`${slug} ${date} timeline`);
});
