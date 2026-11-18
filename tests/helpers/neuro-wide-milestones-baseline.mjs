import assert from 'node:assert/strict';

const additions = [
  {
    company: 'EON Systems', nf_slug: '', activity: '$3.5m', stage: 'capital', amount_usd_m: '3.5',
    date: '2025-12-30', date_precision: 'day',
    note: 'Untapped Ventures announced participation in EON Systems\' $3.5m seed round led by Protocol Labs for brain emulation and connectomics. December 30 is the investor announcement date, not a separately verified closing date.',
    source_url: 'https://untappedventures.substack.com/p/untapped-ventures-invests-in-eon', scope: 'broader', date_basis: 'announcement',
  },
  {
    company: 'Hemispheric', nf_slug: '', activity: '$52m aggregate', stage: 'capital', amount_usd_m: '',
    date: '2026-07-15', date_precision: 'day',
    note: 'Disclosed $52m aggregate funding across three early-stage rounds (pre-seed, seed and Series A), not one $52m round. Protocol Labs is named among investors; per-round amounts, exact dates and Protocol Labs\' specific round participation are not disclosed. July 15 is the financing-disclosure announcement date. NeuroAI based on noninvasive EEG; excluded from annual USD capital totals and the cumulative capital line.',
    source_url: 'https://www.calcalistech.com/ctechnews/article/rjentgbege', scope: 'broader', date_basis: 'announcement',
  },
  {
    company: 'Paradromics', nf_slug: 'paradromics', activity: 'strategic investment', stage: 'capital', amount_usd_m: '',
    date: '2025-02-12', date_precision: 'day',
    note: 'Announced a strategic investment from NEOM and a partnership led by NEOM Investment Fund (NIF) to advance BCI-based therapies. Financing amount and round stage are not disclosed. The agreement plans a Brain-Computer Interface Center of Excellence within NEOM; the announcement does not establish that the center is built or operational.',
    source_url: 'https://paradromics.com/news/neom-investment-fund-partners-with-paradromics-to-drive-innovation-in-neurotechnology-healthcare/', scope: 'bci', date_basis: 'announcement',
  },
];
const generated = additions.map((row, index) => ({
  company: row.company, slug: ['eon-systems', 'hemispheric', 'paradromics'][index],
  activity: row.activity, stage: row.stage, amountUsdM: row.amount_usd_m ? Number(row.amount_usd_m) : null,
  date: row.date, datePrecision: row.date_precision, dateBasis: row.date_basis,
  note: row.note, sourceUrl: row.source_url, logo: index === 2 ? '/logos/paradromics.png' : null, scope: row.scope,
}));

// Historical goldens stay frozen. Assert every field of each exact later row
// before excluding it, and never hide unlisted rows, fields or Funding Index data.
export function beforeNeuroWideMilestones(rows, collection) {
  const restored = structuredClone(rows);
  if (!['canonicalMilestones', 'milestones'].includes(collection)) return restored;
  const canonical = collection === 'canonicalMilestones';
  const sourceKey = canonical ? 'source_url' : 'sourceUrl';
  const expected = canonical ? additions : generated;
  for (const row of expected) {
    const matches = restored.filter(candidate => candidate[sourceKey] === row[sourceKey]);
    assert.equal(matches.length, 1, `${collection}: exactly one later ${row.company} disclosure`);
    assert.deepEqual(matches[0], row, `${collection}: only the complete reviewed ${row.company} record may be excluded`);
  }
  return restored.filter(row => !expected.some(added => row[sourceKey] === added[sourceKey]));
}
