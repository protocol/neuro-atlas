import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicationSnapshot, selectPublicationCharts} from '../src/lib/publication-data.ts';
import {syntheticPublicationSnapshot, fixtureOptions} from './fixtures/publication-synthetic.mjs';

function fullHistory() {
 const snapshot=syntheticPublicationSnapshot();
 for(let year=2010;year<2022;year++) {
  const all=100+(year-2010)*10;
  snapshot.tables.nt_yearly.rows.push([String(year),'All research',all],[String(year),'Science baseline, low',all-10],[String(year),'Science baseline, high',all+10]);
 }
 return snapshot;
}

test('full science history is accepted without moving the 2022 anchor or the 2025 growth endpoint',()=>{
 const legacy=selectPublicationCharts(parsePublicationSnapshot(syntheticPublicationSnapshot(),fixtureOptions));
 const snapshot=fullHistory();snapshot.tables.nt_yearly.rows.reverse();
 const selected=selectPublicationCharts(parsePublicationSnapshot(snapshot,fixtureOptions));
 assert.equal(selected.baseline.length,16);
 assert.equal(selected.baseline[0].year,2010);
 assert.equal(selected.baseline[0].all,100);
 assert.equal(selected.baseline.at(-1).year,2025);
 assert.equal(selected.baseline.find(row=>row.year===2022).all,220);
 assert.deepEqual(selected.scienceGrowth,legacy.scienceGrowth);
 assert.deepEqual(selected.annual,legacy.annual);
});

for(const kind of ['missing earlier point','mixed series history','inverted earlier band']) test('rejects '+kind,()=>{
 const snapshot=fullHistory();
 if(kind==='missing earlier point') snapshot.tables.nt_yearly.rows=snapshot.tables.nt_yearly.rows.filter(row=>!(row[0]==='2010'&&row[1]==='All research'));
 if(kind==='mixed series history') snapshot.tables.nt_yearly.rows=snapshot.tables.nt_yearly.rows.filter(row=>!(Number(row[0])<2022&&row[1]==='Science baseline, high'));
 if(kind==='inverted earlier band') snapshot.tables.nt_yearly.rows.find(row=>row[0]==='2010'&&row[1]==='Science baseline, low')[2]=999;
 assert.throws(()=>parsePublicationSnapshot(snapshot,fixtureOptions));
});


test('server and client retain full history when a fresh legacy feed would truncate science to 2022',async()=>{
 const {createHash}=await import('node:crypto');
 const {createPublicationSourceServer}=await import('../src/lib/publication-feed-server.ts');
 const {loadNavigationPublication}=await import('../src/components/publication-source-provider.tsx');
 const initial=fullHistory(),legacy=syntheticPublicationSnapshot();
 legacy.source.capturedAt='2026-11-06T09:00:00Z';
 const options={parser:value=>parsePublicationSnapshot(value,fixtureOptions),allowTestOnly:true,now:()=>new Date('2026-11-07T09:00:00Z')};
 const server=createPublicationSourceServer(initial,async()=>({revision:'b'.repeat(40),snapshot:legacy}),options);
 assert.equal((await server()).snapshot.tables.nt_yearly.rows.length,64);
 const fetcher=async()=>new Response(JSON.stringify({revision:'b'.repeat(40),snapshot:legacy,snapshotSha256:createHash('sha256').update(JSON.stringify(legacy,null,2)+'\n').digest('hex')}),{headers:{'Content-Type':'application/json'}});
 const retained=await loadNavigationPublication({},'/full-history',initial,fetcher,options);
 assert.equal(retained.tables.nt_yearly.rows.length,64);
});
