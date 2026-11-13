"use client";

import { canonicalPerformanceAnchor } from "@/data/field-velocity-links";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChartModal } from "@/components/chart-modal";
import { PublicationSankey } from "@/components/publication-sankey";
import { ChartActions } from "@/components/chart-actions";
import { ChartShare } from "@/components/chart-share";
import { DraftChartShare } from "@/components/draft-chart-share";
import { usePerformanceHash, navigatePerformance } from "@/lib/field-velocity/navigation";
import { usePreviewFont } from "@/components/use-preview-font";
import { useMetricPreviewSpace } from "@/components/use-metric-preview-space";
import { PointTooltip, usePointTooltip } from "@/components/point-source-tooltip";
import { ChartYearGuides, annualYears } from "@/components/chart-year-guides";
import { CHART_PRESENTATION } from "@/lib/chart-presentation";
import { metricSizingVisibility } from "@/components/metric-sizing-visibility";
import { usePublicationSource } from "@/components/publication-source-provider";
import { parsePublicationSnapshot, selectPublicationCharts, PUBLICATION_ANCHORS, PUBLICATION_GROWTH_GROUPS, PUBLICATION_SECTORS, type PublicationSnapshot, type PublicationAnchor, type PublicationChartData, type PublicationTable } from "@/lib/publication-data";
import { MetricCardScope } from "@/components/metric-card-scope";
import { useChartMeasure } from "@/components/chart-measure";
import { ModalData, ModalReading, ModalSources } from "@/components/chart-modal-slots";
import { CardPngButton } from "@/components/card-png-button";
import { useCardExporting } from "@/lib/field-velocity/card-export";

const number = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
const percent = (n: number | null) => n === null ? "No 2022 denominator" : `${n > 0 ? "+" : ""}${number(n)}%`;
const titles = ["Neurotech papers per year", "Publication growth by group", "Researchers by publication sector", "Researchers’ first and latest affiliations"];
export const PUBLICATION_SEARCH_TEXT = `${titles.join(" ")} publication papers output science baseline OpenAlex bioRxiv growth method brain-computer interface BCI venue region institution career citation researchers sectors universities companies hospitals labs nonprofits first latest affiliation changes`;
const blue = "#115ef7", teal = "#138a7a", gray = "#a6b0bf";
const short = (s: string) => s.replace(/ \(.*\)$/, "");
type Inspect = (text: string) => ReturnType<ReturnType<typeof usePointTooltip<string>>["pointProps"]>;
/** Real movement, keyboard focus and touch/click select points; a stationary pointer never preselects. */
function pointEvents(label: string, inspect?: Inspect) {
  return inspect ? { tabIndex: 0, role: "button", "aria-label": label, ...inspect(label) } : {};
}
const annualScienceAvailable = (data: PublicationChartData) => data.baseline.length > 0 && data.annual.some(row => row.year === 2022 && row.papers > 0);
function AnnualPlot({ data, compact, inspect, activeInspection, previewHeight }: { data: PublicationChartData; compact?: boolean; inspect?: Inspect; activeInspection?: string | null; previewHeight?: number }) {
  const selectedYear = activeInspection ? Number(activeInspection.slice(0, 4)) : null;
  const { ref, fontSize, unitsPerPixel } = usePreviewFont(840, true);
  const radius = (compact ? CHART_PRESENTATION.previewRadius : CHART_PRESENTATION.expandedRadius) * unitsPerPixel;
  const left = compact ? fontSize * 3.6 + 12 : 80, right = compact ? 840 - fontSize * 2.2 - 12 : 760, top = fontSize * (compact ? 4.4 : 3.2), bottom = compact ? Math.max(top + fontSize * 9, (previewHeight ?? 0) * unitsPerPixel - fontSize * 4.2) : 280;
  const anchor = data.annual.find(row => row.year === 2022)!.papers;
  const hasScience = annualScienceAvailable(data);
  const max = Math.max(1, ...data.annual.map(row => row.papers), ...(hasScience ? data.baseline.flatMap(row => [row.all, row.high]) : []));
  const magnitude = 10 ** Math.floor(Math.log10(max / 4));
  const step = Math.max(1, Math.ceil(max / 4 / magnitude) * magnitude), ceiling = step * 4;
  const x = (year: number) => left + (year - 2010) / 15 * (right - left);
  const y = (value: number) => bottom - value / ceiling * (bottom - top);
  const index = (equivalent: number) => equivalent / anchor * 100;
  // Both axes use one paper-count extent. Index 100 is exactly the actual 2022 height.
  const scienceY = (value: number) => y(value / 100 * anchor);
  const indexRange = hasScience ? index(ceiling) : 100;
  const indexMagnitude = 10 ** Math.floor(Math.log10(indexRange / 4));
  const indexStep = [1,2,5,10].find(factor => factor * indexMagnitude >= indexRange / 4)! * indexMagnitude;
  const indexTicks = hasScience ? Array.from({length:Math.floor(indexRange/indexStep)+1},(_,i)=>i*indexStep) : [];
  const line = (rows: {year: number; value: number}[], project = y) => rows.map(row => `${x(row.year)},${project(row.value)}`).join(" ");
  const scienceAt = (year: number) => hasScience ? data.baseline.find(row => row.year === year) : undefined;
  const inspection = (year: number) => {
    const actual = data.annual.find(row => row.year === year)!, science = scienceAt(year);
    return `${year}: Neurotech papers ${number(actual.papers)}; ${science ? `All research index ${number(index(science.all))}; Four-domain index band ${number(index(science.low))}–${number(index(science.high))} (2022 = 100).` : "Science index unavailable for this year."}`;
  };
  const yearEvents = (year: number) => {
    const events = inspect?.(inspection(year));
    return { ...pointEvents(inspection(year), inspect), onPointerMove: (event: React.PointerEvent<SVGElement>) => {
      if (event.movementX || event.movementY) events?.onMouseMove(event);
    }};
  };
  const selected = data.annual.find(row => row.year === selectedYear);
  const measure = useChartMeasure({ svgRef: ref, enabled: !compact, annual: true, unit: " papers", frame: { left, right, top, bottom },
    series: [{ id: "neurotech", name: "Neurotech papers", color: blue, points: data.annual.map(row => ({ x: x(row.year), y: y(row.papers), value: row.papers, year: row.year, label: String(row.year) })) }] });
  return <><svg ref={ref} data-export-font-size={CHART_PRESENTATION.labelFontSize} viewBox={`0 0 840 ${bottom + fontSize * 4.2}`} role="img" aria-label={hasScience ? "Annual neurotech paper counts and science index, 2022 = 100, on locked axes" : "Annual neurotech indexed papers, 2010–2025"} style={{ fontSize }}>
    <title>{hasScience ? "Neurotech papers, 2010–2025; science index anchored to the actual 2022 count" : "Neurotech papers, 2010–2025"}</title>
    <g data-annual-axis-titles>
    <text data-annual-axis="neurotech" x={0} y={fontSize * 1.5} fill={blue} style={{fill:blue}}>{compact ? "Papers" : "Neurotech papers"}</text>
    {hasScience && <><text data-annual-axis="science" x={compact ? 840 : right} y={fontSize * 1.5} textAnchor="end" fill={teal} style={{fill:teal}}>{compact ? "Science index" : "Science index · 2022 = 100"}</text>{compact && <text data-annual-index-unit x={840} y={fontSize * 2.8} textAnchor="end" style={{fill:teal}}>2022 = 100</text>}</>}
    </g>
    <ChartYearGuides years={annualYears(2010, 2025)} x={x} top={top} bottom={bottom} />
    {[0,1,2,3,4].map(i => <g key={i}><line x1={left} x2={right} y1={y(i*step)} y2={y(i*step)} stroke="var(--border)"/><text data-annual-paper-tick={i*step} x={left-12} y={y(i*step)+4} textAnchor="end" style={{fill:blue}}>{number(i*step)}</text></g>)}
    {indexTicks.map(tick=><text key={tick} data-annual-index-tick={tick} x={right+12} y={scienceY(tick)+4} style={{fill:teal}}>{number(tick)}</text>)}
    {hasScience && <polygon data-science-context fill={gray} fillOpacity=".3" points={[...data.baseline.map(row => `${x(row.year)},${scienceY(index(row.high))}`), ...[...data.baseline].reverse().map(row => `${x(row.year)},${scienceY(index(row.low))}`)].join(" ")}/>}
    {hasScience && <polyline data-science-context fill="none" stroke={teal} strokeWidth="3" points={line(data.baseline.map(row => ({year:row.year,value:index(row.all)})), scienceY)}/>}
    <polyline fill="none" stroke={blue} strokeWidth="3" points={line(data.annual.map(row => ({year:row.year,value:row.papers})))}/>
    {data.annual.map(row => <circle key={row.year} data-publication-mark data-year={row.year} data-value={row.papers} cx={x(row.year)} cy={y(row.papers)} data-export-r={CHART_PRESENTATION.expandedRadius} r={radius} fill={blue} {...yearEvents(row.year)}/>)}
    {inspect && hasScience && data.baseline.map(row => <circle key={row.year} data-publication-mark data-science-year={row.year} cx={x(row.year)} cy={scienceY(index(row.all))} data-export-r={CHART_PRESENTATION.expandedRadius} r={radius} fill={teal} {...yearEvents(row.year)}/>)}
    {(compact?[2010,2025]:[2010,2013,2016,2019,2022,2025]).map(year => <text key={year} x={x(year)} y={bottom+fontSize*1.6} textAnchor={year===2010?"start":year===2025?"end":"middle"}>{year}</text>)}
    {hasScience && <g data-annual-anchor pointerEvents="none"><circle cx={x(2022)} cy={y(anchor)} r="8" fill="none" stroke="var(--foreground)" strokeWidth="1.5"/><text x={(left+right)/2} y={bottom+fontSize*3.3} textAnchor="middle">{compact ? "2022 anchor · index 100" : `2022 anchor · ${number(anchor)} papers = science index 100`}</text></g>}
    {inspect && data.annual.map(row => <rect key={row.year} data-annual-year-target={row.year} aria-hidden="true" x={Math.max(left,x(row.year)-(right-left)/30)} y={top} width={(right-left)/(row.year===2010||row.year===2025?30:15)} height={bottom-top} fill="transparent" {...yearEvents(row.year)} tabIndex={-1}/>)}
    {selected && !measure.active && <line data-annual-year-guide data-export-exclude x1={x(selected.year)} x2={x(selected.year)} y1={top} y2={bottom} stroke="var(--muted)" strokeDasharray="5 4" pointerEvents="none"/>}
    {measure.marks}{measure.readout}
  </svg>{measure.hint}</>;
}
function AnnualTooltipContent({ data, active }: { data:PublicationChartData; active:string|null }) {
  const selected=data.annual.find(row=>active?.startsWith(`${row.year}:`));
  if(!selected) return null;
  const anchor=data.annual.find(row=>row.year===2022)!.papers;
  const science=annualScienceAvailable(data)?data.baseline.find(row=>row.year===selected.year):undefined;
  const index=(value:number)=>value/anchor*100;
  const rows=[{label:"Neurotech papers",value:number(selected.papers),color:blue},...(science?[
    {label:"All research index",value:number(index(science.all)),color:teal},
    {label:"Four-domain index",value:`${number(index(science.low))}–${number(index(science.high))}`,color:gray},
  ]:[])];
  return <div data-annual-tooltip={selected.year}><strong>{selected.year}</strong>{rows.map(row=><p key={row.label}><svg width="12" height="12" aria-hidden="true"><circle data-annual-tooltip-key={row.label} cx="6" cy="6" r="4" fill={row.color}/></svg> {row.label}: {row.value}</p>)}<p>{science?"Science index · 2022 = 100":"Science index unavailable for this year"}</p></div>;
}
type GrowthRow = PublicationChartData["growth"][number];
const growthLabel=(row:GrowthRow)=>row.id==="bci"||row.id==="not-bci"?`${short(row.group)} (${number(row.end)} papers)`:short(row.group);
function growthInspection(row: GrowthRow) {
  const cohort = row.numeratorUniverse === "NT10" ? "wider corpus (NT10)" : row.numeratorUniverse === "P2" ? "two-topic corpus (P2)" : row.numeratorUniverse === "P2 author-fractional" ? "two-topic author output (P2)" : row.numeratorUniverse;
  const n = `${row.group}, 2022 → 2025: neurotech ${number(row.start)} → ${number(row.end)} (${percent(row.growth)}). Unit: ${row.countUnit}; cohort: ${cohort}.`;
  return row.baselineStatus === "matched"
    ? `${n} Same-category reference ${number(row.referenceStart!)} → ${number(row.referenceEnd!)} (${percent(row.referenceGrowth)}). Reference scope: ${row.denominatorUniverse}. Growth gap: ${row.growthGapPercentagePoints === null ? "undefined" : `${number(row.growthGapPercentagePoints)} percentage points`}; relative neurotech share growth: ${percent(row.relativeShareGrowthPct)}.`
    : `${n} Reference unavailable.`;
}
type GrowthBaseline = "science" | "matched";
const growthColors = { above: blue, within: "#98a2b3", below: "#e8a132", unavailable: "#98a2b3" };
function GrowthMarks({row,data,x,y,radius,labelGap,inspect,baseline="science"}:{row:GrowthRow;data:PublicationChartData;x:(n:number)=>number;y:number;radius:number;labelGap:number;inspect?:Inspect;baseline?:GrowthBaseline}) {
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
      <circle data-growth-series="neurotech" data-reference-unavailable={!range?"":undefined} cx={x(row.growth)} cy={y} r={radius} data-export-r={CHART_PRESENTATION.expandedRadius} vectorEffect="non-scaling-stroke" fill={status==="unavailable"?"var(--surface)":color} stroke={status==="unavailable"?color:"var(--surface)"} strokeWidth="1.5"/>
      <text data-growth-label="neurotech" x={x(row.growth)+radius+labelGap} y={y} dominantBaseline="middle" fontWeight="600" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke" style={{fill:status==="within"||status==="unavailable"?"var(--foreground)":color}}>{percent(row.growth)}</text>
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
function GrowthContext({data,x,top,bottom,baseline="science",fontSize=14.5,compact=false}:{data:PublicationChartData;x:(n:number)=>number;top:number;bottom:number;baseline?:GrowthBaseline;fontSize?:number;compact?:boolean}) {
  return <g>
    {baseline==="science"&&data.scienceGrowth&&<>
      <rect data-science-context data-low={data.scienceGrowth.low} data-high={data.scienceGrowth.high} x={x(data.scienceGrowth.low)} y={top} width={x(data.scienceGrowth.high)-x(data.scienceGrowth.low)} height={bottom-top} fill={gray} fillOpacity=".28"><title>{`All-science context: four-domain growth range ${percent(data.scienceGrowth.low)} to ${percent(data.scienceGrowth.high)}; independently acquired global context`}</title></rect>
      <text data-growth-science-label x={compact?8:x(data.scienceGrowth.low)+(x(data.scienceGrowth.high)-x(data.scienceGrowth.low))/2} y={top-fontSize*.55} textAnchor={compact?"start":"middle"} fontWeight="600" style={{fill:"var(--muted)"}}>Science baseline</text>
    </>}
    {data.neurotechGrowth!==null&&<line data-neurotech-average data-value={data.neurotechGrowth} x1={x(data.neurotechGrowth)} x2={x(data.neurotechGrowth)} y1={top} y2={bottom} stroke="var(--foreground)" strokeWidth="1.5" strokeDasharray="5 5"><title>{`All neurotech: ${percent(data.neurotechGrowth)}; NT10 wider paper corpus`}</title></line>}
  </g>;
}
function GrowthLegend({fontSize,compact=false,unavailable=false,matched=false}:{fontSize:number;compact?:boolean;unavailable?:boolean;matched?:boolean}) {
  const entries=[{status:"above" as const,label:compact?"Above":"Above baseline"},{status:"within" as const,label:"Within"},{status:"below" as const,label:"Below"},...(unavailable?[{status:"unavailable" as const,label:compact?"No baseline":"Baseline unavailable"}]:[])];
  return <g data-growth-legend aria-label="Chart legend">
    {entries.map(({status,label},i)=>{
      const columns=fontSize>23||unavailable?2:3;
      const x=compact?8+(i%columns)*fontSize*(columns===2?6.3:6.1):[8,198,300,400][i],y=fontSize*(5.1+(compact?Math.floor(i/columns)*1.5:0));
      return <g key={status}><circle data-growth-legend-swatch={status} cx={x+5} cy={y-4} r="5.5" fill={status==="unavailable"?"var(--surface)":growthColors[status]} stroke={status==="unavailable"?growthColors[status]:"none"} strokeWidth="1.5"/><text x={x+18} y={y}>{label}</text></g>;
    })}
    {matched&&<g data-growth-reference-key><line x1="630" x2="630" y1={fontSize*5.1-12} y2={fontSize*5.1+2} stroke={gray} strokeWidth="3"/><text x="644" y={fontSize*5.1}>Category baseline</text></g>}
  </g>;
}
function GrowthAxis({data,x,low,high,fontSize=14.5,y=0,compact=false,baseline="science"}:{data:PublicationChartData;x:(n:number)=>number;low:number;high:number;fontSize?:number;y?:number;compact?:boolean;baseline?:GrowthBaseline}) {
  const unavailable=baseline==="matched"?data.growth.some(row=>row.referenceGrowth===null):!data.scienceGrowth;
  const totalX=data.neurotechGrowth===null?8:x(data.neurotechGrowth);
  const ticks=growthTicks(low,high),visibleTicks=compact&&ticks.length>3?ticks.filter(tick=>tick%((ticks[1]-ticks[0])*2)===0):ticks;
  return <g data-growth-axis transform={`translate(0 ${y})`}>
    <title>Growth, 2022–2025</title>
    {visibleTicks.map(tick=><g key={tick}>
      <line x1={x(tick)} x2={x(tick)} y1="0" y2={fontSize*.45} stroke="var(--border)"/>
      <text data-growth-tick x={x(tick)} y={fontSize*1.65} textAnchor="middle" style={{fill:"var(--muted)"}}>{percent(tick)}</text>
    </g>)}
    <text data-growth-total-label x={data.neurotechGrowth===null?8:compact?Math.max(fontSize*5.3,Math.min(400-fontSize*5.3,totalX)):totalX} y={fontSize*3.3} textAnchor={data.neurotechGrowth===null?"start":"middle"} fontWeight="700">{data.neurotechGrowth===null?"All neurotech: no 2022 base":`All neurotech ${percent(data.neurotechGrowth)}`}</text>
    <GrowthLegend fontSize={fontSize} compact={compact} unavailable={unavailable} matched={baseline==="matched"}/>
  </g>;
}
function GrowthPreview({data}:{data:PublicationChartData}) {
  const {ref,fontSize,unitsPerPixel}=usePreviewFont(400,true);
  const {low,high}=growthExtent(data),left=Math.max(18,fontSize*.8),right=388-fontSize*5,x=(value:number)=>left+(value-low)/(high-low)*(right-left);
  const sections=PUBLICATION_GROWTH_GROUPS.map((section,index)=>({section,heading:fontSize*3.2+PUBLICATION_GROWTH_GROUPS.slice(0,index).reduce((total,item)=>total+(item.groups.length*3.6+2.4)*fontSize,0)}));
  const cursor=sections.at(-1)!.heading+(2+3*3.6)*fontSize,footer=fontSize*(fontSize>23||!data.scienceGrowth?8:6.5),height=cursor+footer;
  return <span className="publication-growth-preview-canvas">
    <svg ref={ref} data-export-font-size={CHART_PRESENTATION.labelFontSize} viewBox={`0 0 400 ${height}`} role="img" aria-label="21 growth groups; neurotech, global science baseline and all-neurotech growth; scroll vertically" style={{fontSize}}>
      <GrowthContext data={data} x={x} top={fontSize*1.5} bottom={cursor} fontSize={fontSize} compact/>
      {sections.map(({section,heading},sectionIndex)=><g key={section.table}>
        {sectionIndex>0&&<line data-growth-section-separator x1="8" x2="392" y1={heading-fontSize*1.1} y2={heading-fontSize*1.1} stroke="var(--border)" strokeWidth=".75" vectorEffect="non-scaling-stroke" aria-hidden="true" pointerEvents="none"/>}
        <text data-growth-section x="8" y={heading} fontWeight="700" style={{fill:"var(--muted)"}}>{section.label.toUpperCase()}</text>
        {data.growth.filter(row=>row.table===section.table).map((row,index)=>{
          const y=heading+(1.6+index*3.6)*fontSize;
          return <g key={row.id}>
            <text x="8" y={y}>{row.id==="government-facility"?"Govt. / research facilities":growthLabel(row).replace("Ultrasound, TMS and MEG","Ultrasound, TMS, MEG")}</text>
            <GrowthMarks row={row} data={data} x={x} y={y+fontSize*1.2} radius={CHART_PRESENTATION.previewRadius*unitsPerPixel} labelGap={6*unitsPerPixel}/>
          </g>;
        })}
      </g>)}
      <GrowthAxis data={data} x={x} low={low} high={high} fontSize={fontSize} y={cursor} compact/>
    </svg>
    {/* The card preview simply shows the first groups; only the expanded chart keeps a frozen axis row. */}
  </span>;
}
function GrowthPlot({data,inspect,baseline="science"}:{data:PublicationChartData;inspect?:Inspect;baseline?:GrowthBaseline}) {
  const {ref,fontSize,unitsPerPixel}=usePreviewFont(820,true);
  const {low,high}=growthExtent(data,baseline),left=280,right=740,x=(value:number)=>left+(value-low)/(high-low)*(right-left);
  const rowHeight=32,footer=100;
  const layout=PUBLICATION_GROWTH_GROUPS.map((section,index)=>{
    const heading=48+PUBLICATION_GROWTH_GROUPS.slice(0,index).reduce((sum,item)=>sum+36+item.groups.length*rowHeight,0);
    return {section,heading,items:data.growth.filter(row=>row.table===section.table).map((row,i)=>({...row,y:heading+30+i*rowHeight}))};
  });
  const cursor=layout.at(-1)!.items.at(-1)!.y+18,height=cursor+footer;
  return <div className="publication-growth-canvas">
    <svg ref={ref} data-export-font-size={CHART_PRESENTATION.labelFontSize} data-growth-export data-baseline-mode={baseline} viewBox={`0 0 820 ${height}`} role="img" aria-label={`Publication growth 2022–2025; ${baseline==="science"?"general science baseline":"category-specific baselines; unavailable comparisons shown as hollow dots"}; all-neurotech growth`} style={{fontSize}}>
      <title>{`Neurotech publication growth; ${baseline==="science"?"general science baseline":"matched category baselines"}`}</title>
      <GrowthContext data={data} x={x} top={28} bottom={cursor} fontSize={fontSize} baseline={baseline}/>
      {growthTicks(low,high).map(tick=><line key={tick} x1={x(tick)} x2={x(tick)} y1="28" y2={cursor} stroke="var(--border)"/>)}
      {layout.map(({section,heading,items},sectionIndex)=><g key={section.table}>
        {sectionIndex>0&&<line data-growth-section-separator x1="8" x2="808" y1={heading-18} y2={heading-18} stroke="var(--border)" strokeWidth=".75" vectorEffect="non-scaling-stroke" aria-hidden="true" pointerEvents="none"/>}
        <text data-growth-section x="8" y={heading} fontWeight="700" letterSpacing="1" style={{fill:"var(--muted)"}}>{section.label.toUpperCase()}</text>
        {items.map(row=><g key={row.id}>
          <text data-growth-name x={left-15} y={row.y+4} textAnchor="end">{row.id==="government-facility"?<><tspan x={left-15} dy="-4">Government agencies</tspan><tspan x={left-15} dy="16">and research facilities</tspan></>:growthLabel(row)}</text>
          <GrowthMarks row={row} data={data} x={x} y={row.y} radius={CHART_PRESENTATION.expandedRadius*unitsPerPixel} labelGap={6*unitsPerPixel} inspect={inspect} baseline={baseline}/>
        </g>)}
      </g>)}
      <GrowthAxis data={data} x={x} low={low} high={high} fontSize={fontSize} y={cursor} baseline={baseline}/>
    </svg>
    <div className="publication-growth-sticky-axis" data-growth-sticky-axis data-export-exclude aria-hidden="true" style={{marginTop:`${-footer/820*100}%`}}>
      <svg viewBox={`0 0 820 ${footer}`} focusable="false" style={{fontSize}}><GrowthAxis data={data} x={x} low={low} high={high} fontSize={fontSize} baseline={baseline}/></svg>
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
function SectorPlot({ data, compact, inspect, previewHeight }: { data: PublicationChartData; compact?: boolean; inspect?: Inspect; previewHeight?: number }) {
  const {ref,fontSize,unitsPerPixel}=usePreviewFont(compact?330:740,true);
  const height=compact&&previewHeight?previewHeight*unitsPerPixel:330;
  const columns=compact&&previewHeight&&previewHeight>330/unitsPerPixel*1.4?5:10;
  const cellWidth=320/columns, cellHeight=(height-10)/(100/columns);
  return <svg ref={ref} data-export-font-size={CHART_PRESENTATION.labelFontSize} viewBox={compact?`0 0 330 ${height}`:"0 0 740 370"} role="img" aria-label="Researchers by publication sector; 100 squares" style={{fontSize}}>
    <title>{`${number(data.totalResearchers)} researchers with papers in ${data.authorEndYear}; each square ≈ 1%`}</title>
    {data.waffle.map((cell,i)=><rect key={i} data-publication-mark data-sector={cell.sector} x={compact?8+(i%columns)*cellWidth:8+(i%10)*32} y={compact?8+Math.floor(i/columns)*cellHeight:8+Math.floor(i/10)*32} width={compact?cellWidth-4:28} height={compact?cellHeight-4:28} rx="3" fill={cell.color} {...pointEvents(`${data.sectors.find(row=>row.sector===cell.sector)!.label}: ${number(data.sectors.find(row=>row.sector===cell.sector)!.count)} researchers with papers in ${data.authorEndYear}`,inspect)}/>)}
    {!compact&&data.sectors.map((row,i)=><g key={row.sector} data-publication-mark {...pointEvents(`${row.label}: ${number(row.count)} researchers, ${number(row.share)}%`,inspect)}>
      <rect x="350" y={25+i*82} width="12" height="12" rx="2" fill={row.color}/>
      <text x="375" y={37+i*82} fontWeight="700" data-export-font-size="24" style={{fontSize:fontSize*2}}>{number(row.count)} · {number(row.share)}%</text>
      <text x="375" y={70+i*82} data-export-font-size="16" style={{fontSize:fontSize*4/3}}>{row.label}</text>
    </g>)}
  </svg>;
}
function changesSubtitle(data: PublicationChartData) {
  return `First and latest observed paper affiliations for researchers first seen in brain–computer interfaces/EEG or neural engineering in 2016–${data.authorEndYear}, with at least two active publication years. Ribbon widths show people; same-sector endpoints are included.`;
}
function ChangesPlot(props: { data: PublicationChartData; compact?: boolean; inspect?: Inspect; activeInspection?: string | null; previewHeight?: number }) {
  return <PublicationSankey {...props}/>;
}
function Plot({ index, ...props }: { index:number; data:PublicationChartData; compact?:boolean; inspect?:Inspect; baseline?:GrowthBaseline; activeInspection?:string|null; previewHeight?:number }) {
  return index===0?<AnnualPlot {...props}/>:index===1?(props.compact?<GrowthPreview data={props.data}/>:<GrowthPlot {...props}/>):index===2?<SectorPlot {...props}/>:<ChangesPlot {...props}/>;
}
function scope(index:number,snapshot:PublicationSnapshot) {
  if(index===0) return `2010–${snapshot.source.paperEndYear} · wider neurotech corpus · retrieved ${snapshot.source.paperAsOf}`;
  if(index===1) return `${snapshot.source.baselineYear}–${snapshot.source.paperEndYear} · wider corpus and two-topic output`;
  return `${index===2?`${snapshot.source.authorEndYear} · two-topic researcher cohort`:`Two-topic cohort · first/latest publication affiliations, 2016–${snapshot.source.authorEndYear}`} · retrieved ${snapshot.source.authorAsOf}`;
}
export function publicationExportNotes(index:number,snapshot:PublicationSnapshot,data:PublicationChartData,baseline:GrowthBaseline="science") {
  const notes=[scope(index,snapshot),`Source: OpenAlex core · ${snapshot.source.url}`,`Retrieved: works ${snapshot.source.paperAsOf}; author histories ${snapshot.source.authorAsOf}. Observed through ${snapshot.source.observedThrough}.`,`Method: ${snapshot.source.methodologyVersion}.`];
  if(index>=1) notes.push("Two-topic cohort (P2): brain-computer interfaces and electroencephalography (EEG), and neural engineering (T10429 and T11601).");
  if(index===0) notes.push(annualScienceAvailable(data)?`Science index = source growth-equivalent value / actual 2022 neurotech count (${number(data.annual.find(row=>row.year===2022)!.papers)}) × 100. The left axis shows neurotech papers; the right axis is locked to 2022 = 100. The band spans minimum–maximum growth across life, social, physical and health sciences. Retrieved ${snapshot.source.scienceBaseline!.acquiredAt}.`:data.baseline.length?"Science index unavailable: the 2022 neurotech paper count is zero. Actual paper counts remain available.":"Global science context unavailable in this snapshot.");
  if(index===1) {
    const available=data.growth.filter(row=>row.referenceGrowth!==null).length;
    notes.push(`Selected comparison baseline: ${baseline==="science"?"General science. Gray band: four-domain growth range.":"Matched to each group. Gray ticks: category growth; hollow dots: baseline unavailable, no general-science fallback. Exact equality is within."}`,`${available} same-category comparisons available; ${data.growth.length-available} unavailable. Category-specific denominators are preserved.`);
    if(baseline==="science") notes.push(data.scienceGrowth?`All-science context: ${percent(data.scienceGrowth.low)} to ${percent(data.scienceGrowth.high)} across life, social, physical and health sciences. Retrieved ${snapshot.source.scienceBaseline!.acquiredAt}. Cohorts and units vary by group.`:"Global science context unavailable in this snapshot.");
    notes.push(`All neurotech: ${percent(data.neurotechGrowth)}; wider-corpus (NT10) total growth, 2022–2025.`);
    notes.push("Venue N = wider-corpus (NT10) indexed works; region/institution N = P2 two-topic whole-work involvement. D = all-field works in the same category. Unit: OpenAlex work ID; groups overlap.","Method/BCI: wider-corpus indexed works. Career/citation: two-topic author-fractional works, scaled by quarterly known coverage. References unavailable for these groups.");
    if(snapshot.matchedGrowth) {
      const dates=Object.values(snapshot.matchedGrowth.evidence).flatMap(e=>"retrievedAt" in e?[e.retrievedAt]:[]).sort();
      if(dates.length) notes.push(`Comparison counts retrieved ${dates[0]}–${dates.at(-1)}. Method: ${snapshot.matchedGrowth.method}.`);
    }
    for(const row of data.growth.filter(row=>row.baselineStatus==="matched")) notes.push(`Source counts: ${row.group}: N (${row.numeratorUniverse}) ${number(row.start)} → ${number(row.end)}, ${percent(row.growth)}; reference ${number(row.referenceStart!)} → ${number(row.referenceEnd!)}, ${percent(row.referenceGrowth)}. Unit: ${row.countUnit}. D: ${row.denominatorUniverse}.`);
  }
  if(index===2) notes.push(`${number(data.totalResearchers)} unique researchers with papers in ${data.authorEndYear}; one sector per identified author. The 100 squares approximate 1% each using largest-remainder allocation. Exact counts: ${data.sectors.map(s=>`${s.label} ${number(s.count)} (${number(s.share)}%)`).join("; ")}.`);
  if(index===3) {
    notes.push(changesSubtitle(data), "One shared people-count scale across all four origin and destination sectors. Same-sector ribbons mean equal sectors at the first/latest observed paper; intervening changes are not measured. Affiliations reflect paper metadata; employment history is unmeasured. No listed affiliation means missing paper-affiliation metadata.");
    if (data.endpointTransitions) for (const row of data.endpointTransitions) notes.push(`From ${row.label} (${number(row.total)} people): ${row.destinations.map(dest => `${dest.label} ${number(dest.count)} (${number(dest.share)}%)${dest.sector === row.from ? dest.sector === "No listed affiliation" ? " — metadata missing at both endpoints" : " — same sector at first/latest paper" : ""}`).join("; ")}.`);
    else notes.push("Complete endpoint counts unavailable in this snapshot; the archived changes-only matrix has no measured same-sector diagonal.");
  }
  return notes;
}
const tableNames=(index:number)=>index===0?["nt_yearly"]:index===1?["nt_yearly",...PUBLICATION_GROWTH_GROUPS.map(section=>section.table)]:index===2?["nt_talent_table"]:["nt_talent_moves", "nt_talent_endpoints"];
function SourceTable({name,table}:{name:string;table:PublicationTable}) {
  return <div className="pc-table-scroll" role="region" aria-label={`${name} source values`} tabIndex={0}><table><caption>{name}</caption><thead><tr>{table.columns.map(col=><th key={col.name} scope="col">{col.name}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell===null?"—":String(cell)}</td>)}</tr>)}</tbody></table></div>;
}
function PublicationDetails({index,snapshot,data,anchor}:{index:number;snapshot:PublicationSnapshot;data:PublicationChartData;anchor:PublicationAnchor}) {
  const tooltip=usePointTooltip<string>();
  const [baseline,setBaseline]=useState<GrowthBaseline>("science");
  const available=data.growth.filter(row=>row.referenceGrowth!==null).length;
  const plot=useRef<HTMLDivElement>(null);
  useGrowthViewport(plot,index===1);
  const notes=publicationExportNotes(index,snapshot,data,baseline);
  const hasScience=annualScienceAvailable(data);
  const selected=Object.fromEntries(tableNames(index).filter(name=>snapshot.tables[name]).map(name=>[name,snapshot.tables[name]]));
  const download={chart:anchor,snapshotSchemaVersion:snapshot.schemaVersion,source:snapshot.source,tables:selected,audit:snapshot.audit,...(index===1&&snapshot.matchedGrowth?{matchedGrowth:snapshot.matchedGrowth}:{})};
  return <>
    <ChartActions anchor={anchor} title={titles[index]}><ChartShare anchor={anchor} title={titles[index]} disabled={index===3&&!data.endpointTransitions} getChart={()=>({svg:plot.current!.querySelector("svg")!,title:titles[index],anchor,notes,legend:index===0?[{label:"Neurotech · left axis: papers",color:blue},...(hasScience?[{label:"All research · right axis: science index (2022 = 100)",color:teal},{label:"Global science context · four-domain band: science index (2022 = 100)",color:gray}]:[])]:[]})}/></ChartActions>
    <ModalSources><p className="publication-scope mx-scope-line" data-change-subtitle={index===3?"":undefined}>{index===3?changesSubtitle(data):scope(index,snapshot)}</p></ModalSources>
    {index===0&&<p className="publication-legend"><span data-series-key="neurotech" style={{color:blue}}>● Neurotech · left axis: papers</span>{hasScience&&<><span style={{color:teal}}>● All research · right axis: index</span><span>■ Global science context · four-domain band: index</span><span>Science index · 2022 = 100</span></>}</p>}
    {index===1&&<>
      <div className="publication-growth-options" role="radiogroup" aria-label="Comparison baseline" data-growth-baseline={baseline}>
        <span className="publication-growth-options-label" aria-hidden="true">Comparison baseline</span>
        {([["science","General science"],["matched",`Matched to each group (${available} available)`]] as const).map(([value,label])=><button key={value} type="button" role="radio" aria-checked={baseline===value} data-baseline-option={value} onClick={()=>{if(baseline!==value){setBaseline(value);tooltip.clear();}}}>{label}</button>)}
      </div>
      {baseline==="matched"&&<p className="publication-scope" data-growth-coverage>{available} category baselines available; {data.growth.length-available} unavailable (hollow dots). Gray ticks mark each group’s baseline; no general-science fallback.</p>}
    </>}
    <div ref={plot} className={`publication-full-plot publication-plot-${index}`} role="region" aria-label={`${titles[index]} scrollable plot`} tabIndex={0}><Plot index={index} data={data} inspect={tooltip.pointProps} baseline={baseline} activeInspection={tooltip.active}/></div>
    {index===2&&<section className="publication-sector-key" data-publication-sector-key aria-label="Researcher publication-sector key"><p>{number(data.totalResearchers)} unique researchers · {data.authorEndYear}</p><ul>{data.sectors.map(row=><li key={row.sector}><span aria-hidden="true" style={{background:row.color}}/><span>{row.label}: <strong>{number(row.count)}</strong> ({number(row.share)}%)</span></li>)}</ul></section>}
    <div className="sr-only" data-publication-inspector role="status" aria-live="polite">{tooltip.active??""}</div>
    <PointTooltip {...tooltip.tooltipProps}>{index===0?<AnnualTooltipContent data={data} active={tooltip.active}/>:<p>{tooltip.active}</p>}<p><a href={snapshot.source.url} target="_blank" rel="noreferrer">Source: OpenAlex ↗</a></p></PointTooltip>
    <ModalReading><section className="pc-methodology"><h4>Methodology</h4>
      {notes.filter(note=>!note.startsWith("Source counts: ")).map(note=><p key={note}>{note}</p>)}
      {(index===0||index===1)&&<p>The wider corpus (NT10) covers brain-computer interfaces and electroencephalography (EEG), neural engineering, and transcranial magnetic stimulation (TMS), plus seven broader OpenAlex topics gated by both neurotechnology and neural-context terms. Each reconciled OpenAlex work ID counts once; preprint and publication IDs stay separate. Types: articles, reviews, conference papers, book chapters and preprints.</p>}
      {index===1&&<><p>Region and institution comparisons count each work once per involved category on both sides. Groups overlap. US and Canada covers those two countries; government agencies and research facilities uses the government/facility union.</p><p>Title/abstract technique priority: invasive; ultrasound, TMS and magnetoencephalography (MEG); EEG; no technique named. Brain-computer interface (BCI) is a separate flag. Career stages: 1–5, 6–15 and 16+ years since first publication. Citation rank uses citations received in the prior five years among two-topic researchers active in the current or preceding five years. Each work is split across its full byline; known output scales quarterly by total/known output. Source tables round annual totals ties-to-even; plotted career/citation endpoints use unrounded fractions.</p></>}
      {index>=2&&<p>Each identified author has one sector per active publication year. Education maps to Universities; company to Companies; government, facility, healthcare, nonprofit, archive, funder and other known types to Other institutions. No listed affiliation records missing metadata. Known sector votes take priority; frequency, then alphabetical source-label order, determines the sector. Multiple affiliations use institution-type frequency, then type, institution ID and country-code order.</p>}
      {index===3&&<p>The Sankey displays all four origin and destination sectors, including equal first/latest endpoint sectors, on one shared people-count scale. Eligibility requires first selected-topic publication in 2016 or later and at least two distinct active years through 2025. It compares endpoints rather than reconstructing every intermediate move. The archived nt_talent_moves table retains its original null diagonals; nt_talent_endpoints contains the complete sixteen-cell endpoint cohort.</p>}
    </section></ModalReading>
    <ModalSources><ul className="pc-sources"><li><a href={snapshot.source.url} target="_blank" rel="noreferrer">OpenAlex API ↗</a></li><li><a href="https://docs.openalex.org" target="_blank" rel="noreferrer">OpenAlex data definitions ↗</a></li></ul></ModalSources>
      <ModalData><details className="pc-provenance"><summary>Source values, coverage and provenance</summary>
        <p>Method: {snapshot.source.methodologyVersion} · SHA-256 {snapshot.source.methodSha256}</p><p>Source hash: {snapshot.source.sourceHash}. Latest OpenAlex updates: works {snapshot.source.worksMaxUpdatedDate??"unavailable"}; authors {snapshot.source.authorsMaxUpdatedDate??"unavailable"}. Receipt captured {snapshot.source.capturedAt}.</p>
        {snapshot.source.testOnly&&<p>Synthetic fixture · test use only</p>}
        {index===1&&<div className="pc-table-scroll" role="region" aria-label="Growth numerator and matched reference values" tabIndex={0}><table><caption>Plotted comparisons · 2022 → 2025</caption><thead><tr>{["Group","Neurotech N","Reference D","Unit / neurotech cohort","Reference scope / status"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.growth.map(row=><tr key={row.id}><th scope="row">{row.group}</th><td>{number(row.start)} → {number(row.end)} ({percent(row.growth)})</td><td>{row.baselineStatus==="matched"?`${number(row.referenceStart!)} → ${number(row.referenceEnd!)} (${percent(row.referenceGrowth)})`:"Unavailable"}</td><td>{row.countUnit} · {row.numeratorUniverse}</td><td>{row.denominatorUniverse??"Reference unavailable"}</td></tr>)}</tbody></table></div>}
        {index===1&&snapshot.matchedGrowth&&<p>Comparison method: {snapshot.matchedGrowth.method}. Retrieved: {Object.values(snapshot.matchedGrowth.evidence).flatMap(e=>"retrievedAt" in e?[e.retrievedAt]:[]).join("; ")}. Region/institution source tables below use author fractions.</p>}
        {index===3&&<p>Columns to0–to3: {PUBLICATION_SECTORS.join("; ")}.</p>}
        {Object.entries(selected).map(([name,table])=><SourceTable key={name} name={name} table={table}/>)}
        <p>Coverage: wider corpus {number(snapshot.audit.paperCohort.works)} indexed works, 2010–2025; two-topic cohort {number(snapshot.audit.authorCohort.works)} works and {number(snapshot.audit.authorCohort.authors)} identified authors, 2000–2025. Unidentified byline slots: {number(snapshot.audit.authorCohort.unidentifiedBylineSlots)}.</p>
        {index===1&&<div className="pc-table-scroll" role="region" aria-label="Quarterly affiliation and profile coverage" tabIndex={0}><table><caption>Quarterly known coverage · author-fractional output</caption><thead><tr><th scope="col">Dimension / quarter</th><th scope="col">Total</th><th scope="col">Unknown</th><th scope="col">Known share</th><th scope="col">Scale</th></tr></thead><tbody>{snapshot.audit.coverage.map(row=><tr key={`${row.dimension}:${row.year}:${row.quarter}`}><th scope="row">{row.dimension} {row.year} Q{row.quarter}</th><td>{number(row.total)}</td><td>{number(row.unknown)}</td><td>{number(row.knownShare*100)}%</td><td>{row.scale===null?"—":number(row.scale)}</td></tr>)}</tbody></table><p>Source JSON includes raw and scaled author fractions, omitted known groups and Unknown.</p></div>}
        <a download={`neuro-atlas-${anchor}-source.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(download,null,2))}`}>Download source JSON</a>
      </details></ModalData>
  </>;
}
function PublicationCard({index,snapshot,data}:{index:number;snapshot:PublicationSnapshot;data:PublicationChartData}) {
  const anchor=PUBLICATION_ANCHORS[index], hash=usePerformanceHash(), open=hash===`#${canonicalPerformanceAnchor(anchor)}`, trigger=useRef<HTMLButtonElement>(null);
  const exporting=useCardExporting(anchor);
  const hasScience=annualScienceAvailable(data);
  const preview=useRef<HTMLDivElement>(null);
  const previewExtra=useMetricPreviewSpace(preview,true);
  const previewHeight=170+previewExtra;
  return <article className="pc-card card publication-card" data-metric-tile data-performance-card={anchor} data-publication-card={anchor}>
    <div data-metric-card-body>
      <button ref={trigger} className="pc-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>navigatePerformance(anchor)}><span className="pc-card-title">{titles[index]}</span></button>
      <div ref={preview} data-metric-preview-extra={previewExtra} style={{height:previewHeight}} className={`publication-preview publication-preview-${index}`} role="region" aria-label={`${titles[index]} preview${index===1?"; scroll for all groups":""}`} tabIndex={index===1?0:undefined}><button className="publication-preview-trigger" type="button" aria-label={`Enlarge ${titles[index]}`} aria-haspopup="dialog" onClick={()=>navigatePerformance(anchor)}><Plot index={index} data={data} compact previewHeight={previewHeight}/></button></div>
      {index===0&&<p className="publication-preview-note publication-preview-legend" data-annual-preview-key={hasScience?"":undefined}>{hasScience?<><span data-series-key="neurotech" style={{color:blue}}>● Neurotech papers</span><span data-series-key="all-research" style={{color:teal}}>● All research</span><span data-series-key="four-domain"><span aria-hidden="true" style={{color:gray}}>■</span> Four-domain range</span></>:data.baseline.length?"Neurotech papers · science index unavailable (zero 2022 count)":"Neurotech indexed papers · full observed years"}</p>}
      {index===1&&<p className="publication-preview-note">21 groups · scroll for all</p>}
      {index===2&&<ul className="publication-preview-sectors">{data.sectors.map(s=><li key={s.sector}><span style={{background:s.color}}/>{s.label}: {number(s.count)} ({number(s.share)}%)</li>)}</ul>}
    </div>
    <div data-metric-card-footer>
      <MetricCardScope><span className="pc-coverage">{index===3?`First → latest paper affiliations · first observed 2016–${data.authorEndYear} · people`:scope(index,snapshot)}</span></MetricCardScope>
      <DraftChartShare anchor={anchor} label={titles[index]} className="pc-share"/>
      <CardPngButton anchor={anchor} title={titles[index]} disabled={index===3&&!data.endpointTransitions}/>
    </div>
    {(open||exporting)&&<ChartModal id={anchor} title={titles[index]} returnFocus={trigger} offscreen={!open}><PublicationDetails key={`${anchor}:${snapshot.source.sourceHash}`} index={index} snapshot={snapshot} data={data} anchor={anchor}/></ChartModal>}
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
