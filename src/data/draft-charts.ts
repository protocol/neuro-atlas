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
    definition: "Selected tissue volumes by species, imaging method and reconstruction scope.",
    constraint: "The chart reports cm³ for selected specimens. Sample bounds, imaged volume and neuropil volume retain their source-specific meanings.",
    metricsAnchor: "tissue-mapped",
    metricsNote: "Selected tissue-volume checkpoints in cm³.",
  },
  {
    category: "Mapping scale",
    title: "Largest published connectome over time",
    axes: "x-axis: publication year · y-axis: largest published map (neurons and synapses), log scale",
    definition: "Published neuron and synapse counts, with specimen boundaries and reconstruction completeness retained.",
    constraint: "Comparisons depend on species, map extent, neuronal completeness and synapse-detection or attachment criteria.",
  },
  {
    category: "Mapping scale",
    title: "Connectomics imaging throughput over time",
    axes: "x-axis: year · y-axis: tissue volume per day at stated resolution",
    definition: "Reported EM image-acquisition volume per day at the stated resolution and protocol.",
    constraint: "Rates cover acquisition. Preparation, alignment, reconstruction and quality control require additional time; protocols use different resolutions.",
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
    definition: "Tracing quality on a fixed reference dataset, benchmark and metric version, alongside study-specific split and merge error rates.",
    constraint: "Comparisons require matched ground truth, evaluation rules and completeness targets. Each plotted benchmark is a fixed study snapshot.",
  },
  {
    category: "Cost and automation",
    title: "Human proofreading burden over time",
    axes: "x-axis: year · y-axis: person-hours per mm³",
    definition: "Reported project proofreading effort, with each project's map scope and completeness target.",
    constraint: "Labor comparisons require the same task, reconstruction quality and completeness threshold. Plotted values use reported person-years.",
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
    definition: "Unique recipients in selected chronic intracortical research cohorts at dated checkpoints.",
    constraint: "Program checkpoints can overlap historical cohorts and supplier reports. Dates identify implantation months, disclosures or publications as labeled.",
  },
  {
    category: "Human interfaces and recordings",
    title: "Neural recording hours collected over time",
    axes: "x-axis: release date · y-axis: recording hours",
    definition: "Reported recording duration in selected datasets and company disclosures, separated by species, modality, access and reuse.",
    constraint: "Overlapping releases and reused training data retain separate identities. Durations count recording time once across channels; quality-control and access conditions vary.",
    metricsAnchor: "neural-recording-hours",
    metricsNote: "Selected recording durations with dataset-specific access and reuse conditions.",
  },
  {
    category: "Data access and scientific use",
    title: "Paired structure–function dataset scale over time",
    axes: "x-axis: release year · y-axis: matched neurons in the same specimen",
    definition: "Neuronal identities matched between connectivity maps and functional recordings from the same specimen.",
    constraint: "Matching methods and completeness differ by study. Manual and automated MICrONS tables overlap the same dataset.",
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
    definition: "Public image and resource footprints with product scope, encoding, access and report or measurement date.",
    constraint: "Image encodings, derived products, mirrors and versions can overlap. Footprints depend on the products included in each source total.",
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
    definition: "FlyVis contrast-preference predictions evaluated against held-out physiological measurements for characterized cell-type/compartment labels.",
    constraint: "The two 2024 model results share the same contrast-preference benchmark; validation is specific to this task and label set.",
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
    definition: "ImageNet-1K accuracy compared with operation-count estimates of inference energy for selected spiking models and a non-spiking baseline.",
    constraint: "Rows share 224×224 inference and 32-bit operations at 45 nm. The comparison is cross-sectional, with measured accuracy and estimated energy.",
  },
  {
    category: "Simulation, NeuroAI, and impact",
    title: "Demonstrated applications enabled by connectomics over time",
    axes: "x-axis: demonstration date · y-axis: evidence ledger by application stage",
    definition: "Selected synaptic-connectome applications, classified by research-demonstration or biological-validation stage.",
    constraint: "Events retain their documented research stage and publication date. Evidence is specific to the reported application and evaluation.",
  },
] as const;
