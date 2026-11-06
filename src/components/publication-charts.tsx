"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChartModal } from "@/components/chart-modal";
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
const titles = ["Neurotech papers per year", "Publication growth by group", "Researchers by publication sector", "Publication-affiliation sector changes"];
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
const growthLabel=(row:GrowthRow)=>row.id==="bci"||row.id==="not-bci"?`${short(row.group)} (${number(row.end)} papers)`:short(row.group);
function growthInspection(row: GrowthRow) {
  const n = `${row.group}: neurotech ${number(row.start)} in 2022 → ${number(row.end)} in 2025 (${percent(row.growth)}). Unit: ${row.countUnit}; numerator universe: ${row.numeratorUniverse}; method: ${row.countingMethod}.`;
  return row.baselineStatus === "matched"
    ? `${n} Same-category reference ${number(row.referenceStart!)} → ${number(row.referenceEnd!)} (${percent(row.referenceGrowth)}). Reference universe: ${row.denominatorUniverse}. Growth gap: ${row.growthGapPercentagePoints === null ? "undefined" : `${number(row.growthGapPercentagePoints)} percentage points`}; relative share growth: ${percent(row.relativeShareGrowthPct)}.`
    : `${n} Reference unavailable. ${row.reason}`;
}
type GrowthBaseline = "science" | "matched";
const growthColors = { above: blue, within: "#98a2b3", below: "#e8a132", unavailable: "#98a2b3" };
function GrowthMarks({row,data,x,y,inspect,baseline="science"}:{row:GrowthRow;data:PublicationChartData;x:(n:number)=>number;y:number;inspect?:Inspect;baseline?:GrowthBaseline}) {
  const range=baseline==="science"?data.scienceGrowth:row.referenceGrowth===null?null:{low:row.referenceGrowth,high:row.referenceGrowth};
  const status=row.growth===null||!range?"unavailable":row.growth>range.high?"above":row.growth<range.low?"below":"within";
  const color=growthColors[status];
  const selected=baseline==="matched"?(range?`Selected category baseline: ${percent(row.referenceGrowth)}.`:"Selected baseline unavailable; no general-science fallback."):(range?`Selected science baseline: ${percent(range.low)} to ${percent(range.high)}.`:"Selected science baseline unavailable.");
  const inspection=`${growthInspection(row)} ${selected}`;
  return <g data-publication-mark data-growth-row={row.id} data-group={row.group} data-value={row.growth ?? "unavailable"} data-baseline-status={status} {...pointEvents(inspection,inspect)}>
    <title>{inspection}</title>
    {baseline==="matched"&&row.referenceGrowth!==null&&<line data-growth-reference-tick data-value={row.referenceGrowth} x1={x(row.referenceGrowth)} x2={x(row.referenceGrowth)} y1={y-10} y2={y+10} stroke={gray} strokeWidth="3"><title>{`Category baseline: ${percent(row.referenceGrowth)}`}</title></line>}
    {row.growth===null?<text data-growth-label="neurotech" x={x(0)+12} y={y} dominantBaseline="middle">No 2022 base</text>:<>
      <line data-growth-stem="neurotech" x1={x(0)} x2={x(row.growth)} y1={y} y2={y} stroke={color} strokeWidth="2"/>
      <circle data-growth-series="neurotech" data-reference-unavailable={!range?"":undefined} cx={x(row.growth)} cy={y} r="5" fill={status==="unavailable"?"var(--surface)":color} stroke={status==="unavailable"?color:"var(--surface)"} strokeWidth="1.5"/>
      <text data-growth-label="neurotech" x={x(row.growth)+12} y={y} dominantBaseline="middle" fontWeight="600" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke" style={{fill:color}}>{percent(row.growth)}</text>
    </>}
  </g>;
}
function growthExtent(data:PublicationChartData,baseline:GrowthBaseline="science") {
  const values=[...data.growth.flatMap(row=>[row.growth,...(baseline==="matched"?[row.referenceGrowth]:[])]),data.neurotechGrowth,...(baseline==="science"&&data.scienceGrowth?[data.scienceGrowth.low,data.scienceGrowth.high]:[])].filter((value):value is number=>value!==null);
  return {low:Math.floor(Math.min(0,...values)/25)*25,high:Math.ceil(Math.max(50,...values)/25)*25};
}
function growthTicks(low:number,high:number) {
  const step=high-low>100?50:25;
  return Array.from({length:Math.floor(high/step)-Math.ceil(low/step)+1},(_,i)=>(Math.ceil(low/step)+i)*step);
}
function GrowthContext({data,x,top,bottom,baseline="science",fontSize=14.5}:{data:PublicationChartData;x:(n:number)=>number;top:number;bottom:number;baseline?:GrowthBaseline;fontSize?:number}) {
  return <g>
    {baseline==="science"&&data.scienceGrowth&&<>
      <rect data-science-context data-low={data.scienceGrowth.low} data-high={data.scienceGrowth.high} x={x(data.scienceGrowth.low)} y={top} width={x(data.scienceGrowth.high)-x(data.scienceGrowth.low)} height={bottom-top} fill={gray} fillOpacity=".28"><title>{`All-science context: four-domain growth range ${percent(data.scienceGrowth.low)} to ${percent(data.scienceGrowth.high)}; independently acquired global context`}</title></rect>
      <text data-growth-science-label x={x(data.scienceGrowth.low)+(x(data.scienceGrowth.high)-x(data.scienceGrowth.low))/2} y={top-fontSize*.55} textAnchor="middle" fontWeight="600" style={{fill:"var(--muted)"}}>Science baseline</text>
    </>}
    {data.neurotechGrowth!==null&&<line data-neurotech-average data-value={data.neurotechGrowth} x1={x(data.neurotechGrowth)} x2={x(data.neurotechGrowth)} y1={top} y2={bottom} stroke="var(--foreground)" strokeWidth="1.5" strokeDasharray="5 5"><title>{`All neurotech: ${percent(data.neurotechGrowth)}; NT10 wider paper corpus`}</title></line>}
  </g>;
}
function GrowthLegend({fontSize,compact=false,unavailable=false,matched=false}:{fontSize:number;compact?:boolean;unavailable?:boolean;matched?:boolean}) {
  const entries=[{status:"above" as const,label:compact?"Above":"Above baseline"},{status:"within" as const,label:"Within"},{status:"below" as const,label:"Below"},...(unavailable?[{status:"unavailable" as const,label:"Baseline unavailable"}]:[])];
  return <g data-growth-legend aria-label="Chart legend">
    {entries.map(({status,label},i)=>{
      const x=compact?(i===3?8:8+i*fontSize*8):[8,198,300,400][i],y=fontSize*(5.1+(compact&&i===3?1.5:0));
      return <g key={status}><circle data-growth-legend-swatch={status} cx={x+5} cy={y-4} r="5.5" fill={status==="unavailable"?"var(--surface)":growthColors[status]} stroke={status==="unavailable"?growthColors[status]:"none"} strokeWidth="1.5"/><text x={x+18} y={y}>{label}</text></g>;
    })}
    {matched&&<g data-growth-reference-key><line x1="630" x2="630" y1={fontSize*5.1-12} y2={fontSize*5.1+2} stroke={gray} strokeWidth="3"/><text x="644" y={fontSize*5.1}>Category baseline</text></g>}
  </g>;
}
function GrowthAxis({data,x,low,high,fontSize=14.5,y=0,compact=false,baseline="science"}:{data:PublicationChartData;x:(n:number)=>number;low:number;high:number;fontSize?:number;y?:number;compact?:boolean;baseline?:GrowthBaseline}) {
  const unavailable=baseline==="matched"?data.growth.some(row=>row.referenceGrowth===null):!data.scienceGrowth;
  const totalX=data.neurotechGrowth===null?8:x(data.neurotechGrowth);
  return <g data-growth-axis transform={`translate(0 ${y})`}>
    <title>Growth, 2022–2025</title>
    {growthTicks(low,high).map(tick=><g key={tick}>
      <line x1={x(tick)} x2={x(tick)} y1="0" y2={fontSize*.45} stroke="var(--border)"/>
      <text data-growth-tick x={x(tick)} y={fontSize*1.65} textAnchor="middle" style={{fill:"var(--muted)"}}>{percent(tick)}</text>
    </g>)}
    <text data-growth-total-label x={data.neurotechGrowth===null?8:compact?Math.max(fontSize*5.3,Math.min(400-fontSize*5.3,totalX)):totalX} y={fontSize*3.3} textAnchor={data.neurotechGrowth===null?"start":"middle"} fontWeight="700">{data.neurotechGrowth===null?"All neurotech: no 2022 base":`All neurotech ${percent(data.neurotechGrowth)}`}</text>
    <GrowthLegend fontSize={fontSize} compact={compact} unavailable={unavailable} matched={baseline==="matched"}/>
  </g>;
}
function GrowthPreview({data}:{data:PublicationChartData}) {
  const {ref,fontSize}=usePreviewFont(400,true);
  const {low,high}=growthExtent(data),x=(value:number)=>12+(value-low)/(high-low)*(376-fontSize*5);
  const sections=PUBLICATION_GROWTH_GROUPS.map((section,index)=>({section,heading:fontSize*3.2+PUBLICATION_GROWTH_GROUPS.slice(0,index).reduce((total,item)=>total+(item.groups.length*3.6+2.4)*fontSize,0)}));
  const cursor=sections.at(-1)!.heading+(2+3*3.6)*fontSize,footer=fontSize*(data.scienceGrowth?6.5:8),height=cursor+footer;
  return <span className="publication-growth-preview-canvas">
    <svg ref={ref} viewBox={`0 0 400 ${height}`} role="img" aria-label="21 growth groups; neurotech, global science baseline and all-neurotech growth; scroll vertically" style={{fontSize}}>
      <GrowthContext data={data} x={x} top={fontSize*1.5} bottom={cursor} fontSize={fontSize}/>
      {sections.map(({section,heading})=><g key={section.table}>
        <text data-growth-section x="8" y={heading} fontWeight="700" style={{fill:"var(--muted)"}}>{section.label.toUpperCase()}</text>
        {data.growth.filter(row=>row.table===section.table).map((row,index)=>{
          const y=heading+(1.6+index*3.6)*fontSize;
          return <g key={row.id}>
            <text x="8" y={y}>{row.id==="government-facility"?"Government / research facilities":growthLabel(row).replace("Ultrasound, TMS and MEG","Ultrasound, TMS, MEG")}</text>
            <GrowthMarks row={row} data={data} x={x} y={y+fontSize*1.2}/>
          </g>;
        })}
      </g>)}
      <GrowthAxis data={data} x={x} low={low} high={high} fontSize={fontSize} y={cursor} compact/>
    </svg>
    <span className="publication-growth-sticky-axis" data-growth-sticky-axis data-export-exclude aria-hidden="true" style={{marginTop:`${-footer/400*100}%`}}>
      <svg viewBox={`0 0 400 ${footer}`} focusable="false" style={{fontSize}}><GrowthAxis data={data} x={x} low={low} high={high} fontSize={fontSize} compact/></svg>
    </span>
  </span>;
}
function GrowthPlot({data,inspect,baseline="science"}:{data:PublicationChartData;inspect?:Inspect;baseline?:GrowthBaseline}) {
  const {low,high}=growthExtent(data,baseline),left=280,right=740,x=(value:number)=>left+(value-low)/(high-low)*(right-left);
  const rowHeight=32,fontSize=14.5,footer=100;
  const layout=PUBLICATION_GROWTH_GROUPS.map((section,index)=>{
    const heading=48+PUBLICATION_GROWTH_GROUPS.slice(0,index).reduce((sum,item)=>sum+36+item.groups.length*rowHeight,0);
    return {section,heading,items:data.growth.filter(row=>row.table===section.table).map((row,i)=>({...row,y:heading+30+i*rowHeight}))};
  });
  const cursor=layout.at(-1)!.items.at(-1)!.y+18,height=cursor+footer;
  return <div className="publication-growth-canvas">
    <svg data-growth-export data-baseline-mode={baseline} viewBox={`0 0 820 ${height}`} role="img" aria-label={`Publication growth 2022–2025; ${baseline==="science"?"general science baseline":"category-specific baselines; unavailable comparisons shown as hollow dots"}; all-neurotech growth`} style={{fontSize}}>
      <title>{`Neurotech publication growth; ${baseline==="science"?"general science baseline":"matched category baselines"}`}</title>
      <GrowthContext data={data} x={x} top={28} bottom={cursor} baseline={baseline}/>
      {growthTicks(low,high).map(tick=><line key={tick} x1={x(tick)} x2={x(tick)} y1="28" y2={cursor} stroke="var(--border)"/>)}
      {layout.map(({section,heading,items})=><g key={section.table}>
        <text data-growth-section x="8" y={heading} fontWeight="700" letterSpacing="1" style={{fill:"var(--muted)"}}>{section.label.toUpperCase()}</text>
        {items.map(row=><g key={row.id}>
          <text data-growth-name x={left-15} y={row.y+4} textAnchor="end">{row.id==="government-facility"?<><tspan x={left-15} dy="-4">Government agencies</tspan><tspan x={left-15} dy="16">and research facilities</tspan></>:growthLabel(row)}</text>
          <GrowthMarks row={row} data={data} x={x} y={row.y} inspect={inspect} baseline={baseline}/>
        </g>)}
      </g>)}
      <GrowthAxis data={data} x={x} low={low} high={high} y={cursor} baseline={baseline}/>
    </svg>
    <div className="publication-growth-sticky-axis" data-growth-sticky-axis data-export-exclude aria-hidden="true" style={{marginTop:`${-footer/820*100}%`}}>
      <svg viewBox={`0 0 820 ${footer}`} focusable="false" style={{fontSize}}><GrowthAxis data={data} x={x} low={low} high={high} baseline={baseline}/></svg>
    </div>
  </div>;
}
/** Reserve space from the plot's actual top, including wrapped modal controls. */
function useGrowthViewport(ref:React.RefObject<HTMLDivElement|null>,enabled:boolean) {
  useLayoutEffect(()=>{
    if(!enabled||!ref.current)return;
    const plot=ref.current,view=plot.ownerDocument.defaultView!;
    const update=()=>{
      const viewportHeight=view.visualViewport?.height??view.innerHeight;
      const top=Math.max(0,plot.getBoundingClientRect().top);
      plot.style.setProperty("--publication-growth-max-height",`${Math.max(96,Math.floor(Math.min(viewportHeight*.68,viewportHeight-top-24)))}px`);
    };
    update();
    // Native showModal and category reveal run after this component's layout effect.
    const frame=view.requestAnimationFrame(update);
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(update):null;
    const detail=plot.closest(".pc-detail"),header=plot.closest("dialog")?.querySelector(".pc-modal-header");
    if(detail)observer?.observe(detail);
    if(header)observer?.observe(header);
    view.addEventListener("resize",update);
    view.visualViewport?.addEventListener("resize",update);
    return ()=>{view.cancelAnimationFrame(frame);observer?.disconnect();view.removeEventListener("resize",update);view.visualViewport?.removeEventListener("resize",update);};
  },[ref,enabled]);
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
function ChangesPreview({data}:{data:PublicationChartData}) {
  const {ref,fontSize}=usePreviewFont(400,true);
  const block=fontSize*6.5;
  return <svg ref={ref} viewBox={`0 0 400 ${block*2+fontSize}`} role="img" aria-label="First-to-latest publication affiliation changes, normalized by origin sector" style={{fontSize}}>
    {data.transitions.map((row,index)=><g key={row.from}>
      <text x="12" y={fontSize*1.7+index*block} fontWeight="700">From {row.label.toLowerCase()}</text>
      <text x="12" y={fontSize*3.1+index*block}>{number(row.total)} people · 100% of row</text>
      {row.destinations.filter(dest=>dest.count>0).map(dest=><rect key={dest.sector} data-publication-mark data-from={row.from} data-to={dest.sector} data-value={dest.count} x={12+dest.offset*3.76} y={fontSize*4+index*block} width={dest.share*3.76} height={fontSize*1.5} fill={dest.color} stroke="var(--surface)"/>)}
    </g>)}
  </svg>;
}
function ChangesPlot({ data, compact, inspect }: { data: PublicationChartData; compact?: boolean; inspect?: Inspect }) {
  const width = compact?400:740, left=12, usable=width-24, block=compact?105:185;
  return <svg viewBox={`0 0 ${width} ${block*2+25}`} role="img" aria-label="Normalized first-to-latest publication-affiliation sector changes" style={{fontSize:compact?12:13}}>
    <title>First and latest observed neurotech publication affiliations, first papers since 2016; different-sector cohort</title>
    {data.transitions.map((row,i)=><g key={row.from}>
      <text x={left} y={22+i*block} fontWeight="700">From {row.label.toLowerCase()}</text><text x={width-left} y={22+i*block} textAnchor="end">{number(row.total)} people</text>
      {row.total===0?<text x={left} y={60+i*block}>No observed sector changes</text>:row.destinations.filter(d=>d.count>0).map(dest=><rect key={dest.sector} data-publication-mark data-from={row.from} data-to={dest.sector} data-value={dest.count} x={left+dest.offset/100*usable} y={37+i*block} width={dest.share/100*usable} height="36" fill={dest.color} stroke="var(--surface)" {...pointEvents(`${row.label} → ${dest.label}: ${number(dest.count)} of ${number(row.total)} people (${number(dest.share)}%). First/latest publication affiliations.`,inspect)}/>)}
      {!compact&&row.destinations.map((dest,j)=><g key={dest.sector}><rect x={left} y={89+i*block+j*25} width="10" height="10" fill={dest.color}/><text x={left+18} y={99+i*block+j*25}>{dest.label}: {number(dest.count)} ({number(dest.share)}%)</text></g>)}
      {compact&&<text x={left} y={96+i*block}>Latest observed publication affiliation · 100% per row</text>}
    </g>)}
  </svg>;
}
function Plot({ index, ...props }: { index:number; data:PublicationChartData; compact?:boolean; inspect?:Inspect; baseline?:GrowthBaseline }) {
  return index===0?<AnnualPlot {...props}/>:index===1?(props.compact?<GrowthPreview data={props.data}/>:<GrowthPlot {...props}/>):index===2?<SectorPlot {...props}/>:props.compact?<ChangesPreview data={props.data}/>:<ChangesPlot {...props}/>;
}
function scope(index:number,snapshot:PublicationSnapshot) {
  if(index===0) return `2010–${snapshot.source.paperEndYear} · NT10 wider paper corpus · acquired ${snapshot.source.paperAsOf}`;
  if(index===1) return `${snapshot.source.baselineYear}–${snapshot.source.paperEndYear} · NT10 papers and P2 output · units vary by group`;
  return `P2 two-topic researcher cohort · acquired ${snapshot.source.authorAsOf} · ${index===2?`${snapshot.source.authorEndYear} publication affiliations`:`first/latest publication affiliations, 2016–${snapshot.source.authorEndYear}`}`;
}
export function publicationExportNotes(index:number,snapshot:PublicationSnapshot,data:PublicationChartData,baseline:GrowthBaseline="science") {
  const notes=[scope(index,snapshot),`Source: OpenAlex core · ${snapshot.source.url}`,`Works acquired ${snapshot.source.paperAsOf}; author histories acquired ${snapshot.source.authorAsOf}; observed through ${snapshot.source.observedThrough}.`,`Method: ${snapshot.source.methodologyVersion}.`];
  if(index===0) notes.push(data.baseline.length?`Global science context acquired ${snapshot.source.scienceBaseline!.acquiredAt}. All research and the four-domain band show growth since 2022, anchored to neurotech's 2022 count; values are growth-equivalent paper counts.`:"Global science context unavailable in this acquisition.");
  if(index===1) {
    const available=data.growth.filter(row=>row.referenceGrowth!==null).length;
    notes.push(`Selected comparison baseline: ${baseline==="science"?"General science. The gray band is the four-domain growth range.":"Matched to each group. Each gray tick is that row’s category-specific growth threshold; hollow dots have no usable baseline and never fall back to general science. Exact equality is within; no tolerance interval is applied."}`,`${available} same-category comparisons available; ${data.growth.length-available} unavailable. Category-specific denominators are preserved.`,data.scienceGrowth?`All-science context${baseline==="matched"?" (not selected)":""}: four-domain growth range ${percent(data.scienceGrowth.low)} to ${percent(data.scienceGrowth.high)}; acquired ${snapshot.source.scienceBaseline!.acquiredAt}. Global context across groups; row numerator universes and count units vary.`:"Global science context unavailable in this acquisition.",`All neurotech: ${percent(data.neurotechGrowth)}; total growth in the NT10 wider paper corpus, 2022–2025.`);
    notes.push("Matched venue rows: N = NT10 wider papers; matched region/institution rows: N = P2 two-topic whole-work involvement. D = all-field works in the identical category. Count unit: OpenAlex work ID; groups overlap.","Method/BCI numerator: NT10 indexed works. Career/citation numerator: P2 author-fractional works, quarterly coverage-scaled. Their comparable references remain unavailable.");
    if(snapshot.matchedGrowth) {
      const dates=Object.values(snapshot.matchedGrowth.evidence).flatMap(e=>"retrievedAt" in e?[e.retrievedAt]:[]).sort();
      if(dates.length) notes.push(`Matched API evidence acquired ${dates[0]}–${dates.at(-1)}. Method: ${snapshot.matchedGrowth.method}.`);
    }
    for(const row of data.growth.filter(row=>row.baselineStatus==="matched")) notes.push(`${row.group}: N (${row.numeratorUniverse}) ${number(row.start)} → ${number(row.end)}, ${percent(row.growth)}; reference ${number(row.referenceStart!)} → ${number(row.referenceEnd!)}, ${percent(row.referenceGrowth)}. Unit: ${row.countUnit}. D: ${row.denominatorUniverse}.`);
  }
  if(index===2) notes.push(`Total: ${number(data.totalResearchers)} unique researchers. One sector per author from that year's papers; 100 squares use largest-remainder allocation. Exact counts: ${data.sectors.map(s=>`${s.label} ${number(s.count)} (${number(s.share)}%)`).join("; ")}.`);
  if(index===3) notes.push("Different first/latest publication-affiliation sectors; first selected-topic papers since 2016. Each displayed origin is normalized to 100%. Employment transitions are unverified. No listed affiliation is retained.");
  return notes;
}
const tableNames=(index:number)=>index===0?["nt_yearly"]:index===1?["nt_yearly",...PUBLICATION_GROWTH_GROUPS.map(section=>section.table)]:index===2?["nt_talent_table"]:["nt_talent_moves"];
function SourceTable({name,table}:{name:string;table:PublicationTable}) {
  return <div className="pc-table-scroll" role="region" aria-label={`${name} source values`} tabIndex={0}><table><caption>{name}</caption><thead><tr>{table.columns.map(col=><th key={col.name} scope="col">{col.name}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell===null?"—":String(cell)}</td>)}</tr>)}</tbody></table></div>;
}
function PublicationDetails({index,snapshot,data,anchor}:{index:number;snapshot:PublicationSnapshot;data:PublicationChartData;anchor:PublicationAnchor}) {
  const [inspection,setInspection]=useState("");
  const [baseline,setBaseline]=useState<GrowthBaseline>("science");
  const available=data.growth.filter(row=>row.referenceGrowth!==null).length;
  const plot=useRef<HTMLDivElement>(null);
  useGrowthViewport(plot,index===1);
  const notes=publicationExportNotes(index,snapshot,data,baseline);
  const selected=Object.fromEntries(tableNames(index).map(name=>[name,snapshot.tables[name]]));
  const download={chart:anchor,snapshotSchemaVersion:snapshot.schemaVersion,source:snapshot.source,tables:selected,audit:snapshot.audit,...(index===1&&snapshot.matchedGrowth?{matchedGrowth:snapshot.matchedGrowth}:{})};
  return <>
    <ChartActions anchor={anchor} title={titles[index]}><ChartShare anchor={anchor} title={titles[index]} getChart={()=>({svg:plot.current!.querySelector("svg")!,title:titles[index],anchor,notes,legend:index===0?[{label:"Neurotech papers",color:blue},...(data.baseline.length?[{label:"All research · growth equivalent",color:teal},{label:"Global science context · four-domain growth equivalent",color:gray}]:[])]:[]})}/></ChartActions>
    <p className="publication-scope">{scope(index,snapshot)}</p>
    {index===3&&<p className="publication-scope">Different-sector publication-affiliation cohort · employment transitions unverified</p>}
    {index===0&&<p className="publication-legend"><span data-series-key="neurotech" style={{color:blue}}>● Neurotech papers</span>{data.baseline.length>0&&<><span style={{color:teal}}>● All research</span><span>■ Global science context · four-domain band</span><span>Anchored to 2022</span></>}</p>}
    {index===1&&<>
      <label className="publication-growth-options">Comparison baseline<select data-growth-baseline value={baseline} onChange={event=>setBaseline(event.target.value as GrowthBaseline)}><option value="science">General science</option><option value="matched">Matched to each group ({available} available)</option></select></label>
      {baseline==="matched"&&<p className="publication-scope" data-growth-coverage>{available} category baselines available; {data.growth.length-available} unavailable (hollow dots). Gray ticks mark each group’s baseline; no general-science fallback.</p>}
    </>}
    <div ref={plot} className={`publication-full-plot publication-plot-${index}`} role="region" aria-label={`${titles[index]} scrollable plot`} tabIndex={0}><Plot index={index} data={data} inspect={setInspection} baseline={baseline}/></div>
    {index===2&&<section className="publication-sector-key" data-publication-sector-key aria-label="Researcher publication-sector key"><p>{number(data.totalResearchers)} unique researchers · {data.authorEndYear}</p><ul>{data.sectors.map(row=><li key={row.sector}><span aria-hidden="true" style={{background:row.color}}/><span>{row.label}: <strong>{number(row.count)}</strong> ({number(row.share)}%)</span></li>)}</ul></section>}
    <div className="pc-point-readout" data-publication-inspector role="status" aria-live="polite">{inspection}</div>
    <p className="pc-chart-note">Move over, focus or tap a mark to inspect its exact source values.</p>
    <section className="pc-methodology"><h4>Definition and methodology</h4>
      {notes.map(note=><p key={note}>{note}</p>)}
      {(index===0||index===1)&&<p>NT10 wider papers cover brain-computer interfaces and EEG, neural engineering, and transcranial magnetic stimulation. Seven broader OpenAlex topics qualify through selected neurotechnology and neural-context expressions. Each reconciled indexed work ID contributes once; distinct preprint and publication IDs remain distinct. Five types: articles, reviews, conference papers, book chapters and preprints.</p>}
      {index===1&&<><p>P2 covers brain-computer interfaces and EEG, and neural engineering (T10429 and T11601). Region and institution comparisons count whole works with category involvement on both sides. Groups overlap. US and Canada is the explicit two-country group; government agencies and research facilities is the government/facility union.</p><p>Method priority: invasive; ultrasound, TMS and MEG; EEG; no technique named. BCI is a separate flag. Career ages are 1–5, 6–15 and 16+ years since first publication. Citation rank uses prior-five-year citations among P2-active researchers in the current or preceding five years. Native author output splits each work across its full byline, rescales known quarterly coverage and rounds annual totals ties-to-even.</p></>}
      {index>=2&&<p>Each identified author receives one sector per active publication year. Education maps to Universities; company to Companies; government, facility, healthcare, nonprofit, archive, funder and other known types to Other institutions. No listed affiliation retains missing metadata. Known sector votes take priority; the most frequent sector wins, with alphabetical tie-breaking. Multiple affiliations use the versioned frequency and lexical tie rules.</p>}
      {index===3&&<p>The plot displays university and company origins; source values preserve all four origins and twelve different-sector cells. First/latest observations require distinct active years. Same-sector diagonals are null. Sector changes describe publication affiliations across the observed 2000–2025 P2 history, with entrant cohorts starting in 2016.</p>}
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
      <button ref={trigger} className="pc-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>navigatePerformance(anchor)}><span className="pc-card-title">{titles[index]}</span><span className="pc-coverage">{scope(index,snapshot)}</span></button>
      <div className={`publication-preview publication-preview-${index}`} role="region" aria-label={`${titles[index]} preview${index===1?"; scroll for all groups":""}`} tabIndex={index===1?0:undefined}><button className="publication-preview-trigger" type="button" aria-label={`Enlarge ${titles[index]}`} aria-haspopup="dialog" onClick={()=>navigatePerformance(anchor)}><Plot index={index} data={data} compact/></button></div>
      {index===0&&<p className="publication-preview-note">{data.baseline.length?"Neurotech · global science context anchored to 2022":"Neurotech indexed papers · full observed years"}</p>}
      {index===1&&<p className="publication-preview-note">● Neurotech · gray science context · dashed all neurotech · 21 groups; scroll for all</p>}
      {index===2&&<ul className="publication-preview-sectors">{data.sectors.map(s=><li key={s.sector}><span style={{background:s.color}}/>{s.label}: {number(s.count)} ({number(s.share)}%)</li>)}</ul>}
      {index===3&&<p className="publication-preview-note">First and latest observed publication affiliations · employment transitions unverified</p>}
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
