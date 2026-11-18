import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
import { beforeSourceAudit, SOURCE_AUDIT_DELTA } from './helpers/source-audit-baseline.mjs';
import { beforeNov17Feedback } from './helpers/nov17-feedback-baseline.mjs';
import { beforeNeuroWideMilestones } from './helpers/neuro-wide-milestones-baseline.mjs';
const load = name => JSON.parse(readFileSync(new URL('../src/data/' + name, import.meta.url)));
const funding = load('funding-index.json');
const current = { milestones: load('milestones.json'), fundingRounds: funding.rounds, fundingMilestones: funding.milestones, fundingCompanies: funding.companies };
for (const [key, file] of Object.entries({ canonicalMilestones: 'market-memo-q1-2026/milestones.csv', canonicalRounds: 'funding-index/rounds.csv', canonicalRegulatory: 'funding-index/milestones.csv', canonicalCompanies: 'funding-index/companies.csv', canonicalFoundings: 'funding-index/foundings.csv' })) current[key] = parseCsv(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));
const baselineHashes = {
  "milestones": "c79d3d4fad34e00b74375772067cced0146f03874f81a1bdb06db27503a0ffe3",
  "fundingRounds": "62b182992223112b1b9f53fb12f58dc19abdf0a59361bc03633b1cd508a83703",
  "fundingMilestones": "be52bb3b16ed90bc9df83fe64d7c2f7a9075a78998e9d98c7b88fe78d6e0748f",
  "fundingCompanies": "46b7f281ce9aee65a1a593dcc77c786267f1a0bfd7a4d97ccca19b4383fba3a5",
  "canonicalMilestones": "f8f771f4d0c3c7efb27db1a7ea17db67b94369db11aa6eba70ac73d139876345",
  "canonicalRounds": "19a98edd9862e234bdcf2eeee0d48b345c3d4afd761f333806c6a99f8e5ad4bc",
  "canonicalRegulatory": "9f1ab47e3f640def896f686979282876c1cdb42a905794dc42fc98ffcd2090ae",
  "canonicalCompanies": "7603ddc3d2f0bc638c4a3ecad5ffbe89421cc739c24a1453592f239995585f36",
  "canonicalFoundings": "f9b833eb4c596509bb49d1a0bd2ac0545e030cb8d7f4deddd12ed364f99d439a"
};
for (const [kind, hash] of Object.entries(baselineHashes)) {
  test(kind + ' permits only the explicitly reviewed source-audit field delta', () => {
    assert.equal(SOURCE_AUDIT_DELTA.baselineSha, 'de2301974ac1e66b35aaaec91198dc5dda8c060c');
    const scoped = beforeNov17Feedback(beforeNeuroWideMilestones(current[kind], kind), kind);
    assert.equal(scoped.length, SOURCE_AUDIT_DELTA.collections[kind].length);
    const restored = beforeSourceAudit(scoped, kind);
    assert.equal(createHash('sha256').update(JSON.stringify(restored)).digest('hex'), hash);
  });
}
