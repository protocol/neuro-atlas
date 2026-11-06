"use client";

import React from "react";
import type { PaceData } from "@/lib/field-velocity/performance";
import { CurveCard, type PlotData } from "@/components/performance-curves";
import { LatencyEvidenceCard } from "@/components/latency-evidence-card";
import { useCitationView } from "@/components/citation-latency-provider";
import { projectCitationRecord } from "@/lib/field-velocity/citation-latency-feed";
import { atlasPath } from "@/lib/atlas-path";

export function PaceReadings({ data, flat = false }: { data: PaceData; flat?: boolean }) {
  const citation = useCitationView();
  const cards = data.records.map(sourceRecord => {
      const record = sourceRecord.instrument === "idea_vintage" && sourceRecord.state === "reading" && citation.data ? projectCitationRecord(citation.data, sourceRecord) : sourceRecord;
      const definition = data.definitions.find(d => d.id === record.instrument)!;
      const reading = record.state === "reading";
      const vintage = record.instrument === "idea_vintage";
      const title = vintage ? "Citation latency" : definition.label;
      if (reading && !vintage) return <LatencyEvidenceCard key={record.instrument} />;
      const plot: PlotData | undefined = reading ? {
        title, unit: "years", scale: "linear", line: false,
        xLabel: vintage ? "Publication year" : "Pivotal preclinical demonstration year",
        tracks: [{ id: record.instrument, label: vintage ? "Median reference age" : "Preclinical to first-in-human lag" }],
        points: record.series!.map(point => ({
          date: `${point.x}-01-01`, value: point.y, lo: point.lo, hi: point.hi, reliable: point.reliable,
          track: record.instrument, trackIndex: 0,
          label: `${point.x}: ${point.y} years${point.lo != null && point.hi != null ? `; source interval ${point.lo}–${point.hi} years` : ""}${point.reliable === false ? "; Under-indexed" : ""}. ${record.sources!.map(s => s.label).join("; ")}`,
        })),
      } : undefined;
      return <CurveCard key={record.instrument} id={record.instrument} title={title} eyebrow={reading ? "Shared source reading" : record.state.replaceAll("_", " ")} coverage={reading ? record.value! : (record.blocker ?? record.reason ?? "No reading available")} plot={plot} sourceLinks={reading && !vintage ? record.sources : undefined}>
        <section className="pc-methodology" aria-label={`${title} definitions and methodology`}>
          <h4>Definition and methodology</h4>
          {vintage ? <>
            <p>Idea vintage is the median age of references cited by new papers, measured when the citing paper was published. A falling median means papers cite more recent work; a rising median means they cite older work. A two-segment fit estimates the recent trend, with a direction shown only when statistically clear.</p>
            <p>Reference age tends to rise as a literature ages or gains researchers bringing older foundational citations from adjacent fields.</p>
          </> : <p>{definition.description}</p>}
          {reading ? <>
            <p className="pc-reading">{record.value}</p>
            <p className="pc-caveat">{vintage ? "Whiskers show source intervals. Hollow markers show under-indexed years; the trend uses the reliable years." : "Selected BCI pathways retain their animal models and human endpoints. The axes show the preclinical report year and the interval to the human milestone."}</p>
            <p>{vintage ? <>OpenAlex’s reliable source years: {record.window}. Newer years remain under-indexed. </> : <>Source years: {record.window}. </>}Source checked {record.checkedAt}.</p>
            {record.provenance && <p>Source query: {record.provenance.query}. Source generated: {record.provenance.generated}.</p>}
            {vintage && <p data-citation-revision={citation.revision}>
              <a download="citation-latency.csv" href={atlasPath(`/api/citation-latency/${citation.revision}/citation-latency.csv`)}>Download source CSV</a>{" · "}
              <a download="citation-latency.json" href={atlasPath(`/api/citation-latency/${citation.revision}/citation-latency.json`)}>Download JSON &amp; provenance</a>
            </p>}

          </> : <p>{record.candidateMetric ?? record.reason} {record.blocker}</p>}
        </section>
        {reading && <>
          <div className="pc-table-scroll" role="region" aria-label={`${title} source data`} tabIndex={0}>
            <table><caption>Sources &amp; chart data · {record.series!.length} observations</caption>
              <thead><tr><th scope="col">{vintage ? "Publication year" : "Preclinical year"}</th><th scope="col">{vintage ? "Median reference age (years)" : "Lag to first-in-human (years)"}</th>{vintage && <th scope="col">Source interval (years)</th>}<th scope="col">Coverage</th></tr></thead>
              <tbody>{record.series!.map(point => <tr key={String(point.x)} data-source-observation={`${record.instrument}:${point.x}`}>
                <th scope="row">{point.x}</th><td>{point.y} years</td>{vintage && <td>{point.lo ?? "Not supplied"}–{point.hi ?? "Not supplied"}</td>}<td>{point.reliable === false ? "Under-indexed" : "Source observation"} · year precision</td>
              </tr>)}</tbody>
            </table>
          </div>
          <ul className="pc-sources">{record.sources!.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>

        </>}
      </CurveCard>;
    });
  if (flat) return <>{cards}</>;
  return <section className="performance-curves" aria-label="Citation latency and latency compression">
    <header className="pc-section-header"><h2>Citation latency &amp; latency compression</h2></header>
    <p className="pc-intro">Reference ages and selected report-to-human intervals, measured in years.</p>
    <div className="pc-grid">{cards}</div>
  </section>;
}
