import type { DraftObservation, DraftPlot } from "@/lib/draft-chart-types";

export const CONNECTOMICS_CURATION_SOURCE = {
  title: "EM Datasets, shared by Forrest Collman",
  url: "https://docs.google.com/spreadsheets/d/1PukHvhxTqC72tau9HDnq1LKIl3F6V_FGr_y3G-jjZ-k/edit#gid=0",
} satisfies NonNullable<DraftPlot["curationSource"]>;

type ConnectomicsCheckpoint = {
  id: string;
  plotId: "largest-connectome-neurons" | "tissue-cm3";
  family: string;
  species: string;
  region: string;
  imagingMethod: string;
  scope: string;
  group: string;
  annotation: string;
  sheetRow: number | null;
  sourceVersion: string;
  sourceDate: string;
  sourceUrl: string;
  sourceTitle: string;
  quote: string;
  value: number;
  unit: "neurons" | "µm³";
  qualifier?: string;
};

/** Selected measurements from primary papers; sheet rows identify discovery provenance. */
export const CONNECTOMICS_BACKFILL: readonly ConnectomicsCheckpoint[] = [
  {
    id: "malecns-neurons-2025",
    plotId: "largest-connectome-neurons",
    family: "MaleCNS",
    species: "Drosophila melanogaster",
    region: "Adult male brain and nerve cord",
    imagingMethod: "Enhanced focused ion beam scanning electron microscopy (FIB-SEM)",
    scope: "Proofread and annotated neurons across the central nervous system, including sensory axons.",
    group: "Adult male fly CNS",
    annotation: "MaleCNS · adult male fly CNS",
    sheetRow: 115,
    sourceVersion: "preprint v2",
    sourceDate: "2025-10-30",
    sourceUrl: "https://www.biorxiv.org/content/10.1101/2025.10.09.680999v2.full",
    sourceTitle: "Berg et al. · MaleCNS (bioRxiv v2)",
    quote: "In total, we identified, proofread and annotated 166,691 neurons (including sensory axons) across the entire volume",
    value: 166691,
    unit: "neurons",
  },
  {
    id: "eyewire-ii-neurons-2026",
    plotId: "largest-connectome-neurons",
    family: "Eyewire II",
    species: "Mus musculus",
    region: "Adult mouse retina",
    imagingMethod: "Electron microscopy (EM)",
    scope: "Partial retinal map. Lower bound from the sum of three cell classes after human proofreading: 8,000 bipolar + 13,000 amacrine + 4,000 retinal ganglion cells. Automated detection is complete for synaptic ribbons; conventional synapse detection is in progress.",
    group: "Partial mouse retina",
    annotation: "Eyewire II · partial mouse retina",
    sheetRow: 124,
    sourceVersion: "preprint v1",
    sourceDate: "2026-06-01",
    sourceUrl: "https://www.biorxiv.org/content/10.64898/2026.05.28.727403v1",
    sourceTitle: "Stroeh et al. · Eyewire II (bioRxiv v1)",
    quote: "Human proofreading of an automated reconstruction has so far yielded more than 8, 000 bipolar cells, 13, 000 amacrine cells, and 4, 000 retinal ganglion cells.",
    value: 25000,
    unit: "neurons",
    qualifier: ">",
  },
  {
    id: "white-1986-canonical-neurons",
    plotId: "largest-connectome-neurons",
    family: "White C. elegans",
    species: "Caenorhabditis elegans",
    region: "Canonical hermaphrodite nervous system",
    imagingMethod: "Serial-section electron microscopy with manual reconstruction",
    scope: "Canonical complement in a composite of overlapping specimen series; pharyngeal connectivity was reported previously.",
    group: "Canonical hermaphrodite worm",
    annotation: "White · canonical worm composite",
    sheetRow: 9,
    sourceVersion: "print publication",
    sourceDate: "1986-11-12",
    sourceUrl: "https://doi.org/10.1098/rstb.1986.0056",
    sourceTitle: "White et al. · The structure of the nervous system of C. elegans",
    quote: "The hermaphrodite nervous system has a total complement of 302 neurons, which are arranged in an essentially invariant structure.",
    value: 302,
    unit: "neurons",
  },
  {
    id: "helmstaedter-2013-retina-neurons",
    plotId: "largest-connectome-neurons",
    family: "Helmstaedter mouse retina",
    species: "Mus musculus",
    region: "Inner plexiform layer, partial mouse retina",
    imagingMethod: "Serial block-face electron microscopy with manual skeleton tracing and machine-learning segmentation",
    scope: "The neuronal cohort includes 840 classified neurons and 110 orphan reconstructions. The 173 glial cells are counted separately. Ganglion-cell dendrites and many amacrine dendrites are boundary-truncated.",
    group: "Partial mouse retina",
    annotation: "Helmstaedter · partial retina",
    sheetRow: 28,
    sourceVersion: "online publication",
    sourceDate: "2013-08-07",
    sourceUrl: "https://www.nature.com/articles/nature12346",
    sourceTitle: "Helmstaedter et al. · Connectomic reconstruction of the inner plexiform layer",
    quote: "Here we present for the mouse inner plexiform layer—the main computational neuropil region in the mammalian retina—the dense reconstruction of 950 neurons and their mutual contacts.",
    value: 950,
    unit: "neurons",
  },
  {
    id: "ryan-2016-ciona-cns-neurons",
    plotId: "largest-connectome-neurons",
    family: "Ryan Ciona larva",
    species: "Ciona intestinalis",
    region: "Larval central nervous system (CNS), otolith through caudal nerve cord",
    imagingMethod: "Serial-section transmission electron microscopy with manual tracing",
    scope: "Neurons with axons and presynaptic sites among 301 imaged CNS cells in one larva, two hours after hatching. The series omits rostral and caudal cells.",
    group: "Larval Ciona CNS",
    annotation: "Ryan · larval Ciona CNS",
    sheetRow: 39,
    sourceVersion: "online publication",
    sourceDate: "2016-12-06",
    sourceUrl: "https://elifesciences.org/articles/16962",
    sourceTitle: "Ryan et al. · The CNS connectome of a Ciona tadpole larva",
    quote: "Using serial-section EM we document the synaptic connectome of the larva’s 177 CNS neurons.",
    value: 177,
    unit: "neurons",
  },
  {
    id: "mishchenko-2010-v1-neuropil",
    plotId: "tissue-cm3",
    family: "Mishchenko rat CA1 V1",
    species: "Rattus norvegicus",
    region: "Hippocampal CA1 stratum radiatum",
    imagingMethod: "Serial-section transmission electron microscopy with automated segmentation and expert proofreading",
    scope: "One contiguous V1 neuropil volume: 336 µm³ (0.000000336 mm³), rounded in Table 1. The coordinates describe unexpanded, processed tissue; processes are truncated at the boundary.",
    group: "Rat",
    annotation: "Mishchenko · rat CA1 V1",
    sheetRow: null,
    sourceVersion: "journal issue",
    sourceDate: "2010-09-23",
    sourceUrl: "https://doi.org/10.1016/j.neuron.2010.08.014",
    sourceTitle: "Mishchenko et al. · Ultrastructural analysis of hippocampal neuropil",
    quote: "9.1 × 9.0 × 4.1 = 336μm3",
    value: 336,
    unit: "µm³",
    qualifier: "≈",
  },
];

export function connectomicsCheckpoints(plotId: string): DraftObservation[] {
  return CONNECTOMICS_BACKFILL.filter(record => record.plotId === plotId).map(record => ({
    id: record.id,
    x: Number(record.sourceDate.slice(0, 4)),
    y: record.unit === "µm³" ? record.value / 1e12 : record.value,
    label: record.family,
    group: record.group,
    annotation: record.annotation,
    exportAnnotation: `${record.annotation} · ${record.sourceDate.slice(0, 4)} ${record.sourceVersion} · ${record.qualifier ?? ""}${record.value.toLocaleString("en-US")} ${record.unit}`,
    ...(record.qualifier ? { qualifier: record.qualifier } : {}),
    dateLabel: `${record.sourceDate} · ${record.sourceVersion}`,
    sourceUrl: record.sourceUrl,
    sourceTitle: record.sourceTitle,
    quote: record.quote,
    note: `${record.region} (${record.species}). ${record.imagingMethod}. ${record.scope}${record.sheetRow === null ? "" : ` EM Datasets row ${record.sheetRow}.`}`,
  }));
}
