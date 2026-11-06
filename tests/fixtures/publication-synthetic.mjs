// SYNTHETIC schema-v2 contract/interaction fixture. Never application/refresh data.
export const fixtureOptions = { allowTestFixture: true };
export function syntheticPublicationSnapshot() {
 const table=(names,rows)=>({columns:names.map(name=>({name,type:['year','series','group','place','from'].includes(name)?'string':'number'})),rows});
 const growth=groups=>table(['group','y2022','ylast','g','place'],groups.map((s,i)=>[s,100,130+i,30+i,null]));
 const dimensions=['region','institution_type','career_stage','pedigree'];
 return {schemaVersion:2,source:{baselineYear:2022,paperEndYear:2025,authorEndYear:2025,url:'https://api.openalex.org',capturedAt:'2026-11-06T08:00:00Z',paperAsOf:'2026-11-05',authorAsOf:'2026-11-06',observedThrough:'2025-12-31',methodologyVersion:'atlas-primary-publications-v1',methodSha256:'0'.repeat(64),sourceHash:'1'.repeat(64),testOnly:true,corpus:'core',worksMaxUpdatedDate:'2026-11-04',authorsMaxUpdatedDate:'2026-11-05',inputByteHashes:{works:'2'.repeat(64),author_histories:'3'.repeat(64)},coveragePolicy:{minimum_known_share:Object.fromEntries(dimensions.map(d=>[d,.5]))},scienceBaseline:{methodId:'openalex-primary-domain-work-count-v1',acquiredAt:'2026-11-05T09:00:00Z',sourceHash:'4'.repeat(64),url:'https://api.openalex.org'}},tables:{
 nt_yearly:table(['year','series','papers'],[...Array.from({length:16},(_,i)=>[String(2010+i),'Neurotech papers',100+i*10]),...['All research','Science baseline, low','Science baseline, high'].flatMap((s,j)=>Array.from({length:4},(_,i)=>[String(2022+i),s,220+i*(j===1?5:j===2?12:8)]))]),
 neurotech_topics_table:growth(['Invasive','Ultrasound, TMS and MEG','EEG','No technique named']),
 neurotech_bciflag_table:growth(['About BCI','Not about BCI']),
 neurotech_venues_table:growth(['Journal','Conference','Preprint']),
 neurotech_regions_table:growth(['Asia','North America','Europe']),
 neurotech_institutions_table:growth(['Universities','Companies','National institutes']),
 neurotech_career_table:growth(['Early career (1-5 years)','Mid career (6-15 years)','Late career (16+ years)']),
 neurotech_pedigree_table:growth(['Top 1%','Top 1-10%','Top 10-50%']),
 nt_talent_table:table(['group','a2022','alast','growth','new','other','back'],[['Academic',60,72,20,20,50,30],['Industry',1,1,0,1,0,0],['Other institutions',10,13,30,5,60,40],['No listed affiliation',10,14,40,4,50,20]]),
 nt_talent_moves:table(['from','to0','to1','to2','to3'],[['Academic',null,3,40,57],['Industry',36,null,13,51],['Other institutions',2,0,null,1],['No listed affiliation',1,1,1,null]])
 },audit:{paperCohort:{topics:['T10429','T11601','T10614','T10958','T12015','T11993','T10094','T10581','T10241','T10919'],firstYear:2010,lastYear:2025,works:2800,counting:'one-openalex-work-id'},authorCohort:{topics:['T10429','T11601'],firstYear:2000,lastYear:2025,works:1200,authors:150,unidentifiedBylineSlots:2,worksWithoutBylines:0},coverage:[{dimension:'region',year:2025,quarter:1,total:100,known:80,unknown:20,knownShare:.8,scale:1.25}],quarterlyFractionalOutput:[{dimension:'region',year:2025,quarter:1,group:'Asia',rawFraction:[20,1],scaledFraction:[25,1]},{dimension:'region',year:2025,quarter:1,group:'Unknown',rawFraction:[20,1],scaledFraction:null}],baselineStatus:'primary-four-domain-context',matchedBaselineStatus:'not-supplied'}};
}

// Synthetic matched adapter output, preserving the real adapter's exact contract.
export function syntheticMatchedGrowth() {
 const ids=['invasive','high','eeg','no-technique','bci','not-bci','journal','conference','preprint','asia','us-canada','europe','education','company','government-facility','early','mid','late','top-1','top-1-10','top-10-50'];
 const labels=['Invasive','Ultrasound, TMS and MEG','EEG','No technique named','About BCI','Not about BCI','Journal','Conference','Preprint','Asia','US and Canada','Europe','Universities','Companies','Government agencies and research facilities','Early career (1-5 years)','Mid career (6-15 years)','Late career (16+ years)','Top 1%','Top 1-10%','Top 10-50%'];
 const types=['article','review','conference-paper','book-chapter','preprint'];
 const rows=ids.map((id,i)=>{
  const dimension=i<6?'method':i<9?'venue':i<12?'region':i<15?'institution':'author';
  const matched=i>=6&&i<15;
  const numeratorCounts={'2022':matched?10:100,'2025':matched?15:130};
  return {id,label:labels[i],dimension,baselineStatus:matched?'matched':'unavailable',reason:matched?'Same primary whole-work rules on both sides.':'Comparable primary reference counts are unavailable.',countingMethod:dimension==='author'?'primary-author-fractional-v1':'atlas-matched-indexed-works-v1',denominatorUniverse:'All five-type core indexed works in the same category',numeratorUniverse:dimension==='author'?'P2 author-fractional':dimension==='region'||dimension==='institution'?'P2':'NT10',numeratorCounts,referenceCounts:matched?{'2022':1000,'2025':1200}:null,evidence:matched?['asia-n','asia-d']:['primary-derived'],countUnit:dimension==='author'?'author-fractional works':'OpenAlex work ID',neuroGrowthPct:matched?50:30,referenceGrowthPct:matched?20:null,shares:matched?{'2022':.01,'2025':.0125}:null,relativeShareGrowthPct:matched?25:null,growthGapPercentagePoints:matched?30:null};
 });
 return {schemaVersion:1,method:'atlas-matched-indexed-works-v1',measurement:{countUnit:'OpenAlex work ID',identity:'one indexed work ID; no title collapse',corpus:'OpenAlex default core (no expansion)',years:['2022','2025'],types,affiliations:'whole-work involvement; nonexclusive groups',union:'government|facility OR query; never bucket sum'},rows,venueDenominatorDetail:Object.fromEntries(['Journal','Conference','Preprint','Book chapter'].map(label=>[label,{'2022':1000,'2025':1200}])),evidence:{'asia-n':{retrievedAt:'2026-11-05T09:00:00Z',url:'https://api.openalex.org/works?filter=publication_year%3A2022%7C2025',responseSha256:'5'.repeat(64),sourceSha256:null},'asia-d':{retrievedAt:'2026-11-06T07:00:00Z',url:'https://api.openalex.org/works?filter=publication_year%3A2022%7C2025',responseSha256:'6'.repeat(64),sourceSha256:null}},completeMatchedInventory:false};
}
