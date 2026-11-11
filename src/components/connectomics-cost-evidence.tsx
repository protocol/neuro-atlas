// Author-estimated compute costs from RoboEM Source Data Fig. 1, sheet “Fig 1i”, C2:C5.
// Preserve exact workbook values; these configurations cover different processing stages.
const computeCosts = [
  { method: "FFN", eurPerMeter: 3903.572290653618, scope: "Segmentation/agglomeration; P100 GPU runtime rescaled to the reference dataset." },
  { method: "Motta et al. 2019", eurPerMeter: 1199.4311111111112, scope: "Dense reconstruction compute, including synapse/type prediction and processing human skeletons; excludes annotator wages." },
  { method: "LSD", eurPerMeter: 265.81487564871304, scope: "AcRLSD inference, watershed and agglomeration; V100 GPU and CPU resources." },
  { method: "RoboEM correction", eurPerMeter: 49.362962962963003, scope: "Correction-only compute added to an existing segmentation; total runtime extrapolated from benchmark tasks." },
] as const;

/** Evidence attached to populated charts, separate from their numeric observations. */
export function ConnectomicsCostEvidence() {
  return <details className="draft-plot-data" data-connectomics-cost-evidence>
    <summary>Reconstruction and proofreading cost evidence</summary>
    <p>The existing project-effort plot preserves two reported fly-project labor totals. Matched-scope dollar costs for complete reconstruction and proofreading remain unestablished in these sources.</p>
    <ul>
      <li><a href="https://elifesciences.org/articles/57443" target="_blank" rel="noreferrer">Hemibrain (2020) ↗</a>: &gt;50 person-years for a partial adult fly brain.</li>
      <li><a href="https://www.nature.com/articles/s41586-024-07558-y" target="_blank" rel="noreferrer">FlyWire (2024), Methods ↗</a>: approximately 33 person-years, estimated from timed tasks and edits using a 2,000-hour work year. Synapse attachment and reconstruction completeness retain project-specific limits.</li>
      <li><a href="https://www.nature.com/articles/s41586-025-08790-w" target="_blank" rel="noreferrer">MICrONS (2025) ↗</a>: 1,433 neurons with proofread axons of varying extension among 84,035 individually segmented neurons. All proofreading was in subvolume 65; these counts describe selected coverage.</li>
      <li><a href="https://www.biorxiv.org/content/10.1101/2022.07.18.500521v2.full" target="_blank" rel="noreferrer">NeuVue v2 (2026) ↗</a>: 2,451 logged hours across 36,447 merge-correction and cleanup tasks. The completeness screen imposes no axonal lower bounds. <a href="https://www.biorxiv.org/content/10.1101/2022.07.18.500521v1.full" target="_blank" rel="noreferrer">NeuVue v1 (2022) ↗</a> reports 3,740 cumulative hours with overlapping work and a different accounting scope; the versions remain separate.</li>
    </ul>
    <p><a href="https://www.nature.com/articles/s41592-024-02226-5" target="_blank" rel="noreferrer">RoboEM (2024) ↗</a> provides study-specific compute-cost estimates in EUR/m of reconstructed neurite. These cover different processing stages, with correction-only RoboEM requiring an existing segmentation. Quality and completeness differ between pipelines.</p>
    <div className="draft-plot-table-scroll" tabIndex={0} role="region" aria-label="RoboEM compute-cost evidence table">
      <table>
        <caption>RoboEM Figure 1i — author-estimated compute costs, EUR/m of neurite</caption>
        <thead><tr><th scope="col">Method</th><th scope="col">Approx. EUR/m</th><th scope="col">Processing scope</th></tr></thead>
        <tbody>{computeCosts.map(row => <tr key={row.method} data-reconstruction-compute-cost={row.eurPerMeter}>
          <th scope="row">{row.method}</th>
          <td>≈{Number(row.eurPerMeter.toPrecision(3)).toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
          <td>{row.scope}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p><a href="https://static-content.springer.com/esm/art%3A10.1038%2Fs41592-024-02226-5/MediaObjects/41592_2024_2226_MOESM5_ESM.xlsx" target="_blank" rel="noreferrer">Source workbook, Fig 1i ↗</a>; <a href="https://static-content.springer.com/esm/art%3A10.1038%2Fs41592-024-02226-5/MediaObjects/41592_2024_2226_MOESM1_ESM.pdf" target="_blank" rel="noreferrer">Supplementary Note 1.4 and Table 4 ↗</a>. Authors normalize dataset sizes to 2.7 meters of neurites, estimate hardware-equivalent Amazon EC2 rates, and use 1 USD ≈ 1 EUR at writing. These are modeled compute expenses, with labor and other project costs accounted separately.</p>
    <p>A comparable complete-volume cost series needs realized compute and labor expenses, currency and price year, tissue/specimen volume, task boundaries, reconstruction quality and completeness, and treatment of storage and acquisition. The evidence here supports reported effort and scoped compute estimates; whole-human dollar extrapolation remains a research gap.</p>
  </details>;
}
