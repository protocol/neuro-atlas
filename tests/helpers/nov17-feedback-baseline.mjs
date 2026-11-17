import assert from 'node:assert/strict';

// Later, separately tested owner-requested additions must not rewrite prior
// source-audit goldens. Assert the bounded current values, then reconstruct only
// those later fields in a clone. Unlisted rows/fields still reach the old digest.
export function beforeNov17Feedback(rows, kind) {
  const source='https://science.xyz/news/series-d/';
  const sourceKey=kind.startsWith('canonical')?'source_url':'sourceUrl';
  const additions=['milestones','fundingRounds','canonicalMilestones','canonicalRounds'];
  let restored=structuredClone(rows);
  if(additions.includes(kind)) {
    const added=restored.filter(row=>row[sourceKey]===source);
    assert.equal(added.length,1,kind+': exactly one later Science Series D');
    const row=added[0];
    if(kind==='milestones') assert.deepEqual([row.company,row.date,row.amountUsdM,row.stage,row.dateBasis],['Science Corp','2026-11-17',400,'capital','announcement']);
    if(kind==='fundingRounds') assert.deepEqual([row.companySlug,row.announcedOn,row.amountUsdM,row.stage,row.dateBasis],['science-corporation','2026-11-17',400,'Series D','announcement']);
    if(kind==='canonicalMilestones') assert.deepEqual([row.company,row.date,row.amount_usd_m,row.stage,row.date_basis],['Science Corp','2026-11-17','400','capital','announcement']);
    if(kind==='canonicalRounds') assert.deepEqual([row.company_slug,row.announced_on,row.amount_usd_m,row.stage,row.date_basis],['science-corporation','2026-11-17','400','Series D','announcement']);
    restored=restored.filter(row=>row[sourceKey]!==source);
  }
  if(['fundingCompanies','canonicalCompanies'].includes(kind)) {
    for(const [slug,current,previous] of [
      ['echo-neurotech','https://www.echo.bio/','https://echoneurotech.com'],
      ['merge-labs','https://merge.io/','https://merge.xyz'],
    ]) {
      const row=restored.find(company=>company.slug===slug);
      assert.equal(row.website,current,kind+': verified current website');
      row.website=previous;
    }
  }
  return restored;
}
