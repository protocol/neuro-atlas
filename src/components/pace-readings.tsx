"use client";

import React from "react";
import type { PaceData } from "@/lib/field-velocity/performance";
import { CurveCard, type PlotData } from "@/components/performance-curves";

export function PaceReadings({ data, flat = false }: { data: PaceData; flat?: boolean }) {
  const cards = data.records.map(record => {
      const definition = data.definitions.find(d => d.id === record.instrument)!;
      const reading = record.state === "reading";
      const vintage = record.instrument === "idea_vintage";
      const plot: PlotData | undefined = reading ? {
        title: definition.label, unit: "years", scale: "linear", line: false,
        xLabel: vintage ? "Publication year" : "Pivotal preclinical demonstration year",
        tracks: [{ id: record.instrument, label: vintage ? "Median reference age" : "Preclinical to first-in-human lag" }],
        points: record.series!.map(point => ({
          date: `${point.x}-01-01`, value: point.y, lo: point.lo, hi: point.hi, reliable: point.reliable,
          track: record.instrument, trackIndex: 0,
          label: `${point.x}: ${point.y} years${point.lo != null && point.hi != null ? `; source interval ${point.lo}–${point.hi} years` : ""}${point.reliable === false ? "; Under-indexed" : ""}. ${record.sources!.map(s => s.label).join("; ")}`,
        })),
      } : undefined;
      return <CurveCard key={record.instrument} id={record.instrument} title={definition.label} eyebrow={reading ? "Shared source reading" : record.state.replaceAll("_", " ")} coverage={reading ? record.value! : (record.blocker ?? record.reason ?? "No reading available")} plot={plot}>
        <section className="pc-methodology" aria-label={`${definition.label} definitions and methodology`}>
          <h4>Definitions &amp; methodology</h4><p>{definition.description}</p>
          {reading ? <>
            <p>{record.metric}</p><p className="pc-reading">{record.value}</p><p>{record.trend}</p>
            <p className="pc-caveat">{vintage ? "Reference age is not research quality. Source intervals are shown as whiskers; under-indexed years remain visible as hollow markers, not a new trend claim. Patent vintage is a separate evidence slot." : "Four selected BCI modalities, not every translation pathway. The x-axis is the pivotal preclinical demonstration year; the y-axis is the lag in years to first-in-human implant. Animal models differ, including sheep for Synchron. No connecting growth curve or new cohort averages are inferred."}</p>
            <p>Source window: {record.window}. Observed {record.measuredAt}. Source checked {record.checkedAt}.</p>
            {record.provenance && <p>Source query: {record.provenance.query}. Source generated: {record.provenance.generated}.</p>}
            <p>{data.methodology.stocksAndFlows}</p>
          </> : <p>{record.candidateMetric ?? record.reason} {record.blocker}</p>}
        </section>
        {reading && <>
          <div className="pc-table-scroll" role="region" aria-label={`${definition.label} source data`} tabIndex={0}>
            <table><caption>Sources &amp; chart data · {record.series!.length} observations</caption>
              <thead><tr><th scope="col">{vintage ? "Publication year" : "Preclinical year"}</th><th scope="col">{vintage ? "Median reference age (years)" : "Lag to first-in-human (years)"}</th>{vintage && <th scope="col">Source interval (years)</th>}<th scope="col">Coverage</th></tr></thead>
              <tbody>{record.series!.map(point => <tr key={String(point.x)} data-source-observation={`${record.instrument}:${point.x}`}>
                <th scope="row">{point.x}</th><td>{point.y} years</td>{vintage && <td>{point.lo ?? "Not supplied"}–{point.hi ?? "Not supplied"}</td>}<td>{point.reliable === false ? "Under-indexed" : "Source observation"} · year precision</td>
              </tr>)}</tbody>
            </table>
          </div>
          <ul className="pc-sources">{record.sources!.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
          {record.patentVintage && <section className="pc-methodology" aria-label="Patent vintage"><h4>Patent vintage · {record.patentVintage.state.replaceAll("_", " ")}</h4><p>{record.patentVintage.state === "reading" ? record.patentVintage.value : record.patentVintage.candidateMetric ?? record.patentVintage.reason}</p>{record.patentVintage.state !== "reading" && <p>{record.patentVintage.blocker}</p>}</section>}
        </>}
      </CurveCard>;
    });
  if (flat) return <>{cards}</>;
  return <section className="performance-curves" aria-label="Idea vintage and latency compression">
    <header className="pc-section-header"><h2>Idea vintage &amp; latency compression</h2></header>
    <p className="pc-intro">How old are the ideas new work draws on, and how long does translation take? Separate, sourced readings in years — not a combined field score.</p>
    <div className="pc-grid">{cards}</div>
  </section>;
}
