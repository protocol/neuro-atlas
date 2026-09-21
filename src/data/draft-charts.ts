export const DRAFT_CHART_CATEGORIES = [
  "Mapping scale",
  "Cost and automation",
  "Tissue quality and annotation",
  "Human interfaces and recordings",
  "Data access and scientific use",
  "Simulation, NeuroAI, and impact",
] as const;

export type DraftChart = {
  category: (typeof DRAFT_CHART_CATEGORIES)[number];
  title: string;
  axes: string;
  definition: string;
  constraint: string;
  metricsAnchor?: "tissue-mapped" | "neural-recording-hours";
  metricsNote?: string;
};

/**
 * Sanitized technical definitions. Public-source observations and evidence gaps
 * live separately in draft-chart-evidence.json; no private deliberations are included.
 */
export const DRAFT_CHARTS: readonly DraftChart[] = [
  {
    category: "Mapping scale",
    title: "Brain tissue mapped over time",
    axes: "x-axis: year · y-axis: tissue volume (requested cm³)",
    definition: "Separate imaged, reconstructed, and proofread volume by species and imaging method.",
    constraint: "The current selected-dataset chart reports mm³, not the requested cm³; neither scope is a global total.",
    metricsAnchor: "tissue-mapped",
    metricsNote: "Open the existing selected-dataset Metrics chart (mm³).",
  },
  {
    category: "Mapping scale",
    title: "Largest published connectome over time",
    axes: "x-axis: publication year · y-axis: largest published map (neurons and synapses), log scale",
    definition: "Track separate neuron and synapse frontiers and state the map's completeness.",
    constraint: "A static connectome is neither mapped tissue volume nor a living recording; do not collapse those measures.",
  },
  {
    category: "Mapping scale",
    title: "Connectomics imaging throughput over time",
    axes: "x-axis: year · y-axis: tissue volume per day at stated resolution",
    definition: "Split demonstrated throughput by imaging modality, resolution, and quality threshold.",
    constraint: "Compare sustained end-to-end throughput, not peak imaging speed under unmatched protocols.",
  },
  {
    category: "Cost and automation",
    title: "Cost to map 1 cm³ over time",
    axes: "x-axis: year · y-axis: end-to-end cost per cm³",
    definition: "Include imaging, compute, storage, and proofreading at a comparable quality threshold.",
    constraint: "Do not infer linear scale-up from partial cost reports or omit CPU, memory, storage, or labor.",
  },
  {
    category: "Cost and automation",
    title: "Automated reconstruction accuracy over time",
    axes: "x-axis: evaluation year · y-axis: segmentation accuracy or error-free tracing length",
    definition: "Measure reconstruction quality over time with a fixed reference dataset, benchmark, and metric version, separate from throughput.",
    constraint: "Do not combine leaderboard scores from different datasets, ground truth, metric versions, or completeness targets.",
  },
  {
    category: "Cost and automation",
    title: "Human proofreading burden over time",
    axes: "x-axis: year · y-axis: person-hours per mm³",
    definition: "Measure proofreading time at a fixed reconstruction-quality and completeness threshold.",
    constraint: "Do not compare apparent speed gains when the quality or completeness standard changes.",
  },
  {
    category: "Tissue quality and annotation",
    title: "Human tissue preservation quality over time",
    axes: "x-axis: preservation method or year · y-axis: fraction of sampled connections traceable",
    definition: "Compare traceability assays across human samples and preservation methods.",
    constraint: "A shared, validated quality assay is required before results are comparable.",
  },
  {
    category: "Tissue quality and annotation",
    title: "Tissue loss in subdivision/sectioning over time",
    axes: "x-axis: sample volume or year · y-axis: fraction of tissue lost or damaged",
    definition: "Measure lost or damaged tissue with a stated denominator and sample size.",
    constraint: "Do not substitute sectioning speed or qualitative lossless claims for a measured loss rate.",
  },
  {
    category: "Tissue quality and annotation",
    title: "Molecular annotation coverage over time",
    axes: "x-axis: year · y-axis: validated label coverage (%)",
    definition: "Report cell-type, synaptic-sign, and receptor labels separately from label accuracy.",
    constraint: "Use one selected label class and denominator; coverage is not accuracy.",
  },
  {
    category: "Human interfaces and recordings",
    title: "Humans with implanted high-bandwidth BCIs over time",
    axes: "x-axis: cohort snapshot date · y-axis: unique people",
    definition: "Separate chronic and temporary implants and define included device categories.",
    constraint: "A cohort snapshot is not a global total; do not add overlapping participants or broaden the measure to all neural implants.",
  },
  {
    category: "Human interfaces and recordings",
    title: "Neural recording hours collected over time",
    axes: "x-axis: release date · y-axis: recording hours",
    definition: "Separate species, modality, task, public datasets, and reported private totals.",
    constraint: "Do not sum overlapping releases, mix session-hours with channel-hours, or claim a global unique-hours total.",
    metricsAnchor: "neural-recording-hours",
    metricsNote: "Open the existing selected-dataset Metrics chart.",
  },
  {
    category: "Data access and scientific use",
    title: "Paired structure–function dataset scale over time",
    axes: "x-axis: release year · y-axis: matched neurons in the same specimen",
    definition: "Count neurons with both connectivity maps and functional recordings from the same animal.",
    constraint: "Do not add unmatched anatomy and function datasets to create a paired total.",
  },
  {
    category: "Data access and scientific use",
    title: "Comparative connectomics cohort size over time",
    axes: "x-axis: study year · y-axis: independently mapped specimens",
    definition: "Measure comparable disease, control, or treatment cohorts rather than a single largest map.",
    constraint: "Keep specimen count separate from neuron count, synapse count, and map volume; deduplicate reused animals.",
  },
  {
    category: "Data access and scientific use",
    title: "Open-access connectomics data over time",
    axes: "x-axis: release date · y-axis: publicly accessible data (PB)",
    definition: "Separate raw images from processed reconstructions and record access and license status.",
    constraint: "Deduplicate mirrors and versions; public access does not make every byte independent data.",
  },
  {
    category: "Data access and scientific use",
    title: "Public connectome reuse over time",
    axes: "x-axis: publication year · y-axis: reuse publications as a share of a defined corpus",
    definition: "Count publications that analyze an existing public dataset under stated corpus and counting rules.",
    constraint: "Reuse is not citation; the corpus and reuse classification require validation.",
  },
  {
    category: "Simulation, NeuroAI, and impact",
    title: "Simulation/emulation fidelity over time",
    axes: "x-axis: benchmark version or year · y-axis: held-out activity or behavior prediction",
    definition: "Evaluate fidelity by organism and task using held-out neural activity and behavior benchmarks.",
    constraint: "Do not collapse different organisms, tasks, benchmark versions, or biological-validity standards into one field score.",
  },
  {
    category: "Simulation, NeuroAI, and impact",
    title: "Number of simulations/emulations over time",
    axes: "x-axis: year · y-axis: count (unit unresolved)",
    definition: "The inclusion unit must be chosen explicitly: models, runs, organisms, or independently validated emulations.",
    constraint: "Do not substitute fidelity for count or inflate the series by treating repeated runs as independent models.",
  },
  {
    category: "Simulation, NeuroAI, and impact",
    title: "NeuroAI performance–cost frontier over time",
    axes: "x-axis: training-data requirement or energy use · y-axis: task performance",
    definition: "Plot task-specific Pareto frontiers against matched non-neuro baselines.",
    constraint: "Do not combine incomparable tasks, hardware, energy estimates, or training-data accounting.",
  },
  {
    category: "Simulation, NeuroAI, and impact",
    title: "Demonstrated applications enabled by connectomics over time",
    axes: "x-axis: demonstration date · y-axis: evidence ledger by application stage",
    definition: "Separate therapies, BCIs, and AI applications with documented connectomics contributions.",
    constraint: "Do not make a causal claim from a mention alone; distinguish demonstrations, trials, and deployed products.",
  },
] as const;
