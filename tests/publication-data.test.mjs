import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, syntheticMatchedGrowth, fixtureOptions } from './fixtures/publication-synthetic.mjs';
const parse=s=>data.parsePublicationSnapshot(s,fixtureOptions);

test('schema v2 accepts independent dates, direct OpenAlex metadata and bounded anonymous audit',()=>{
 const snapshot=syntheticPublicationSnapshot();
 const parsed=parse(snapshot);
 assert.equal(parsed.schemaVersion,2);
 assert.equal(Object.keys(parsed.tables).length,10);
 assert.deepEqual(parsed,snapshot);
 assert.ok(parsed.source.authorAsOf>parsed.source.paperAsOf,'acquisition order does not establish observation order');
});

test('undefined percentages remain null and science context can be absent',()=>{
 const s=syntheticPublicationSnapshot();
 s.tables.neurotech_topics_table.rows[0]=['Invasive',0,4,null,null];
 s.tables.nt_talent_table.rows[1]=['Industry',0,1,null,0,null,null];
 s.tables.nt_yearly.rows=s.tables.nt_yearly.rows.filter(r=>r[1]==='Neurotech papers');
 delete s.source.scienceBaseline;
 s.audit.baselineStatus='not-supplied';
 const selected=data.selectPublicationCharts(parse(s));
 assert.equal(selected.growth.find(r=>r.group==='Invasive').growth,null);
 assert.deepEqual(selected.baseline,[]);
 assert.equal(selected.scienceGrowth,null);
 assert.equal(selected.totalResearchers,100);
 assert.equal(selected.waffle.length,100);
});

test('matched-growth replaces BOTH fractional N and whole-work D with the paired source counts',()=>{
 const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();
 const selected=data.selectPublicationCharts(parse(s));
 const asia=selected.growth.find(r=>r.id==='asia');
 assert.equal(asia.start,10);assert.equal(asia.end,15);assert.equal(asia.growth,50);
 assert.equal(asia.referenceStart,1000);assert.equal(asia.referenceEnd,1200);assert.equal(asia.referenceGrowth,20);
 assert.equal(asia.countUnit,'OpenAlex work ID');assert.equal(asia.numeratorUniverse,'P2');
 assert.equal(selected.growth.filter(r=>r.baselineStatus==='matched').length,9);
 const unavailable=selected.growth.filter(r=>r.baselineStatus==='unavailable');
 assert.equal(unavailable.length,12);
 assert.ok(unavailable.every(r=>r.referenceGrowth===null&&r.referenceStart===null));
 assert.equal(selected.growth.find(r=>r.id==='early').growth,30);
 assert.equal(selected.growth.find(r=>r.id==='us-canada').group,'US and Canada');
 assert.equal(selected.growth.find(r=>r.id==='government-facility').group,'Government agencies and research facilities');
});

for(const [label,mutate] of [
 ['private table',s=>s.tables.author_watchlist=s.tables.nt_talent_table],
 ['private root',s=>s.authorName='Named Person'],
 ['private audit',s=>s.audit.authorCohort.author_ids=['https://openalex.org/A123']],
 ['private audit row',s=>s.audit.coverage[0].name='Named Person'],
 ['private fractional row',s=>s.audit.quarterlyFractionalOutput[0].work_id='https://openalex.org/W123'],
 ['wrong fractional group',s=>s.audit.quarterlyFractionalOutput[0].group='Top 1%'],
 ['fractional unknown scaling',s=>s.audit.quarterlyFractionalOutput[1].scaledFraction=[25,1]],
 ['unknown column',s=>s.tables.nt_yearly.columns.push({name:'author_name',type:'string'})],
 ['unknown categorical identity',s=>s.tables.nt_talent_table.rows[0][0]='Named Person'],
 ['duplicate annual point',s=>s.tables.nt_yearly.rows.push(s.tables.nt_yearly.rows[0])],
 ['missing source row',s=>s.tables.neurotech_topics_table.rows.pop()],
 ['2026 estimate',s=>s.tables.nt_yearly.rows[0][0]='2026 (est.)'],
 ['invalid calendar day',s=>s.source.authorAsOf='2026-02-30'],
 ['future author acquisition',s=>s.source.authorAsOf='2026-11-07'],
 ['source update exceeds acquisition',s=>s.source.worksMaxUpdatedDate='2026-11-06'],
 ['numeric strings',s=>s.tables.nt_yearly.rows[0][2]='100'],
 ['infinite count',s=>s.tables.nt_yearly.rows[0][2]=Infinity],
 ['negative count',s=>s.tables.nt_talent_moves.rows[0][2]=-1],
 ['unknown off-diagonal',s=>s.tables.nt_talent_moves.rows[0][2]=null],
 ['nonempty diagonal',s=>s.tables.nt_talent_moves.rows[0][1]=0],
 ['inverted band',s=>s.tables.nt_yearly.rows.find(r=>r[0]==='2025'&&r[1]==='Science baseline, low')[2]=999],
 ['unanchored baseline',s=>s.tables.nt_yearly.rows.find(r=>r[0]==='2022'&&r[1]==='All research')[2]=221],
 ['context status mismatch',s=>s.audit.baselineStatus='not-supplied'],
 ['untrusted source',s=>s.source.url='https://example.com'],
 ['old revision ID',s=>s.source.revisionId='old-artio-model'],
 ['missing source hash',s=>s.source.sourceHash=''],
 ['invented group place',s=>s.tables.neurotech_topics_table.rows[0][4]='Above'],
 ['growth with no denominator',s=>s.tables.neurotech_topics_table.rows[0]=['Invasive',0,3,0,null]],
 ['duplicate coverage cell',s=>s.audit.coverage.push(s.audit.coverage[0])],
 ['inconsistent coverage totals',s=>s.audit.coverage[0].unknown=0],
 ['incomplete observed year',s=>s.source.observedThrough='2025-11-01'],
]) test('rejects '+label,()=>{const s=syntheticPublicationSnapshot();mutate(s);assert.throws(()=>parse(s));});

test('synthetic production loads require an explicit fixture allowance on every parse',()=>{
 assert.throws(()=>data.parsePublicationSnapshot(syntheticPublicationSnapshot()),/test-only/);
});

test('legacy reference data is deliberately not an independent primary production source',()=>{
 const reference=syntheticPublicationSnapshot();reference.schemaVersion=1;reference.source.url='https://www.artio.so/polaris/pages/publication-boom';
 assert.throws(()=>data.parsePublicationSnapshot(reference,fixtureOptions));
});

for(const [label,mutate] of [
 ['duplicate ID',m=>m.rows[0].id='asia'],
 ['incorrect label',m=>m.rows[10].label='North America'],
 ['incorrect dimension',m=>m.rows[9].dimension='author'],
 ['missing N',m=>m.rows[9].numeratorCounts=null],
 ['missing D',m=>m.rows[9].referenceCounts=null],
 ['fractional matched N',m=>m.rows[9].numeratorCounts['2022']=9.5],
 ['N exceeds D',m=>m.rows[9].numeratorCounts['2022']=1001],
 ['fractional researcher comparator',m=>m.rows[9].countUnit='author-fractional works'],
 ['wrong matched corpus',m=>m.rows[9].numeratorUniverse='NT10'],
 ['invented method comparator',m=>{m.rows[0].baselineStatus='matched';m.rows[0].referenceCounts={'2022':1000,'2025':1200}}],
 ['invented author comparator',m=>m.rows[15].baselineStatus='matched'],
 ['growth disagreement',m=>m.rows[9].neuroGrowthPct=51],
 ['share disagreement',m=>m.rows[9].shares['2025']=.9],
 ['gap disagreement',m=>m.rows[9].growthGapPercentagePoints=31],
 ['relative share disagreement',m=>m.rows[9].relativeShareGrowthPct=30],
 ['anonymous row boundary',m=>m.rows[9].authorNames=['Named Person']],
 ['anonymous evidence boundary',m=>m.evidence['asia-n'].rawWorks=[]],
 ['credential evidence URL',m=>m.evidence['asia-n'].url+='&api_key=secret'],
])test('matched contract rejects '+label,()=>{const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();mutate(s.matchedGrowth);assert.throws(()=>parse(s));});

test('supplemental author fractions retain their unit and exact source representation',()=>{
 const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();
 const early=s.matchedGrowth.rows.find(r=>r.id==='early');
 early.numeratorCounts={'2022':'4/3','2025':'2'};early.neuroGrowthPct=50;
 const parsed=parse(s);const row=data.selectPublicationCharts(parsed).growth.find(r=>r.id==='early');
 assert.equal(parsed.matchedGrowth.rows.find(r=>r.id==='early').numeratorCounts['2022'],'4/3');
 assert.equal(row.start,4/3);assert.equal(row.end,2);assert.equal(row.growth,50);
 assert.equal(row.referenceGrowth,null);assert.equal(row.countUnit,'author-fractional works');
});

test('Other institutions is an inclusive display label for every known nonacademic/noncompany type',()=>{
 const row=data.selectPublicationCharts(parse(syntheticPublicationSnapshot())).sectors.find(r=>r.sector==='Other institutions');
 assert.equal(row.label,'Other institutions');
});

test('zero numerator and reference anchors stay undefined; source ordering is irrelevant',()=>{
 const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();
 const row=s.matchedGrowth.rows.find(r=>r.id==='asia');
 row.numeratorCounts={'2022':0,'2025':15};row.referenceCounts={'2022':0,'2025':1200};
 row.neuroGrowthPct=null;row.referenceGrowthPct=null;row.growthGapPercentagePoints=null;
 row.relativeShareGrowthPct=null;row.shares={'2022':null,'2025':.0125};
 s.matchedGrowth.rows.reverse();s.tables.neurotech_regions_table.rows.reverse();
 const selected=data.selectPublicationCharts(parse(s)).growth.find(r=>r.id==='asia');
 assert.equal(selected.start,0);assert.equal(selected.growth,null);assert.equal(selected.referenceGrowth,null);
 assert.equal(selected.baselineStatus,'matched');
});

test('the actual offline primary producer replays into schema v2 with explicit fixture allowance',async()=>{
 const {execFileSync}=await import('node:child_process');
 const text=execFileSync('python3',['-c',`import sys,json,importlib.util
sys.dont_write_bytecode=True
p='scripts/publications/derive.py'
spec=importlib.util.spec_from_file_location('primary',p)
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
f='tests/fixtures/publications-primary-test-only/'
w=d.read_jsonl(__import__('pathlib').Path(f+'works.jsonl'))
h=d.read_jsonl(__import__('pathlib').Path(f+'author_histories.jsonl'))
m=json.load(open(f+'manifest.json'))
print(json.dumps(d.derive(w,h,m)))`],{encoding:'utf8'});
 const snapshot=JSON.parse(text);
 assert.equal(snapshot.source.testOnly,true);
 const parsed=parse(snapshot), selected=data.selectPublicationCharts(parsed);
 assert.equal(selected.annual.at(-1).papers,4);assert.equal(selected.totalResearchers,3);
 assert.equal(selected.waffle.length,100);assert.equal(selected.baseline.length,0);
 assert.equal(selected.growth.filter(r=>r.referenceGrowth===null).length,21);
 assert.equal(parsed.tables.nt_talent_table.rows.find(r=>r[0]==='Other institutions')[3],null);
});

test('a missing annual 2022 anchor stays undefined without blocking observed output',()=>{
 const s=syntheticPublicationSnapshot();
 delete s.source.scienceBaseline;s.audit.baselineStatus='not-supplied';
 s.tables.nt_yearly.rows=s.tables.nt_yearly.rows.filter(row=>row[1]==='Neurotech papers');
 s.tables.nt_yearly.rows.find(row=>row[0]==='2022')[2]=0;
 const selected=data.selectPublicationCharts(parse(s));
 assert.equal(selected.neurotechGrowth,null);assert.equal(selected.scienceGrowth,null);
 assert.equal(selected.annual.length,16);
});

test('matched whole-work affiliation output is never tagged author-fractional',()=>{
 const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();
 const selected=data.selectPublicationCharts(parse(s));
 assert.equal(selected.growth.find(row=>row.id==='asia').authorBased,false);
 assert.equal(selected.growth.find(row=>row.id==='early').authorBased,true);
});

for(const [label,url] of [
 ['author IDs','https://api.openalex.org/works?filter=authorships.author.id:A123'],
 ['raw search names','https://api.openalex.org/works?filter=title.search:Named%20Person'],
 ['unexpected group identities','https://api.openalex.org/works?group_by=authorships.author.id'],
])test('evidence URLs exclude '+label,()=>{
 const s=syntheticPublicationSnapshot();s.matchedGrowth=syntheticMatchedGrowth();
 s.matchedGrowth.evidence['asia-n'].url=url;assert.throws(()=>parse(s));
});
