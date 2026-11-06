import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicationSnapshot,selectPublicationCharts} from '../src/lib/publication-data.ts';
import {syntheticPublicationSnapshot,syntheticMatchedGrowth,fixtureOptions} from './fixtures/publication-synthetic.mjs';

test('exact rational audit and author numerators survive JSON beyond IEEE-754 integer precision',()=>{
 const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();
 const denominator=10n**80n+1n;
 s.audit.quarterlyFractionalOutput[0].rawFraction=['9007199254740993','9007199254740991'];
 const early=s.matchedGrowth.rows.find(r=>r.id==='early');
 early.numeratorCounts={'2022':`${100n*denominator}/${denominator}`,'2025':`${130n*denominator}/${denominator}`};
 const parsed=parsePublicationSnapshot(JSON.parse(JSON.stringify(s)),fixtureOptions);
 assert.deepEqual(parsed.audit.quarterlyFractionalOutput[0].rawFraction,['9007199254740993','9007199254740991']);
 assert.equal(parsed.matchedGrowth.rows.find(r=>r.id==='early').numeratorCounts['2022'],early.numeratorCounts['2022']);
 assert.equal(selectPublicationCharts(parsed).growth.find(r=>r.id==='early').growth,30);
 s.audit.quarterlyFractionalOutput[0].rawFraction=[2**54,1];
 assert.throws(()=>parsePublicationSnapshot(s,fixtureOptions));
});

test('real wrapper partial-matched inventory status is admitted only alongside its inventory',()=>{
 const s=syntheticPublicationSnapshot();s.audit.matchedBaselineStatus='partial-primary-matched-inventory';
 s.matchedGrowth=syntheticMatchedGrowth();
 assert.deepEqual(parsePublicationSnapshot(s,fixtureOptions),s);
 delete s.matchedGrowth;
 assert.throws(()=>parsePublicationSnapshot(s,fixtureOptions));
});
