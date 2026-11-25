import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildFundingIndex } from '../scripts/lib/funding-index.mjs';

const source = 'https://www.neuroxess.com/news/naohukejiwancheng7yiyuanblunrongziguotoujulishenchuangtouyuqinzhizibenlingtou/';
const conversion = {
  sourceUrl: source, companySlug: 'neuroxess', currency: 'CNY', amountNativeM: 700,
  investmentDate: null, announcedOn: '2026-10-28', dateBasis: 'announcement_date',
  rateDate: '2026-10-28', nativePerUsd: 6.6662, rateSource: 'Federal Reserve H.10',
  rateSourceUrl: 'https://www.federalreserve.gov/releases/h10/20261102/', reviewedOn: '2026-11-09',
};
const round = {
  company_slug: 'neuroxess', announced_on: '2026-10-28', date_precision: 'day', stage: 'Series B',
  amount_usd_m: '', amount_native_m: '700', currency: 'CNY', display_amount: 'RMB 700m (≈$105m)',
  source_url: source, source_kind: 'primary', reviewed_on: '2026-11-09',
};
const fixture = (fx = conversion, row = round) => ({
  companies: [{ slug: 'neuroxess', name: 'NeuroXess' }], rounds: [row], milestones: [], fxConversions: [fx],
});

test('native-only financing uses a pinned historical rate and retains its date/source provenance', () => {
  const built = buildFundingIndex(fixture());
  assert.equal(built.rounds.length, 1, 'native-currency financing must no longer disappear from the USD index');
  assert.equal(built.rounds[0].amountUsdM, 700 / 6.6662);
  assert.deepEqual(built.rounds[0].fx, conversion);
  assert.equal(built.rounds[0].amountNativeM, 700);
  assert.equal(built.rounds[0].fx.investmentDate, null, 'announcement is not an invented closing date');
});

test('historical conversion rejects missing, future, stale, duplicate or contradictory provenance', () => {
  const invalid = [
    { nativePerUsd: 0 }, { nativePerUsd: -1 }, { nativePerUsd: Infinity },
    { amountNativeM: 0 }, { currency: 'CN' }, { rateSourceUrl: 'javascript:alert(1)' },
    { rateSource: '' }, { rateDate: '2026-10-29' }, { rateDate: '2026-02-30' },
    { dateBasis: 'investment_date', investmentDate: null },
    { investmentDate: '2026-10-27' }, { announcedOn: '2026-10-27' },
    { rateDate: '2026-10-27' }, { reviewedOn: '2026-10-27' },
  ];
  for (const delta of invalid) assert.throws(() => buildFundingIndex(fixture({ ...conversion, ...delta })), /historical FX/i, JSON.stringify(delta));
  assert.throws(() => buildFundingIndex({ ...fixture(), fxConversions: [conversion, conversion] }), /historical FX/i);
  for (const delta of [{ currency: 'EUR' }, { amount_native_m: '701' }, { amount_usd_m: '99' }]) {
    assert.throws(() => buildFundingIndex(fixture(conversion, { ...round, ...delta })), /historical FX/i);
  }
});

test('the reviewed NeuroXess round and timeline share the same historical conversion and explicit announcement fallback', () => {
  const funding = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
  const timeline = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
  const indexed = funding.rounds.filter(row => row.sourceUrl === source);
  assert.equal(indexed.length, 1, 'reviewed native round must be present exactly once');
  const mark = timeline.find(row => row.sourceUrl === source);
  const fx = JSON.parse(readFileSync(new URL('../data/funding-index/fx-conversions.json', import.meta.url)))[0];
  assert.deepEqual(fx, conversion);
  assert.deepEqual(mark.fx, fx);
  assert.deepEqual(indexed[0].fx, fx);
  assert.equal(mark.amountUsdM, 700 / 6.6662);
  assert.equal(indexed[0].amountUsdM, mark.amountUsdM);
  for (const row of [mark, indexed[0]]) assert.match(row.note, /announcement date because the investment date is undisclosed/i);
  assert.match(funding.methodology.coverage, /historical.*exchange|historical.*FX/i);
});

test('a disclosed investment date drives FX and unsupported previous-business-day claims fail closed', () => {
  const known = { ...conversion, investmentDate: '2026-10-26', dateBasis: 'investment_date', rateDate: '2026-10-26' };
  assert.deepEqual(buildFundingIndex(fixture(known)).rounds[0].fx, known);
  assert.throws(() => buildFundingIndex(fixture({ ...known, rateDate: '2026-10-28' })), /historical FX/i);
  for (const rateDate of ['2026-10-21', '2026-10-25', '2026-10-28']) {
    assert.throws(() => buildFundingIndex(fixture({ ...conversion, rateDate, rateDateBasis: 'previous_business_day' })), /historical FX/i);
  }
});



test('documented agreement-event dates drive FX without inventing investment or announcement dates', () => {
  const event = { ...conversion, investmentDate: null, dateBasis: 'event_date' };
  const built = buildFundingIndex(fixture(event, { ...round, date_basis: 'event' }));
  assert.deepEqual(built.rounds[0].fx, event);
  assert.equal(built.rounds[0].fx.investmentDate, null);
  assert.equal(built.rounds[0].dateBasis, 'event');
  assert.equal(built.rounds[0].amountUsdM, 700 / 6.6662);
  assert.throws(() => buildFundingIndex(fixture({ ...event, investmentDate: '2026-10-27' })), /historical FX/i);
  assert.throws(() => buildFundingIndex(fixture({ ...event, rateDate: '2026-10-27' })), /historical FX/i);
});

test('a previous available observation is explicit, strictly earlier and bounded to four calendar days', () => {
  const saturday = {
    ...conversion, amountNativeM: 150, announcedOn: '2022-09-24', dateBasis: 'event_date',
    rateDate: '2022-09-23', nativePerUsd: 7.1266, rateDateBasis: 'previous_available_business_day',
  };
  const eventRound = { ...round, announced_on: '2022-09-24', date_basis: 'event', amount_native_m: '150' };
  assert.equal(buildFundingIndex(fixture(saturday, eventRound)).rounds[0].amountUsdM, 150 / 7.1266);
  const fourthDay = { ...saturday, announcedOn: '2022-09-27' };
  assert.deepEqual(buildFundingIndex(fixture(fourthDay, { ...eventRound, announced_on: '2022-09-27' })).rounds[0].fx, fourthDay);
  const holiday = { ...conversion, announcedOn: '2026-07-03', rateDate: '2026-07-02', rateDateBasis: 'previous_available_business_day', nativePerUsd: 6.7886 };
  assert.deepEqual(buildFundingIndex(fixture(holiday, { ...round, announced_on: '2026-07-03' })).rounds[0].fx, holiday);
  for (const change of [
    { rateDate: '2022-09-24' }, { rateDate: '2022-09-25' }, { rateDate: '2022-09-19' },
    { rateDateBasis: 'previous_business_day' }, { rateDateBasis: '' }, { rateDateBasis: null },
    { rateDateBasis: undefined }, { extra: 'unreviewed' }, { rateDate: '2022-02-30' },
  ]) assert.throws(() => buildFundingIndex(fixture({ ...saturday, ...change }, eventRound)), /historical FX/i, JSON.stringify(change));
  assert.throws(() => buildFundingIndex(fixture({ ...conversion, extra: true })), /historical FX/i);
});
