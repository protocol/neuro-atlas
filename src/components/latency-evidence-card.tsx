import { CurveCard } from "@/components/performance-curves";
import { ModalReading, ModalSources, ModalTable } from "@/components/chart-modal-slots";
import { TRANSLATION_EVIDENCE as evidence, reportInterval, translationPlot } from "@/lib/field-velocity/translation-evidence";

const intervalContext: Record<string, string> = {
  'neurotrophic-cone': 'First listed NE implant: December 4, 1996; June 1, 1998 is publication. Earlier rat work is documented, so the starting point is the selected 1992 report.',
  'utah-braingate': 'Selected 2002 functional publication to the first BrainGate implant in June 2004. Blackrock belongs to this Utah/BrainGate device lineage.',
  'stentrode': 'February 2016 paper to the August 2019 implant; the public announcement followed in September.',
  'neuralink': 'Report precision: April 2021. Page metadata says April 18; the historical April 8 date remains unresolved. Human implant: January 2024. Earlier rodent and pig disclosures date to 2019 and 2020.',
  'precision-layer7': 'Minipig preprint: January 2, 2022. Human endpoint: temporary intraoperative placement in April 2023, retained with month precision.',
};
const pathwayNotes: Record<string, string> = {
  'science-biohybrid': 'Reviewed evidence covers a mouse optical-stimulation study and planned human trials. Completed human-endpoint evidence remains unverified.',
  'science-prima': 'PRIMA’s retinal prosthesis comes from Stanford/Pixium; human use predates Science’s acquisition. A January 2018 activation report implies implantation in December 2017. The earliest in-vivo preclinical date remains unresolved.',
  'paradromics-connexus': 'The company reports nearly three years of same-device preclinical work before the temporary human procedure. Exact preclinical start and surgery dates remain unspecified. Temporary and long-term studies have distinct endpoints.',
};
const reportBasis: Record<string, string> = {
  'neuralink': 'public demonstration',
  'precision-layer7': 'original v1 preprint publication',
};

/** The archived animal-event metric is withdrawn; explicitly name this narrower, source-dated proxy. */
export function LatencyEvidenceCard() {
  return <CurveCard id="latency_compression" title="Latency compression" eyebrow="Reviewed source pairs"
    coverage="Approximate report-to-human intervals · implant and temporary-placement endpoints"
    plot={translationPlot()} sourceLinks={evidence.previewSources}
    modalIntro={<section className="pc-methodology" data-latency-identity>
      <h3>Selected report-to-human intervals</h3>
      <p>Intervals from selected public preclinical reports to human implants or temporary placements. Each pathway retains its species and endpoint.</p>
    </section>}>
    <ModalReading><section className="pc-methodology" aria-label="Latency evidence definitions and methodology">
      <h4>How these intervals are defined</h4>
      <p>Elapsed time from a selected public preclinical report or demonstration to a documented human milestone. Earlier experimental work may predate the selected report.</p>
      <p>Dots mark midpoints of date-precision ranges; whiskers show their full spans. Table dates retain source precision. Study designs and human endpoints vary by pathway.</p>
    </section>
    <section className="pc-methodology" aria-label="Additional company translation pathways">
      <h4>Other reviewed pathways</h4>
      <p>Comparable endpoint dates remain unresolved for these device lineages.</p>
      {evidence.additionalPathways.map(pathway => <section key={pathway.id} data-latency-pathway={pathway.id}>
        <h4>{pathway.label} · {pathway.status}</h4><p>{pathwayNotes[pathway.id] ?? pathway.note}</p>
        <ul className="pc-sources">{pathway.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
      </section>)}
    </section></ModalReading>
    <ModalTable summary={<>Direct sources for every plotted interval · {evidence.intervals.length} selected pairs</>}><div className="pc-table-scroll" role="region" aria-label="Translation interval source data" tabIndex={0}>
      <table>
        <caption>Direct sources for every plotted interval · {evidence.intervals.length} selected pairs</caption>
        <thead><tr><th scope="col">Device lineage</th><th scope="col">Preclinical report / demo</th><th scope="col">Human milestone</th><th scope="col">Elapsed years / scope</th></tr></thead>
        <tbody>{evidence.intervals.map(pair => {
          const interval = reportInterval(pair);
          return <tr key={pair.id} data-latency-pair={pair.id} data-source-observation={`latency_compression:${pair.id}`}>
            <th scope="row">{pair.label}<small>{pair.species}</small></th>
            <td>{pair.report.date}<small>{pair.report.precision} precision · {reportBasis[pair.id] ?? pair.report.basis}</small><a data-source-stage="preclinical" href={pair.report.url} target="_blank" rel="noreferrer">{pair.report.sourceLabel} ↗</a></td>
            <td>{pair.human.date}<small>{pair.human.precision} precision · {pair.clinicalEndpoint === 'temporary-placement' ? 'temporary intraoperative placement' : pair.human.basis}</small><a data-source-stage="human" href={pair.human.url} target="_blank" rel="noreferrer">{pair.human.sourceLabel} ↗</a></td>
            <td>≈{interval.value.toFixed(1)} years<small>{interval.lo.toFixed(2)}–{interval.hi.toFixed(2)} years · date-precision range</small><p>{intervalContext[pair.id] ?? pair.context}</p></td>
          </tr>;
        })}</tbody>
      </table>
    </div></ModalTable>
    <ModalSources>
      <ul className="pc-sources"><li><a href={evidence.corpusUrl} target="_blank" rel="noreferrer">Endpoint evidence review ↗</a></li></ul>
      <p className="pc-chart-note">Sources checked {evidence.checkedAt}.</p>
    </ModalSources>
  </CurveCard>;
}
