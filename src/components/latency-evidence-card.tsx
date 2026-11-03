import { CurveCard } from "@/components/performance-curves";
import { TRANSLATION_EVIDENCE as evidence, reportInterval, translationPlot } from "@/lib/field-velocity/translation-evidence";

/** The archived animal-event metric is withdrawn; explicitly name this narrower, source-dated proxy. */
export function LatencyEvidenceCard() {
  return <CurveCard id="latency_compression" title="Latency compression" eyebrow="Reviewed source pairs"
    coverage="Approximate report-to-human intervals · implant and temporary-placement endpoints"
    plot={translationPlot()} sourceLinks={evidence.previewSources}
    modalIntro={<section className="pc-methodology" data-latency-identity>
      <h3>Selected report-to-human intervals</h3>
      <p>Selected public reports/demos to human milestones; implant and temporary-placement endpoints shown separately. Fieldwide acceleration remains unmeasured.</p>
    </section>}>
    <section className="pc-methodology" aria-label="Latency evidence definitions and methodology">
      <h4>How these intervals are defined</h4>
      <p>{evidence.definition}</p>
      <p>Markers show the midpoint of each date-precision range. Whiskers cover the stated month/day precision; the table preserves the source dates and their bases. Study designs and human endpoints differ between pathways.</p>
      <p>The upstream evidence review of {evidence.upstreamCorrectionDate} withdrew the former first-animal-event series and pooled median. The selected-report intervals here use the linked source dates below.</p>
    </section>
    <div className="pc-table-scroll" role="region" aria-label="Translation interval source data" tabIndex={0}>
      <table>
        <caption>Direct sources for every plotted interval · {evidence.intervals.length} selected pairs</caption>
        <thead><tr><th scope="col">Device lineage</th><th scope="col">Preclinical report / demo</th><th scope="col">Human milestone</th><th scope="col">Elapsed years / scope</th></tr></thead>
        <tbody>{evidence.intervals.map(pair => {
          const interval = reportInterval(pair);
          return <tr key={pair.id} data-latency-pair={pair.id} data-source-observation={`latency_compression:${pair.id}`}>
            <th scope="row">{pair.label}<small>{pair.species}</small></th>
            <td>{pair.report.date}<small>{pair.report.precision} precision · {pair.report.basis}</small><a data-source-stage="preclinical" href={pair.report.url} target="_blank" rel="noreferrer">{pair.report.sourceLabel} ↗</a></td>
            <td>{pair.human.date}<small>{pair.human.precision} precision · {pair.human.basis}</small><a data-source-stage="human" href={pair.human.url} target="_blank" rel="noreferrer">{pair.human.sourceLabel} ↗</a></td>
            <td>≈{interval.value.toFixed(1)} years<small>{interval.lo.toFixed(2)}–{interval.hi.toFixed(2)} years · date-precision range</small><p>{pair.context}</p></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <section className="pc-methodology" aria-label="Additional company translation pathways">
      <h4>Additional company pathways</h4>
      <p>These source records remain visible separately while the corresponding interval is unresolved or uses a different device lineage.</p>
      {evidence.additionalPathways.map(pathway => <section key={pathway.id} data-latency-pathway={pathway.id}>
        <h4>{pathway.label} · {pathway.status}</h4><p>{pathway.note}</p>
        <ul className="pc-sources">{pathway.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
      </section>)}
    </section>
    <ul className="pc-sources"><li><a href={evidence.corpusUrl} target="_blank" rel="noreferrer">Upstream endpoint evidence review ↗</a></li></ul>
    <p className="pc-chart-note">Evidence checked {evidence.checkedAt}. Source reports, experiment dates and surgery dates retain their distinct meanings.</p>
  </CurveCard>;
}
