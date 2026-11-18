import assert from 'node:assert/strict';

const previousSource = 'https://openai.com/index/investing-in-merge-labs/';
const reviewedSource = 'https://www.wired.com/story/openai-invests-in-sam-altmans-new-brain-tech-startup-merge-labs/';
const reviewedNote = "WIRED reports $252 million from OpenAI, Bain Capital, Gabe Newell and others. PL Capital's public participation disclosure describes a $250M+ seed round; TechCrunch reports $250 million. The indexed $252m remains a reporting figure, not an issuer-confirmed amount. PL Capital's check size and investment vehicle are not disclosed. Original date precision and unverified date basis are retained.";
const reviewedInvestors = ['OpenAI', 'Bain Capital', 'Gabe Newell', 'PL Capital'];
const evidence = {
  investorName: 'PL Capital',
  sourceUrl: 'https://www.linkedin.com/posts/protocolvc_congrats-to-merge-labs-on-its-250m-seed-activity-7418000018110009344-7fBL',
  sourceKind: 'primary',
  reviewedOn: '2026-11-17',
  sourceExcerpt: 'Congrats to Merge Labs on its $250M+ seed round, which we were proud to join alongside OpenAI, Bain Capital, and Gabe Newell.',
};

// Keep all historical goldens frozen. Assert the entire exact corrected Merge
// row, then undo only its enumerated later fields in a clone. Other rows and
// every unlisted field still reach the original digests without alteration.
export function beforeMergeAttribution(rows, collection) {
  const restored = structuredClone(rows);
  if (!['canonicalRounds', 'fundingRounds'].includes(collection)) return restored;
  const canonical = collection === 'canonicalRounds';
  const slugKey = canonical ? 'company_slug' : 'companySlug';
  const dateKey = canonical ? 'announced_on' : 'announcedOn';
  const matches = restored.filter(row => row[slugKey] === 'merge-labs' && row[dateKey] === '2026-01-15' && row.stage === 'Seed');
  assert.equal(matches.length, 1, collection + ': exactly one corrected Merge seed');
  const [row] = matches;
  const previous = canonical ? {
    company_slug: 'merge-labs', announced_on: '2026-01-15', date_precision: 'day', stage: 'Seed',
    amount_usd_m: '252', amount_native_m: '', currency: 'USD', display_amount: '$252m',
    investors: 'OpenAI', source_url: previousSource, note: '', source_kind: '', reviewed_on: '', date_basis: 'unverified',
  } : {
    companySlug: 'merge-labs', announcedOn: '2026-01-15', datePrecision: 'day', dateBasis: 'unverified', stage: 'Seed',
    amountUsdM: 252, amountNativeM: null, currency: 'USD', displayAmount: '$252m',
    investors: ['OpenAI'], sourceUrl: previousSource, note: '',
  };
  const changes = canonical ? {
    investors: reviewedInvestors.join(';'), source_url: reviewedSource, note: reviewedNote,
    source_kind: 'reporting', reviewed_on: '2026-11-17',
  } : {
    investors: reviewedInvestors, sourceUrl: reviewedSource, note: reviewedNote,
    sourceKind: 'reporting', reviewedOn: '2026-11-17', investorEvidence: [evidence],
  };
  assert.deepEqual(row, { ...previous, ...changes }, collection + ': only the exact reviewed Merge field delta is permitted');
  for (const field of Object.keys(changes)) {
    if (Object.hasOwn(previous, field)) row[field] = structuredClone(previous[field]);
    else delete row[field];
  }
  return restored;
}
