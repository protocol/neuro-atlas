import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicationSnapshot} from '../src/lib/publication-data.ts';
import {syntheticPublicationEndpointSnapshot,syntheticPublicationSnapshot,fixtureOptions} from './fixtures/publication-synthetic.mjs';
const parse=s=>parsePublicationSnapshot(s,fixtureOptions);

test('test-only fixtures do not claim more unique changed-endpoint authors than their whole author cohort',()=>{
 const s=syntheticPublicationSnapshot();
 const changed=s.tables.nt_talent_moves.rows.flatMap(row=>row.slice(1)).reduce((sum,n)=>sum+(n??0),0);
 assert.ok(s.audit.authorCohort.authors>=changed,'synthetic cohort is smaller than its 206 changed-endpoint people');
});

test('optional full endpoint matrix accepts all sixteen explicit integer cells and paired cohort audit',()=>{
 const s=syntheticPublicationEndpointSnapshot();
 assert.deepEqual(parse(s),s);
 assert.equal(s.tables.nt_talent_endpoints.rows.flatMap(r=>r.slice(1)).length,16);
 assert.deepEqual(s.tables.nt_talent_endpoints.rows.map((r,i)=>r[i+1]),[10,20,5,9]);
});

test('legacy source absence is preserved, not fabricated as zero diagonals',()=>{
 const s=parse(syntheticPublicationSnapshot());
 assert.equal(s.tables.nt_talent_endpoints,undefined);
 assert.equal(s.audit.affiliationEndpointCohort,undefined);
});

for(const [label,mutate] of [
 ['table without audit',s=>delete s.audit.affiliationEndpointCohort],
 ['audit without table',s=>delete s.tables.nt_talent_endpoints],
 ['null diagonal',s=>s.tables.nt_talent_endpoints.rows[0][1]=null],
 ['null offdiagonal',s=>s.tables.nt_talent_endpoints.rows[0][2]=null],
 ['fractional cell',s=>s.tables.nt_talent_endpoints.rows[0][1]=1.5],
 ['nonfinite cell',s=>s.tables.nt_talent_endpoints.rows[0][1]=Infinity],
 ['unsafe integer cell',s=>s.tables.nt_talent_endpoints.rows[0][1]=Number.MAX_SAFE_INTEGER+1],
 ['negative cell',s=>s.tables.nt_talent_endpoints.rows[0][1]=-1],
 ['numeric string',s=>s.tables.nt_talent_endpoints.rows[0][1]='10'],
 ['offdiagonal disagreement',s=>s.tables.nt_talent_endpoints.rows[0][2]++],
 ['missing origin',s=>s.tables.nt_talent_endpoints.rows.pop()],
 ['duplicate origin',s=>s.tables.nt_talent_endpoints.rows[1]=s.tables.nt_talent_endpoints.rows[0]],
 ['unknown origin',s=>s.tables.nt_talent_endpoints.rows[0][0]='Named Person'],
 ['private table field',s=>s.tables.nt_talent_endpoints.author_ids=['https://openalex.org/A123']],
 ['private column',s=>s.tables.nt_talent_endpoints.columns.push({name:'author_id',type:'string'})],
 ['private row cell',s=>s.tables.nt_talent_endpoints.rows[0].push('https://openalex.org/A123')],
 ['private audit',s=>s.audit.affiliationEndpointCohort.author_ids=['https://openalex.org/A123']],
 ['wrong method',s=>s.audit.affiliationEndpointCohort.methodId='unknown'],
 ['wrong first year',s=>s.audit.affiliationEndpointCohort.firstYearMin=2015],
 ['wrong last year',s=>s.audit.affiliationEndpointCohort.lastYearMax=2026],
 ['wrong active years',s=>s.audit.affiliationEndpointCohort.minActiveYears=1],
 ['eligible total disagreement',s=>s.audit.affiliationEndpointCohort.eligibleAuthors++],
 ['same-sector disagreement',s=>s.audit.affiliationEndpointCohort.sameSectorAuthors++],
 ['changed-sector disagreement',s=>s.audit.affiliationEndpointCohort.changedSectorAuthors++],
 ['negative audit total',s=>s.audit.affiliationEndpointCohort.eligibleAuthors=-1],
 ['fractional audit total',s=>s.audit.affiliationEndpointCohort.eligibleAuthors=250.5],
 ['cohort exceeds all identified authors',s=>s.audit.authorCohort.authors=249],
])test('full endpoint contract rejects '+label,()=>{
 const s=syntheticPublicationEndpointSnapshot();mutate(s);assert.throws(()=>parse(s));
});

test('origin row order does not alter cross-table endpoint validation',()=>{
 const s=syntheticPublicationEndpointSnapshot();s.tables.nt_talent_endpoints.rows.reverse();
 assert.deepEqual(parse(s),s);
});

test('a fully observed empty endpoint cohort is explicit zero data, distinct from missing data',()=>{
 const s=syntheticPublicationEndpointSnapshot();
 s.tables.nt_talent_endpoints.rows.forEach(row=>row.splice(1,4,0,0,0,0));
 s.tables.nt_talent_moves.rows.forEach((row,i)=>row.splice(1,4,...Array.from({length:4},(_,j)=>i===j?null:0)));
 Object.assign(s.audit.affiliationEndpointCohort,{eligibleAuthors:0,sameSectorAuthors:0,changedSectorAuthors:0});
 assert.deepEqual(parse(s),s);
});
