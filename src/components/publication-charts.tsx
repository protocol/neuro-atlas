"use client";

import React, { useMemo, useRef, useState } from "react";
import { ChartModal } from "@/components/chart-modal";
import { PublicationSankey } from "@/components/publication-sankey";
import { ChartActions } from "@/components/chart-actions";
import { ChartShare } from "@/components/chart-share";
import { DraftChartShare } from "@/components/draft-chart-share";
import { usePerformanceHash, navigatePerformance } from "@/lib/field-velocity/navigation";
import { usePreviewFont } from "@/components/use-preview-font";
import { metricSizingVisibility } from "@/components/metric-sizing-visibility";
import { usePublicationSource } from "@/components/publication-source-provider";
import { parsePublicationSnapshot, selectPublicationCharts, PUBLICATION_ANCHORS, PUBLICATION_GROWTH_GROUPS, PUBLICATION_SECTORS, type PublicationSnapshot, type PublicationAnchor, type PublicationChartData, type PublicationTable } from "@/lib/publication-data";

const number = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const percent = (n: number | null) => n === null ? "No 2022 denominator" : `${n > 0 ? "+" : ""}${number(n)}%`;
const titles = ["Neurotech papers per year", "Publication growth by group", "Researchers by publication sector", "Researchers’ first and latest affiliations"];
export const PUBLICATION_SEARCH_TEXT = `${titles.join(" ")} publication papers output science baseline OpenAlex bioRxiv growth method brain-computer interface BCI venue region institution career citation researchers sectors universities companies hospitals labs nonprofits first latest affiliation changes`;
const blue = "#4b4df2", teal = "#138a7a", gray = "#a6b0bf";
const short = (s: string) => s.replace(/ \(.*\)$/, "");
type Inspect = (text: string) => void;
/** Real movement, keyboard focus and touch/click select points; a stationary pointer never preselects. */
function pointEvents(label: string, inspect?: Inspect) {
  return inspect ? { tabIndex: 0, role: "button", "aria-label": label,
    onPointerMove: (event: React.PointerEvent<SVGElement>) => { if (event.movementX || event.movementY) inspect(label); },
    onFocus: () => inspect(label), onClick: () => inspect(label), onKeyDown: (event: React.KeyboardEvent<SVGElement>) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); inspect(label); } },
  } : {};
}
function AnnualPlot({ data, compact, inspect }: { data: PublicationChartData; compact?: boolean; inspect?: Inspect }) {
  const { ref, fontSize } = usePreviewFont(720, !!compact);
  const left = compact ? Math.max(90, fontSize * 6) : 80, right = 690, top = compact ? Math.max(28, fontSize) : 28, bottom = 270;
  const max = Math.max(...data.annual.map(row => row.papers), ...data.baseline.map(row => row.high));
  const step = Math.max(1, Math.ceil(max / 4 / 1000) * 1000), ceiling = step * 4;
  const x = (year: number) => left + (year - 2010) / 15 * (right - left);
  const y = (value: number) => bottom - value / ceiling * (bottom - top);
  const line = (rows: {year: number; value: number}[]) => rows.map(row => `${x(row.year)},${y(row.value)}`).join(" ");
  return <svg ref={ref} viewBox={`0 0 720 ${compact ? bottom+fontSize*2.4 : 315}`} role="img" aria-label={data.baseline.length?"Annual neurotech papers, with global science context anchored to 2022":"Annual neurotech indexed papers, 2010–2025"} style={{ fontSize: compact ? fontSize : 13 }}>
    <title>{data.baseline.length?"Neurotech papers, 2010–2025; global science context anchored to the 2022 count":"Neurotech papers, 2010–2025"}</title>
    {[0,1,2,3,4].map(i => <g key={i}><line x1={left} x2={right} y1={y(i*step)} y2={y(i*step)} stroke="var(--border)"/><text x={left-12} y={y(i*step)+4} textAnchor="end">{number(i*step)}</text></g>)}
    {data.baseline.length>0&&<polygon data-science-context fill={gray} fillOpacity=".3" points={[...data.baseline.map(row => `${x(row.year)},${y(row.high)}`), ...[...data.baseline].reverse().map(row => `${x(row.year)},${y(row.low)}`)].join(" ")}/>}
    {data.baseline.length>0&&<polyline data-science-context fill="none" stroke={teal} strokeWidth="3" points={line(data.baseline.map(row => ({year:row.year,value:row.all})))}/>}
    <polyline fill="none" stroke={blue} strokeWidth="3" points={line(data.annual.map(row => ({year:row.year,value:row.papers})))}/>
    {data.annual.map(row => <circle key={row.year} data-publication-mark data-year={row.year} data-value={row.papers} cx={x(row.year)} cy={y(row.papers)} r="5" fill={blue} {...pointEvents(`${row.year}: ${number(row.papers)} neurotech papers`, inspect)}><title>{`${row.year}: ${number(row.papers)} papers`}</title></circle>)}
    {inspect && data.baseline.map(row => <circle key={row.year} data-publication-mark cx={x(row.year)} cy={y(row.all)} r="5" fill={teal} {...pointEvents(`${row.year}: all-research growth equivalent ${number(row.all)} papers; four-domain band ${number(row.low)}–${number(row.high)}. Anchored to the 2022 neurotech count.`, inspect)}/>)}
    {(compact?[2010,2018,2025]:[2010,2013,2016,2019,2022,2025]).map(year => <text key={year} x={x(year)} y={compact?bottom+fontSize*1.8:300} textAnchor="middle">{year}</text>)}
  </svg>;
}
type GrowthRow = PublicationChartData["growth"][number];
function growthInspection(row: GrowthRow) {
  const n = `${row.group}: neurotech ${number(row.start)} in 2022 → ${number(row.end)} in 2025 (${percent(row.growth)}). Unit: ${row.countUnit}; numerator universe: ${row.numeratorUniverse}; method: ${row.countingMethod}.`;
  return row.baselineStatus === "matched"
    ? `${n} Same-category reference ${number(row.referenceStart!)} → ${number(row.referenceEnd!)} (${percent(row.referenceGrowth)}). Reference universe: ${row.denominatorUniverse}. Growth gap: ${row.growthGapPercentagePoints === null ? "undefined" : `${number(row.growthGapPercentagePoints)} percentage points`}; relative share growth: ${percent(row.relativeShareGrowthPct)}.`
    : `${n} Reference unavailable. ${row.reason}`;
}
function GrowthMarks({row,x,y,inspect}:{row:GrowthRow;x:(n:number)=>number;y:number;inspect?:Inspect}) {
  return <g data-publication-mark data-growth-row={row.id} data-group={row.group} data-value={row.growth ?? "unavailable"} {...pointEvents(growthInspection(row),inspect)}>
    <title>{growthInspection(row)}</title>
    {row.growth!==null&&row.referenceGrowth!==null&&<line x1={x(row.growth)} x2={x(row.referenceGrowth)} y1={y-4} y2={y+4} stroke={gray} strokeWidth="2"/>}
    {row.growth!==null&&<circle data-growth-series="neurotech" cx={x(row.growth)} cy={row.referenceGrowth===null?y:y-4} r="5" fill={blue}/>}
    {row.referenceGrowth!==null&&<path data-growth-series="reference" d={`M ${x(row.referenceGrowth)} ${y-2} l 6 6 l -6 6 l -6 -6 Z`} fill="var(--surface)" stroke={teal} strokeWidth="2"/>}
  </g>;
}
function growthExtent(data:PublicationChartData) {
  const values=data.growth.flatMap(row=>[row.growth,row.referenceGrowth].filter((value):value is number=>value!==null));
  return {low:Math.floor(Math.min(0,...values)/25)*25,high:Math.ceil(Math.max(50,...values)/50)*50};
}
function GrowthPreview({data}:{data:PublicationChartData}) {
  const {ref,fontSize}=usePreviewFont(400,true);
  const {low,high}=growthExtent(data), x=(value:number)=>18+(value-low)/(high-low)*230;
  const sections=PUBLICATION_GROWTH_GROUPS.map((section,index)=>({section,heading:fontSize*2+PUBLICATION_GROWTH_GROUPS.slice(0,index).reduce((total,item)=>total+(item.groups.length*4.5+3)*fontSize,0)}));
  const height=sections.at(-1)!.heading+(2+3*4.5)*fontSize;
  return <svg ref={ref} viewBox={`0 0 400 ${height}`} role="img" aria-label="21 growth groups; neurotech and available same-category references; scroll vertically" style={{fontSize}}>
    {sections.map(({section,heading})=><g key={section.table}>
      <text x="12" y={heading} fontWeight="700">{section.label}</text>
      {data.growth.filter(row=>row.table===section.table).map((row,index)=>{
        const y=heading+(1.6+index*4.5)*fontSize;
        return <g key={row.id}>
          <text x="12" y={y}>{row.id==="government-facility"?"Government / research facilities":short(row.group).replace("Ultrasound, TMS and MEG","Ultrasound, TMS, MEG")}</text>
          <GrowthMarks row={row} x={x} y={y+fontSize*1.1}/>
          <text x="390" y={y+fontSize*1.1} textAnchor="end">● {row.growth===null?"—":percent(row.growth)}</text>
          {row.baselineStatus==="unavailable"?<text data-reference-unavailable x="12" y={y+fontSize*2.8}>Reference unavailable</text>:<text x="390" y={y+fontSize*2.8} textAnchor="end">◇ {row.referenceGrowth===null?"No 2022 base":percent(row.referenceGrowth)}</text>}
        </g>;
      })}
    </g>)}
  </svg>;
}
function GrowthPlot({data,inspect}:{data:PublicationChartData;compact?:boolean;inspect?:Inspect}) {
  const {low,high}=growthExtent(data), left=285,right=625,x=(value:number)=>left+(value-low)/(high-low)*(right-left);
  const layout=PUBLICATION_GROWTH_GROUPS.map((section,index)=>{
    const heading=38+PUBLICATION_GROWTH_GROUPS.slice(0,index).reduce((sum,item)=>sum+48+item.groups.length*48,0);
    return {section,heading,items:data.growth.filter(row=>row.table===section.table).map((row,i)=>({...row,y:heading+32+i*48}))};
  });
  const cursor=layout.at(-1)!.items.at(-1)!.y+30,height=cursor+55;
  return <svg viewBox={`0 0 860 ${height}`} role="img" aria-label="Publication growth 2022–2025 with individually matched category references" style={{fontSize:13}}>
    <title>{`Neurotech and same-category research growth; ${data.growth.filter(row=>row.baselineStatus==="unavailable").length} reference groups unavailable`}</title>
    {Array.from({length:5},(_,i)=>low+(high-low)*i/4).map(tick=><g key={tick}><line x1={x(tick)} x2={x(tick)} y1="24" y2={cursor} stroke="var(--border)"/><text x={x(tick)} y={cursor+24} textAnchor="middle">{percent(tick)}</text></g>)}
    {layout.map(({section,heading,items})=><g key={section.table}>
      <text x="8" y={heading} fontWeight="700">{section.label}</text>
      {items.map(row=><g key={row.id}>
        <text x={left-15} y={row.y+4} textAnchor="end">{row.id==="government-facility"?<><tspan x={left-15} dy="-4">Government agencies</tspan><tspan x={left-15} dy="16">and research facilities</tspan></>:short(row.group)}</text>
        <GrowthMarks row={row} x={x} y={row.y} inspect={inspect}/>
        <text x="650" y={row.y-3}>● {row.growth===null?"No 2022 base":percent(row.growth)}</text>
        {row.baselineStatus==="unavailable"?<text data-reference-unavailable x="650" y={row.y+16}>Reference unavailable</text>:<text x="650" y={row.y+16}>◇ {row.referenceGrowth===null?"No 2022 base":percent(row.referenceGrowth)}</text>}
      </g>)}
    </g>)}
    <text x="8" y={height-5}>● Neurotech · ◇ Same-category research · Units and universes vary by group</text>
  </svg>;
}
function SectorPlot({ data, compact, inspect }: { data: PublicationChartData; compact?: boolean; inspect?: Inspect }) {
  return <svg viewBox={compact?"0 0 330 330":"0 0 740 370"} role="img" aria-label="100-square researcher publication-sector waffle" style={{fontSize:13}}>
    <title>{`${number(data.totalResearchers)} researchers in ${data.authorEndYear} · squares approximate 1% each`}</title>
    {data.waffle.map((cell,i)=><rect key={i} data-publication-mark data-sector={cell.sector} x={8+(i%10)*32} y={8+Math.floor(i/10)*32} width="28" height="28" rx="3" fill={cell.color} {...pointEvents(`${cell.sector}: ${number(data.sectors.find(row=>row.sector===cell.sector)!.count)} researchers in ${data.authorEndYear}`,inspect)}/>)}
    {!compact&&data.sectors.map((row,i)=><g key={row.sector} data-publication-mark {...pointEvents(`${row.label}: ${number(row.count)} researchers, ${number(row.share)}%`,inspect)}>
      <rect x="350" y={25+i*82} width="12" height="12" rx="2" fill={row.color}/>
      <text x="375" y={37+i*82} fontWeight="700">{number(row.count)} · {number(row.share)}%</text>
      <text x="375" y={62+i*82}>{row.label}</text>
    </g>)}
  </svg>;
}
function changesSubtitle(data: PublicationChartData) {
  return `First and latest observed paper affiliations for researchers entering the two-topic cohort in 2016–${data.authorEndYear}, with at least two active publication years. Ribbon widths show people; same-sector endpoints are included.`;
}
function ChangesPlot(props: { data: PublicationChartData; compact?: boolean; inspect?: Inspect }) {
  return <PublicationSankey {...props}/>;
}
function Plot({ index, ...props }: { index:number; data:PublicationChartData; compact?:boolean; inspect?:Inspect }) {
  return index===0?<AnnualPlot {...props}/>:index===1?(props.compact?<GrowthPreview data={props.data}/>:<GrowthPlot {...props}/>):index===2?<SectorPlot {...props}/>:<ChangesPlot {...props}/>;
}
function scope(index:number,snapshot:PublicationSnapshot) {
  if(index===0) return `2010–${snapshot.source.paperEndYear} · NT10 wider paper corpus · acquired ${snapshot.source.paperAsOf}`;
  if(index===1) return `${snapshot.source.baselineYear}–${snapshot.source.paperEndYear} · matched categories · NT10 papers and P2 output`;
  return `P2 two-topic researcher cohort · acquired ${snapshot.source.authorAsOf} · ${index===2?`${snapshot.source.authorEndYear} publication affiliations`:`first/latest publication affiliations, 2016–${snapshot.source.authorEndYear}`}`;
}
export function publicationExportNotes(index:number,snapshot:PublicationSnapshot,data:PublicationChartData) {
  const notes=[scope(index,snapshot),`Source: OpenAlex core · ${snapshot.source.url}`,`Works acquired ${snapshot.source.paperAsOf}; author histories acquired ${snapshot.source.authorAsOf}; observed through ${snapshot.source.observedThrough}.`,`Method: ${snapshot.source.methodologyVersion}.`];
  if(index===0) notes.push(data.baseline.length?`Global science context acquired ${snapshot.source.scienceBaseline!.acquiredAt}. All research and the four-domain band show growth since 2022, anchored to neurotech's 2022 count; values are growth-equivalent paper counts.`:"Global science context unavailable in this acquisition.");
  if(index===1) {
    notes.push("● Neurotech; ◇ same-category research. Matched venue rows: N = NT10 wider papers; matched region/institution rows: N = P2 two-topic whole-work involvement. D = all-field works in the identical category. Count unit: OpenAlex work ID; groups overlap.","Method/BCI numerator: NT10 indexed works. Career/citation numerator: P2 author-fractional works, quarterly coverage-scaled. Their comparable references remain unavailable.");
    if(snapshot.matchedGrowth) {
      const dates=Object.values(snapshot.matchedGrowth.evidence).flatMap(e=>"retrievedAt" in e?[e.retrievedAt]:[]).sort();
      if(dates.length) notes.push(`Matched API evidence acquired ${dates[0]}–${dates.at(-1)}. Method: ${snapshot.matchedGrowth.method}.`);
    }
    for(const row of data.growth.filter(row=>row.baselineStatus==="matched")) notes.push(`${row.group}: N (${row.numeratorUniverse}) ${number(row.start)} → ${number(row.end)}, ${percent(row.growth)}; reference ${number(row.referenceStart!)} → ${number(row.referenceEnd!)}, ${percent(row.referenceGrowth)}. Unit: ${row.countUnit}. D: ${row.denominatorUniverse}.`);
  }
  if(index===2) notes.push(`Total: ${number(data.totalResearchers)} unique researchers. One sector per author from that year's papers; 100 squares use largest-remainder allocation. Exact counts: ${data.sectors.map(s=>`${s.label} ${number(s.count)} (${number(s.share)}%)`).join("; ")}.`);
  if(index===3) {
    notes.push(changesSubtitle(data), "One shared people-count scale across all four origin and destination sectors. Same-sector ribbons mean equal sectors at the first/latest observed paper; intervening changes are not measured. Employment transitions are unverified. No listed affiliation means missing paper-affiliation metadata.");
    if (data.endpointTransitions) for (const row of data.endpointTransitions) notes.push(`From ${row.label} (${number(row.total)} people): ${row.destinations.map(dest => `${dest.label} ${number(dest.count)} (${number(dest.share)}%)${dest.sector === row.from ? dest.sector === "No listed affiliation" ? " — metadata missing at both endpoints" : " — same sector at first/latest paper" : ""}`).join("; ")}.`);
    else notes.push("Complete endpoint counts unavailable in this snapshot; the archived changes-only matrix has no measured same-sector diagonal.");
  }
  return notes;
}
const tableNames=(index:number)=>index===0?["nt_yearly"]:index===1?PUBLICATION_GROWTH_GROUPS.map(section=>section.table):index===2?["nt_talent_table"]:["nt_talent_moves", "nt_talent_endpoints"];
function SourceTable({name,table}:{name:string;table:PublicationTable}) {
  return <div className="pc-table-scroll" role="region" aria-label={`${name} source values`} tabIndex={0}><table><caption>{name}</caption><thead><tr>{table.columns.map(col=><th key={col.name} scope="col">{col.name}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell===null?"—":String(cell)}</td>)}</tr>)}</tbody></table></div>;
}
function PublicationDetails({index,snapshot,data,anchor}:{index:number;snapshot:PublicationSnapshot;data:PublicationChartData;anchor:PublicationAnchor}) {
  const [inspection,setInspection]=useState("");
  const plot=useRef<HTMLDivElement>(null);
  const notes=publicationExportNotes(index,snapshot,data);
  const selected=Object.fromEntries(tableNames(index).filter(name=>snapshot.tables[name]).map(name=>[name,snapshot.tables[name]]));
  const download={chart:anchor,snapshotSchemaVersion:snapshot.schemaVersion,source:snapshot.source,tables:selected,audit:snapshot.audit,...(index===1&&snapshot.matchedGrowth?{matchedGrowth:snapshot.matchedGrowth}:{})};
  return <>
    <ChartActions anchor={anchor} title={titles[index]}><ChartShare anchor={anchor} title={titles[index]} disabled={index===3&&!data.endpointTransitions} getChart={()=>({svg:plot.current!.querySelector("svg")!,title:titles[index],anchor,notes,legend:index===0?[{label:"Neurotech papers",color:blue},...(data.baseline.length?[{label:"All research · growth equivalent",color:teal},{label:"Global science context · four-domain growth equivalent",color:gray}]:[])]:index===1?[{label:"Neurotech · filled circle",color:blue},{label:"Same-category research · outlined diamond",color:teal}]:[]})}/></ChartActions>
    <p className="publication-scope" data-change-subtitle={index===3?"":undefined}>{index===3?changesSubtitle(data):scope(index,snapshot)}</p>
    {index===0&&<p className="publication-legend"><span data-series-key="neurotech" style={{color:blue}}>● Neurotech papers</span>{data.baseline.length>0&&<><span style={{color:teal}}>● All research</span><span>■ Global science context · four-domain band</span><span>Anchored to 2022</span></>}</p>}
    {index===1&&<p className="publication-legend" data-growth-legend><span style={{color:blue}}>● Neurotech</span><span style={{color:teal}}>◇ Same-category research</span><span>Reference unavailable where a comparable baseline is missing</span></p>}
    <div ref={plot} className={`publication-full-plot publication-plot-${index}`} role="region" aria-label={`${titles[index]} scrollable plot`} tabIndex={0}><Plot index={index} data={data} inspect={setInspection}/></div>
    {index===2&&<section className="publication-sector-key" data-publication-sector-key aria-label="Researcher publication-sector key"><p>{number(data.totalResearchers)} unique researchers · {data.authorEndYear}</p><ul>{data.sectors.map(row=><li key={row.sector}><span aria-hidden="true" style={{background:row.color}}/><span>{row.label}: <strong>{number(row.count)}</strong> ({number(row.share)}%)</span></li>)}</ul></section>}
    <div className="pc-point-readout" data-publication-inspector role="status" aria-live="polite">{inspection}</div>
    <p className="pc-chart-note">Move over, focus or tap a mark to inspect its exact source values.</p>
    <section className="pc-methodology"><h4>Definition and methodology</h4>
      {notes.map(note=><p key={note}>{note}</p>)}
      {(index===0||index===1)&&<p>NT10 wider papers cover brain-computer interfaces and EEG, neural engineering, and transcranial magnetic stimulation. Seven broader OpenAlex topics qualify through selected neurotechnology and neural-context expressions. Each reconciled indexed work ID contributes once; distinct preprint and publication IDs remain distinct. Five types: articles, reviews, conference papers, book chapters and preprints.</p>}
      {index===1&&<><p>P2 covers brain-computer interfaces and EEG, and neural engineering (T10429 and T11601). Region and institution comparisons count whole works with category involvement on both sides. Groups overlap. US and Canada is the explicit two-country group; government agencies and research facilities is the government/facility union.</p><p>Method priority: invasive; ultrasound, TMS and MEG; EEG; no technique named. BCI is a separate flag. Career ages are 1–5, 6–15 and 16+ years since first publication. Citation rank uses prior-five-year citations among P2-active researchers in the current or preceding five years. Native author output splits each work across its full byline, rescales known quarterly coverage and rounds annual totals ties-to-even.</p></>}
      {index>=2&&<p>Each identified author receives one sector per active publication year. Education maps to Universities; company to Companies; government, facility, healthcare, nonprofit, archive, funder and other known types to Other institutions. No listed affiliation retains missing metadata. Known sector votes take priority; the most frequent sector wins, with alphabetical tie-breaking. Multiple affiliations use the versioned frequency and lexical tie rules.</p>}
      {index===3&&<p>The Sankey displays all four origin and destination sectors, including equal first/latest endpoint sectors, on one shared people-count scale. Eligibility requires first selected-topic publication in 2016 or later and at least two distinct active years through 2025. It compares endpoints rather than reconstructing every intermediate move. The archived nt_talent_moves table retains its original null diagonals; nt_talent_endpoints contains the complete sixteen-cell endpoint cohort.</p>}
      <ul className="pc-sources"><li><a href={snapshot.source.url} target="_blank" rel="noreferrer">OpenAlex · primary source API ↗</a></li><li><a href="https://docs.openalex.org" target="_blank" rel="noreferrer">OpenAlex data definitions ↗</a></li></ul>
      <details className="pc-provenance"><summary>Source values, coverage and provenance</summary>
        <p>Method: {snapshot.source.methodologyVersion} · method SHA-256 {snapshot.source.methodSha256}</p><p>Input aggregate source hash: {snapshot.source.sourceHash}. Latest indexed work update: {snapshot.source.worksMaxUpdatedDate??"unavailable"}; author update: {snapshot.source.authorsMaxUpdatedDate??"unavailable"}. Acquisition receipt captured {snapshot.source.capturedAt}.</p>
        {snapshot.source.testOnly&&<p>Synthetic test fixture · excluded from production loads</p>}
        {index===1&&<div className="pc-table-scroll" role="region" aria-label="Growth numerator and matched reference values" tabIndex={0}><table><caption>Plotted comparisons · 2022 → 2025</caption><thead><tr>{["Group","Neurotech N","Reference D","Unit / numerator universe","Reference universe / status"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.growth.map(row=><tr key={row.id}><th scope="row">{row.group}</th><td>{number(row.start)} → {number(row.end)} ({percent(row.growth)})</td><td>{row.baselineStatus==="matched"?`${number(row.referenceStart!)} → ${number(row.referenceEnd!)} (${percent(row.referenceGrowth)})`:"Unavailable"}</td><td>{row.countUnit} · {row.numeratorUniverse}</td><td>{row.denominatorUniverse??row.reason}</td></tr>)}</tbody></table></div>}
        {index===1&&snapshot.matchedGrowth&&<p>Matched counting method: {snapshot.matchedGrowth.method}. API receipt acquisition times: {Object.values(snapshot.matchedGrowth.evidence).flatMap(e=>"retrievedAt" in e?[e.retrievedAt]:[]).join("; ")}. Native aggregate tables below retain their separate fractional affiliation method.</p>}
        {index===3&&<p>Columns to0–to3: {PUBLICATION_SECTORS.join("; ")}.</p>}
        {Object.entries(selected).map(([name,table])=><SourceTable key={name} name={name} table={table}/>)}
        <p>Anonymous audit: wider paper cohort {number(snapshot.audit.paperCohort.works)} indexed works, 2010–2025; P2 author cohort {number(snapshot.audit.authorCohort.works)} works and {number(snapshot.audit.authorCohort.authors)} identified authors, 2000–2025. Unidentified byline slots: {number(snapshot.audit.authorCohort.unidentifiedBylineSlots)}.</p>
        {index===1&&<div className="pc-table-scroll" role="region" aria-label="Quarterly affiliation and profile coverage" tabIndex={0}><table><caption>Quarterly known coverage · native fractional output</caption><thead><tr><th scope="col">Dimension / quarter</th><th scope="col">Total</th><th scope="col">Unknown</th><th scope="col">Known share</th><th scope="col">Scale</th></tr></thead><tbody>{snapshot.audit.coverage.map(row=><tr key={`${row.dimension}:${row.year}:${row.quarter}`}><th scope="row">{row.dimension} {row.year} Q{row.quarter}</th><td>{number(row.total)}</td><td>{number(row.unknown)}</td><td>{number(row.knownShare*100)}%</td><td>{row.scale===null?"—":number(row.scale)}</td></tr>)}</tbody></table><p>Raw/scaled fractional audit rows, including omitted known groups and Unknown, are included in source JSON.</p></div>}
        <a download={`neuro-atlas-${anchor}-source.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(download,null,2))}`}>Download source JSON</a>
      </details>
    </section>
  </>;
}
function PublicationCard({index,snapshot,data}:{index:number;snapshot:PublicationSnapshot;data:PublicationChartData}) {
  const anchor=PUBLICATION_ANCHORS[index], hash=usePerformanceHash(), open=hash===`#${anchor}`, trigger=useRef<HTMLButtonElement>(null);
  return <article className="pc-card card publication-card" data-metric-tile data-performance-card={anchor} data-publication-card={anchor}>
    <div data-metric-card-body>
      <button ref={trigger} className="pc-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>navigatePerformance(anchor)}><span className="pc-card-title">{titles[index]}</span><span className="pc-coverage">{index===3?`First → latest paper affiliations · first observed 2016–${data.authorEndYear} · people`:scope(index,snapshot)}</span></button>
      <div className={`publication-preview publication-preview-${index}`} role="region" aria-label={`${titles[index]} preview${index===1?"; scroll for all groups":""}`} tabIndex={index===1?0:undefined}><button className="publication-preview-trigger" type="button" aria-label={`Enlarge ${titles[index]}`} aria-haspopup="dialog" onClick={()=>navigatePerformance(anchor)}><Plot index={index} data={data} compact/></button></div>
      {index===0&&<p className="publication-preview-note">{data.baseline.length?"Neurotech · global science context anchored to 2022":"Neurotech indexed papers · full observed years"}</p>}
      {index===1&&<p className="publication-preview-note">● Neurotech · ◇ same-category research · 21 groups; scroll for all</p>}
      {index===2&&<ul className="publication-preview-sectors">{data.sectors.map(s=><li key={s.sector}><span style={{background:s.color}}/>{s.label}: {number(s.count)} ({number(s.share)}%)</li>)}</ul>}
    </div>
    <div data-metric-card-footer><DraftChartShare anchor={anchor} label={titles[index]} className="pc-share"/></div>
    {open&&<ChartModal id={anchor} title={titles[index]} returnFocus={trigger}><PublicationDetails index={index} snapshot={snapshot} data={data} anchor={anchor}/></ChartModal>}
  </article>;
}
/** Anonymous compiled aggregates only. No network access, author records or production fallback. */
export function PublicationCharts({snapshot,query="",allowTestFixture=false}:{snapshot:PublicationSnapshot|unknown;query?:string;allowTestFixture?:boolean}) {
  const latest=usePublicationSource();
  const selected=allowTestFixture?snapshot:(latest??snapshot);
  const validated=useMemo(()=>parsePublicationSnapshot(selected,{allowTestFixture}),[selected,allowTestFixture]);
  const data=useMemo(()=>selectPublicationCharts(validated),[validated]);
  const term=query.trim().toLocaleLowerCase();
  return <>{PUBLICATION_ANCHORS.map((anchor,index)=><div key={anchor} className="metric-chart-fragment" {...metricSizingVisibility(!!term&&!JSON.stringify([titles[index],scope(index,validated),PUBLICATION_SEARCH_TEXT,index===1?data.growth:[]]).toLocaleLowerCase().includes(term))}><PublicationCard index={index} snapshot={validated} data={data}/></div>)}</>;
}
