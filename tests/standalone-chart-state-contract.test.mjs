import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { chartShareUrl } from '../src/lib/chart-export.ts';
import { graphNavigationHref, legacyGraphDestination } from '../src/lib/field-velocity/graph-navigation.ts';
import { readStandaloneChartSettings, standaloneChartParams, updateStandaloneChartUrl } from '../src/lib/standalone-chart-state.ts';
const bci = 'bci-information-transfer-over-time';
const annual = 'neurotech-papers-per-year';
const entry = fieldVelocityGraph(bci);
const url = search => new URL(`https://atlas.example/proxy/field-velocity/${bci}${search}`);

test('single-chart query contract rejects malformed, repeated, oversized and unknown tokens independently', () => {
  for (const value of [`${bci}:speech,speech`,`${bci}:speech,unknown`,`${bci}:`,`${bci}:SPEECH`,`${bci}:speech,`,`${bci}:<script>`,`${bci}:${'a'.repeat(513)}`,`${annual}:speech`]) {
    assert.deepEqual(readStandaloneChartSettings(url(`?chartHidden=${encodeURIComponent(value)}&chartModel=${bci}:fit`),entry),{extrapolate:true},value);
  }
  assert.deepEqual(readStandaloneChartSettings(url(`?chartHidden=${bci}:speech&chartHidden=${bci}:speech&chartModel=${bci}:fit`),entry),{extrapolate:true});
  assert.deepEqual(readStandaloneChartSettings(url(`?chartModel=${bci}:fit,voxels&chartBaseline=${bci}:matched`),entry),{});
  const mixed = readStandaloneChartSettings(url(`?chartHidden=${bci}:handwriting,cursor,speech&chartModel=${bci}:sensory,fit`),entry);
  assert.equal(standaloneChartParams(entry,mixed).toString(),new URLSearchParams({chartHidden:`${bci}:cursor,speech,handwriting`,chartModel:`${bci}:fit,sensory`}).toString());
});

test('share URLs allowlist validated state and cannot transfer it to another chart or accept another chart source', () => {
  const current=`https://user:password@atlas.example/proxy/field-velocity/${bci}?campaign=private&secret=shh&secret=again&chartHidden=${bci}:speech&chartModel=${bci}:fit#retained`;
  const shared=new URL(chartShareUrl(current,bci));
  assert.equal(shared.origin,'https://atlas.example');
  assert.equal(shared.username,'');assert.equal(shared.password,'');assert.equal(shared.hash,'');
  assert.equal(shared.pathname,`/proxy/field-velocity/${bci}`);
  assert.deepEqual([...shared.searchParams], [['chartHidden',`${bci}:speech`],['chartModel',`${bci}:fit`]]);
  assert.equal(new URL(chartShareUrl(current,annual)).search,'');
  const wrongSource=`https://atlas.example/proxy/field-velocity/${annual}?chartHidden=${bci}:speech`;
  assert.equal(new URL(chartShareUrl(wrongSource,bci)).search,'', 'query state must describe its source chart, not a target linked from elsewhere');
});

test('same-origin navigation retains unrelated queries but drops chart state on other charts',()=>{
  const current=`https://atlas.example/field-velocity/${bci}?review=1&review=2&chartHidden=${bci}:speech&chartModel=${bci}:fit`;
  const peer=new URL(graphNavigationHref(annual,current),'https://atlas.example');
  assert.deepEqual([...peer.searchParams],[['review','1'],['review','2']]);
  assert.equal(new URL(graphNavigationHref(bci,current),'https://atlas.example').searchParams.get('chartHidden'),`${bci}:speech`);
  const legacy=`https://atlas.example/field-velocity?review=1&chartHidden=${bci}:speech#draft-panel-bci-bitrate`;
  assert.equal(new URL(legacyGraphDestination(legacy,''),'https://atlas.example').searchParams.get('chartHidden'),`${bci}:speech`);
});

test('updates preserve unrelated repeated queries and fragments and remove all default single-chart params',()=>{
  const current=url(`?review=1&chartHidden=${bci}:speech&review=2&chartModel=${bci}:fit#legacy`);
  const next=updateStandaloneChartUrl(current,entry,{hidden:[],extrapolate:false});
  assert.equal(next.href,`https://atlas.example/proxy/field-velocity/${bci}?review=1&review=2#legacy`);
  assert.equal(current.searchParams.get('chartHidden'),`${bci}:speech`,'input is not mutated');
});
