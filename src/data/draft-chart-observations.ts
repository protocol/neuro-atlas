import raw from "./draft-chart-evidence.json";
import type { DraftChartEvidence, DraftPlot } from "@/lib/draft-chart-types";

// Reader copy is projected separately so source quotations and archived evidence stay exact.
const summaries: Record<string, Pick<DraftChartEvidence, "summary"> & Partial<Pick<DraftChartEvidence, "gapReason">>> = {
  "Brain tissue mapped over time": {
    summary: "Selected synapse-resolution tissue volumes in cm³, with specimen and reconstruction scope retained.",
  },
  "Largest published connectome over time": {
    summary: "Selected published neuron and synapse counts across whole and partial maps.",
    gapReason: "The selected studies use different specimen boundaries and reconstruction-completeness criteria.",
  },
  "Connectomics imaging throughput over time": {
    summary: "Selected source-reported EM acquisition rates at each protocol's stated resolution.",
    gapReason: "The rates cover image acquisition; preparation, alignment and reconstruction require additional time.",
  },
  "Automated reconstruction accuracy over time": {
    summary: "Fixed-benchmark tracing quality and split–merge error trade-offs from separate studies.",
    gapReason: "PATHFINDER reports normalized error-free tracing length; RoboEM reports split and merge errors per mm of axon path. Each is a study-specific evaluation snapshot.",
  },
  "Human proofreading burden over time": {
    summary: "Reported fly-project proofreading effort. MICrONS separately reports 1,433 proofread axons among 84,035 segmented neurons (≈1.7%), with varying extension.",
    gapReason: "NeuVue v2 (2026) reports 2,451 hours of merge correction/cleanup; v1 (2022) reports 3,740 cumulative hours and ≈3,600 campaign hours. These versions overlap and cover different tasks. Full dense-volume labor and common-quality person-hours/mm³ remain unmeasured. Sources: https://www.nature.com/articles/s41586-025-08790-w ; https://www.biorxiv.org/content/10.1101/2022.07.18.500521v1.full ; https://www.biorxiv.org/content/10.1101/2022.07.18.500521v2.full",
  },
  "Humans with implanted high-bandwidth BCIs over time": {
    summary: "Selected chronic intracortical research cohorts, shown as separate program checkpoints.",
  },
  "Neural recording hours collected over time": {
    summary: "Reported recording durations across selected intracortical, scalp EEG, intracranial and primate training datasets, with access and reuse distinguished.",
  },
  "Paired structure–function dataset scale over time": {
    summary: "Neuronal identities matched between anatomy and activity in the same specimen, using study-specific matching methods.",
  },
  "Open-access connectomics data over time": {
    summary: "Selected public connectomics image and resource footprints, reported by producers or measured in public storage.",
    gapReason: "Published totals cover different image and derived products. MaleCNS uses a November 3, 2026 JPEG-storage inventory; release-day byte inventories and matched image/derived partitions remain unavailable. Fish1 is a separate public dataset with an unverified footprint. Fish Fire&Wire (Fish2) has request-only research-group access, redistribution restrictions and a publication embargo until December 1, 2027; its footprint remains unverified.",
  },
  "Simulation/emulation fidelity over time": {
    summary: "FlyVis predictions of held-out physiological contrast preferences in a fixed 2024 cell-type benchmark.",
    gapReason: "Validation covers this contrast-preference task and the same 32 characterized cell-type/compartment labels.",
  },
  "NeuroAI performance–cost frontier over time": {
    summary: "ImageNet-1K accuracy versus inference energy estimated from operation counts.",
    gapReason: "A cross-sectional 2023 benchmark under shared operation-count energy assumptions.",
  },
  "Demonstrated applications enabled by connectomics over time": {
    summary: "Selected synaptic-connectome applications, classified as research demonstrations or biological validation.",
    gapReason: "The selected evidence covers research-stage applications.",
  },
};

const plotCopy: Record<string, Pick<DraftPlot, "scope"> & Partial<Pick<DraftPlot, "seriesNote">>> = {
  "tissue-cm3": {
    scope: "Selected human, mouse and fruit fly tissue volumes at synapse resolution. Sample bounds, imaged volume and neuropil volume describe different specimen extents; reconstruction completeness varies. Values are converted from mm³ ÷ 1,000; ≈ denotes approximate sample bounds.",
  },
  "largest-connectome-neurons": {
    scope: "Selected published neuronal counts across whole-brain and partial maps. Somatic neuron counts and targeted boundary-truncated reconstructions have different completeness criteria.",
  },
  "largest-connectome-synapses": {
    scope: "Selected counts of paired pre/post contacts or automatically detected clefts. Whole and partial maps differ in coverage, synapse attachment and proofreading.",
  },
  "acquisition-rates": {
    scope: "Selected EM image-acquisition rates at each protocol's resolution. Rates use reported dimensions, elapsed time or montage count; > denotes a lower bound. Preparation, alignment and reconstruction are additional stages.",
  },
  "acquisition-economics": {
    scope: "Rough author estimates of acquisition costs at each protocol's resolution, labeling and biological scope. PEEM includes prospective throughput. Coverage of tissue preparation, reconstruction, storage and proofreading costs is unverified.",
    seriesNote: "Costs use the published Table A1 Approx. Voxels/$ estimates; protocols have different resolution and biological scope.",
  },
  "pathfinder-nerl": {
    scope: "PATHFINDER 2025 preprint v1: normalized error-free tracing length on one fixed mouse unmyelinated-axon ground-truth set. The point uses the preprint posting year; evaluation timing is unspecified.",
  },
  "connectomics-roboem-human-split-merge": {
    scope: "RoboEM (2024), Figure 2b: operating points for H01 human multiSEM, Si150L4 mouse multiSEM and mouse SBEM. Colors distinguish species; symbols distinguish test datasets.",
    seriesNote: "Lower error rates are better on both axes. Workbook values are exact, with the original axes transposed. Acquisition, segmentation, test axons and correction settings differ across datasets. Merge detection uses >2.2 µm excursions from ground truth; baseline events carry weight 0.5 per neurite and new RoboEM multiSEM mergers weight 1. Split evaluation omits agglomerates with ≤2.5 µm ground-truth overlap, retaining about 90% of the path. Uncertainty intervals are unspecified in the workbook.",
  },
  "proofreading-effort": {
    scope: "Reported proofreading person-years for projects with different map scope and completeness. >50 is a lower bound; ≈33 is an author estimate. Values retain each project's work-year convention.",
    seriesNote: "MICrONS axon proofreading covers varying extensions in subvolume 65. NeuVue hours cover merge correction/cleanup. Both have narrower scope than complete axonal tracing across the full volume; comparisons require matched tasks and completeness targets.",
  },
  "neuralink-cumulative": {
    scope: "Selected chronic intracortical research cohorts at publication or company-disclosure checkpoints. BrainGate covers 2004–2021; Neuralink reports cumulative recipients; Paradromics reports its first long-term recipient. Cohort overlap and observation dates limit comparisons.",
  },
  "neuralink-private-intracortical-hours": {
    scope: "October 1, 2026 company disclosure of >50,000 hours streamed by human trial participants. Data are company-held; live-use results use participant-specific pretraining. Session-union and quality-filter rules are unspecified.",
  },
  "tusz-scalp-eeg": {
    scope: "Maintainer-reported full TUSZ seizure-corpus release durations, including held-out evaluation data. Registration-controlled TUSZ is a subset of TUEG; releases overlap.",
  },
  "ajile12-intracranial": {
    scope: "DANDI 000055/0.220127.0436: reported ECoG/depth recording duration from 12 participants, openly released under CC-BY-4.0. Recording gaps and preprocessing affect quality-valid duration.",
  },
  "poyo-primate-training": {
    scope: "Reported model-training corpus drawn from existing recordings of seven nonhuman primates. Constituent datasets have varying access; the duration measures reused training data.",
  },
  "japaneeg-scalp-eeg": {
    scope: "Author-reported Japanese speech dataset from three participants, released through OpenNeuro under CC0. Simultaneous EEG, EMG and audio contribute one EEG recording duration.",
  },
  "paired-manual": {
    scope: "Selected same-specimen neuronal matches between calcium recordings and electron microscopy. Lee 2016 uses manual matching; Turner 2022 uses EM-assisted EASE extraction; MICrONS 2025 uses expert alignment. Counts and completeness are study-specific; the automated MICrONS table overlaps the manual table.",
  },
  "public-data-size": {
    scope: "Selected public connectomics footprints with different sample size, resolution, encoding and included products. Colors distinguish published image sizes, broader resource reports and a measured JPEG pyramid. Dates identify reports or storage measurements. 1 PB = 1,000 TB = 10¹⁵ bytes.",
  },
  "flyvis-contrast": {
    scope: "Fixed 2024 contrast-preference benchmark across 32 characterized cell-type/compartment labels. Ensemble median: 32/32 = 100%; task-optimal single model: 30/32 = 93.75%.",
  },
  "neuroai-imagenet": {
    scope: "Selected 2023 paper rows on the same 224×224 ImageNet-1K benchmark: 32-bit operations at 45 nm, with 5 spiking configurations and 1 non-spiking baseline. Accuracy is measured; energy is estimated from operation counts.",
  },
};

const pointNotes: Record<string, string> = {
  "bock-mouse-imaged-2011-01-01": "Source: “Reconstruction encompasses 450 X 350 X 52 um volume of tissue.” Geometric volume: 450 × 350 × 52 / 10⁹ = 0.00819 mm³. Publication-year checkpoint; first release timing and dense reconstruction completeness are unspecified.",
  "hemibrain-fly-bounds-2020-01-01": "Source: “The hemibrain sample is roughly 250 × 250 × 250 μm.” Geometric product: 0.015625 mm³, displayed approximately 0.0156. The value describes approximate sample bounds; acquisition-mask volume and exact release timing are unspecified.",
  "h01-human-imaged-2021-06-01": "Source: “roughly one cubic millimeter of brain tissue.” June 1, 2021 release announcement. Automated segmentation and annotated synapses; selected cells proofread. The later 1.05-mm³ compression-corrected estimate describes the same specimen.",
  "microns-mouse-imaged-2021-07-01": "Source: “first public data released on the cubic millimeter dataset in July 2021.” Approximate nominal sample volume, dated to the release month. The 2025 paper analyzes the same specimen; valid segmentation-mask volume is unspecified.",
  "flywire-fly-neuropil-2024-01-01": "Source: “The whole brain contains 0.0175 mm³ of neuropil volume.” Publication-year checkpoint; the reconstruction reuses FAFB imagery.",
  "liconn-mouse-native-2025-01-01": "Figure 1: “0.95 × 10⁶ µm³ before” expansion, equivalent to 0.00095 mm³ of native tissue. Automated dense reconstruction with synaptic molecular predictions and selected traced validation regions. Publication-year checkpoint; first final-dataset release timing is unspecified.",
  "malecns-fly-imaged-2025-10-03": "Preprint: “0.082 mm3 total volume” (160 teravoxels at 8-nm isotropic resolution). Release history at https://male-cns.janelia.org/ : “2025-10-03 - MaleCNS v0.9 released”. Later v1.0 and the 2026 publication reuse this specimen; synaptic partner proofreading remains partial.",
  "lee-reid-2016-neuronal-targets": "Table 1: 1,278 excitatory neuronal targets in a boundary-truncated reconstruction of the middle 450 × 450 × 50 µm of a 450 × 450 × 150 µm imaged volume. Postsynaptic dendrites were followed to soma or boundary; input-axon coverage is limited to the imaged region. Presynaptic and postsynaptic categories overlap. Public author manuscript: https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4844839/fullTextXML",
  "hemibrain-neurons": "Partial adult female Drosophila central brain; specimen boundaries truncate neurons.",
  "larval-brain-neurons": "Whole larval fly brain; nervous-system coverage is limited to the brain. Its neuron count is smaller than earlier partial adult maps.",
  "flywire-neurons": "Whole adult female fly brain including optic lobes. Neuronal morphology is proofread; the paper reports 44.7% postsynapse attachment.",
  "microns-neurons": "Individually segmented somatic neurons in partial mouse visual cortex. The 200,000+ total cells include other cell types; 84,035 is the segmented-neuron count. Proofreading covers selected processes in subvolume 65.",
  "hemibrain-synapses": "Partial adult female Drosophila central brain; specimen boundaries truncate neurons. Synapses count paired pre/post contacts; multiple contacts can join the same neuron pair.",
  "larval-brain-synapses": "Whole larval fly brain; nervous-system coverage is limited to the brain. Its synapse count is smaller than earlier partial adult maps. Synapses count paired pre/post contacts; multiple contacts can join the same neuron pair.",
  "flywire-synapses": "Whole adult female fly brain including optic lobes. Morphology is proofread; the paper reports 44.7% postsynapse attachment. Synapses count paired pre/post contacts; multiple contacts can join the same neuron pair.",
  "microns-synapses": "Automatically detected/associated clefts across mouse cortical subvolumes 35 and 65, with partial proofreading. The author-rounded total is 524m; independently rounded components are 186m and 337m.",
  "fib-sem-2017": "100-day acquisition including documented interruptions, on one instrument with 8×8×8 nm voxels. Volume uses approximate final specimen bounds. Preparation and reconstruction require additional time. Derivation: {\"formula\": \"180*100*50 / 1e9 / 100\", \"input_units\": \"um3 / um3-per-mm3 / days\", \"basis\": \"reported final dimensions and actual elapsed acquisition period\"}",
  "autotem-2020": "Lower bound from >70 montages/day, a 1 mm2 section ROI and nominal 40 nm thickness, at 4 nm pixels. The rate describes nominal montage-slab volume; valid-tissue coverage, section preparation and alignment/reconstruction require separate accounting. Derivation: {\"formula\": \"70 * 1 mm2 * (40 / 1e6) mm\", \"basis\": \"reported daily montage count, montage area and nominal thickness\"}",
  "pathfinder-nerl-2025": "Preprint v1 benchmark: nERL = ERL / maximum ERL of this ground-truth set. Mouse IBEAM-mSEM, 80.4×84.8×99.2 um3; unmyelinated axons with 4,284 mm total path. Evaluation uses node thresholds and omits a boundary margin when counting splits. The percentage measures normalized error-free tracing length.",
  "hemibrain-proofreading": "Over 50 person-years at the project's reconstruction-completeness target. Work-year duration and quality-matched volume normalization remain unspecified.",
  "flywire-proofreading": "Around 33 person-years of estimated adult whole-brain effort. Twig attachment remains partial; completeness standards differ from hemibrain.",
  "braingate-documented-cohort-2023-01-13": "14 unique recipients in the safety cohort covering 2004–December 2021, published Jan 13, 2023. Chronic penetrating intracortical recording with one or two 96-channel Utah arrays per person. One participant spans both trial generations. The cohort overlaps the historical global review, Blackrock supplier totals and the 2025 performance preprint; the latter covers these same 14 recipients and earlier enrollment only.",
  "neuralink-cumulative-2024-01-01": "April 12, 2024 disclosure: “In January, we conducted the first human implantation.” Implantation timing has month precision.",
  "neuralink-cumulative-2024-07-01": "August 21, 2024 disclosure: “Last month, Alex ... the second participant ... received his Neuralink implant.” July implantation month; cumulative two recipients.",
  "neuralink-cumulative-2025-02-05": "Source: “Today, there are three people with Telepathy: Noland, Alex, and Brad.” The point uses the disclosure date; individual surgery dates remain unspecified.",
  "neuralink-cumulative-2025-06-02": "Source: “Five individuals with severe paralysis are now using Neuralink to control digital and physical devices with their thoughts.” The disclosure describes post-implant use by five recipients.",
  "neuralink-cumulative-2026-01-28": "Company headline: “21 Neuralnauts enrolled”. Implantation is supported by the body text, “higher signal quality across 18 of the subsequent 20 participants”, following the first recipient. Company-reported cumulative checkpoint dated Jan 28; the page was modified Feb 2. Current active-user status remains unaudited.",
  "paradromics-connect-one-2026-06-17": "June 17, 2026 disclosure: “The first participant ... was enrolled and implanted ... and will be followed and evaluated over the next six years.” At least one long-term recipient; surgery timing is unspecified. The cohort covers long-term implantation, with the earlier temporary 2025 epilepsy implantation counted separately.",
  "neuralink-reported-hours-2026-10-01": "Company-reported accumulated unlabeled freeform neural recording duration from human trial participants. Live-use results use participant-specific encoders pretrained on thousands of hours each. Formal session-union, gap and quality-control rules, contributor count and public access remain unspecified. The first participant's >9,000 hours is a subset of the disclosed total.",
  "ajile12-intracranial-2022-01-27": "Release metadata: “Neural recordings are available at 500 Hz from at least 64 electrodes per participant, for a total of 1280 hours.” Published January 27, 2022. Duration counts recording time once across electrodes; gaps and preprocessing affect quality-valid hours.",
  "poyo-primate-training-2023-10-24": "Abstract: “over 100 hours of recordings” from seven nonhuman primates and over 158 sessions. The strict lower bound describes existing recordings reused for training; access varies by constituent dataset.",
  "japaneeg-scalp-eeg-2026-05-31": "Abstract: “1020 hours of simultaneously recorded scalp electroencephalography (EEG), facial electromyography (EMG), and speech audio”; authors report an OpenNeuro release under CC0. The point uses descriptor submission timing; archive upload timing remains unverified. Duration counts simultaneous modalities once; the full manifest remains unenumerated.",
  "lee2016-paired": "GCaMP3 two-photon calcium + serial TEM, with vascular/morphology alignment and manual tracing. 50 functionally characterized identities: 46 L2/3 excitatory cells plus 4 deep-layer neurons represented by apical dendrites. Connectivity is reconstructed locally within the larger set of 1,278 anatomical targets.",
  "turner2022-paired": "Two-photon calcium + EM, with manual soma registration and EM-assisted EASE trace extraction. Matched usable responses for 112 of 363 reconstructed pyramidal cells, restricted to overlapping visually responsive cells. The point uses the 2022 publication year; the anatomical preprint appeared in 2019.",
  "microns2025-manual": "GCaMP6s two-photon + serial TEM, with transform-guided expert matching of unique EM neurons. The 19,181 ROIs are a separate count. The automated table reports 37,364 matches at 83% precision against manual matching and overlaps the same dataset. Matching establishes neuronal identity; proofreading of individual neurites remains partial.",
  "hildebrand-zebrafish-public-images-2017": "The May 10, 2017 paper reports approximately 2.7 TB of aligned multiresolution compressed PNG images, including targeted peripheral imagery and small registered reference-atlas components. It separately describes 2.4 TB and 4.9 TB imaging products. This is the Hildebrand larval-zebrafish resource; Fish1 is a separate dataset.",
  "fafb-image-download-2018": "The July 19, 2018 paper reports a downloadable 12 TB image representation and approximately 106 TB of acquired camera images. The plotted value covers the download product. FAFB imagery underlies FlyWire; first release timing is unestablished. Paper alignment v13 is retired in favor of v14; lossless PNG is an alternate encoding.",
  "hemibrain-v1": "The release page reports 26+ TB of data; encoding and included products are unspecified for that figure. Public products include images and derived data. The 25 MB connectivity graph is a separate product.",
  "h01-2021": "The June 1, 2021 announcement describes a 1.4 PB rendering, captioned as 1.4 petabytes of images, for roughly 1 mm³ of human cortex. Images and derived products are public; byte membership of the headline total is unspecified. Current imagery is JPEG at 4 × 4 × 33 nm. The 2024 paper describes the same specimen.",
  "microns-2025-size": "The April 9, 2025 producer report gives 1.6 PB for the wiring diagram and its data; included byte products are unspecified. First public release: July 2021. The v117 manifest separately lists 117 TB and 55 TB of EM images (172 TB combined). Source: https://www.microns-explorer.org/manifests/mm3-v117 . AWS and Google mirror the same specimen.",
  "malecns-jpeg-inventory-2026": "Public inventory of gs://flyem-male-cns/em/em-clahe-jpeg/ on November 3, 2026: 50,910,260,068,834 bytes across 27,594 image shards and one 633-byte metadata file, including all 11 resolution levels. Native 8 nm imagery: 44,428,865,656,516 bytes. Initial release: October 2025; v1.0 in June 2026 refined proofreading and annotations. Separate N5 imagery, segmentation, meshes and tables have separate footprints. The linked audit retains the complete snapshot and two-API verification. Tissue volume is 0.054 mm³, including brain and ventral nerve cord.",
  "flyvis-0": "Correct contrast preference for 32 of 32 cell-type/compartment labels, using the aggregated ensemble prediction.",
  "flyvis-1": "Correct contrast preference for 30 of the same 32 labels. The single model was selected by optic-flow task performance; physiological contrast measurements were held out from fitting.",
};

const source = raw as Record<string, DraftChartEvidence>;
const eventNotes: Record<string, string> = {
  "application-0": "Research benchmark using a worm synaptic graph transformed into a directed acyclic graph (DAG), with neurons implemented as convolutional units. Evidence covers performance on the reported benchmark.",
  "application-2": "Mechanistic biological research application supported by the reported synaptic-connectome analysis.",
};
// Repeated benchmark/release notes retain each exact workbook range or release sentence.
for (const point of source["Automated reconstruction accuracy over time"].plots.find(plot => plot.id === "connectomics-roboem-human-split-merge")!.points) {
  const test = point.group === "Human · H01 multiSEM"
    ? "5 randomly/densely seeded test axons, 1.4 mm path length (paper-rounded), in a (150 µm)^3 H01 human multiSEM subvolume; five separate training axons. The 6.5-mm soma-seeded set is a separate sample."
    : point.group === "Mouse · Si150L4 multiSEM"
      ? "5 randomly/densely seeded test axons, 1.7 mm path length (paper-rounded), in a (150 µm)^3 Si150L4 mouse S1 L4 multiSEM subvolume."
      : "10 randomly/densely seeded test axons, 1.7 mm path length (paper-rounded), in a 92.6 × 61.8 × 94.8 µm³ mouse S1 L4 SBEM volume. The Motta et al. 2019 baseline/human reference is reproduced and evaluated here.";
  pointNotes[point.id] = `${point.note!.split(". Quote columns:")[0]}. ${test} Workbook B=split errors/mm and C=merge errors/mm. Methods: ${point.note!.split("Methods: ")[1]}`;
}
for (const point of source["Neural recording hours collected over time"].plots.find(plot => plot.id === "tusz-scalp-eeg")!.points) {
  pointNotes[point.id] = `${point.note!.split(". Full corpus size")[0]}. Full recording duration includes held-out evaluation; the accompanying poster withholds the evaluation partition. Registration-controlled releases overlap; annotation revisions can retain the same duration.`;
}

// Keep the existing per-10M-voxel conversion in metric-chart-visibility as the only numeric projection.
const costDetails: Record<string, string> = {
  exm2015: "Chen et al. (2015) supplies effective optical resolution; voxel sampling for this cost estimate is unspecified.",
  sem2018: "2018 is the table year; first-demonstration timing and resolution are unspecified. Reference 55 is Hughes et al. 2014. SBFSEM2004 and Denk & Horstmann 2004 describe a separate attribution.",
  exllsm2019: "Primary acquisition rate: 10–100 million voxels/s. Dollar efficiency is an author estimate. Effective optical resolution uses 4x expansion; the primary paper separately describes ~30–50 nm voxels.",
  exaspim2023: "Table year: 2023 preprint; final publication: 2025. The final eLife version reports a maximum 946 Mvox/s; Table A1 gives 1e12 vox/h. Effective optical resolution with 4x expansion comes from the final version; applicability to the 2023 cost setting is unverified.",
  multisem506: "91 beams (the 505 has 61). The stated rounded vox/$ estimate differs from arithmetic using cost and throughput. ZEISS brochure sampling is 4 nm pixels and a 50 nm section; applicability to the Table A1 cost setting is unverified.",
  multisem706: "91 beams. Figure 2 appears near 2e9 vox/$; Table A1 gives 1e9. The point uses the table value and 2025 table year; launch timing is unverified. Current vendor pixel size and section thickness are contextual examples with an unverified match to the cost setting.",
  mesospim2024: "Table A1 includes this row; Figure 2 omits it. Micron-scale light-sheet optical imagery, with best reported optical resolution and unspecified voxel sampling. Expansion microscopy is optional.",
  peem2024: "Table year: 2024; cited PNAS publication: 2025. The ~2 Gvox/s net scenario and 8x8x30 nm mouse-brain setting are prospective. The paper demonstrates synaptic-resolution PEEM and faster imaging at coarser resolution.",
  bdtem2024: "Primary measured net rate: ~0.3 Gpixel/s. Four scopes/one mm3/five weeks is a projection. The paper tests 3 or 4 nm pixels; section thickness and the setting matched to Table A1 costs are unspecified.",
};
for (const point of source["Connectomics imaging throughput over time"].plots.find(plot => plot.id === "acquisition-economics")!.points) {
  pointNotes[point.id] = `${point.note!.split(". Verbatim numeric column")[0]}. Crowdsourced acquisition-cost estimate. Table A1 labels cost “Total Cost ($/h)”; composition, amortization, utilization, labor, maintenance and price-year are unspecified. ${costDetails[point.id]} Display transformation:${point.note!.split("Display transformation:")[1]}`;
}

/** Curated public-source evidence with reader-facing prose; annual observations remain source-defined. */
export const DRAFT_CHART_EVIDENCE: Record<string, DraftChartEvidence> = Object.fromEntries(
  Object.entries(source).map(([title, evidence]) => [title, {
    ...evidence,
    ...summaries[title],
    plots: evidence.plots.map(plot => plotCopy[plot.id] ? {
      ...plot,
      ...plotCopy[plot.id],
      points: plot.points.map(point => pointNotes[point.id] ? { ...point, note: pointNotes[point.id] } : point),
    } : plot),
    ...(evidence.timeline ? { timeline: {
      ...evidence.timeline,
      scope: "Selected synaptic-connectome research applications, grouped by demonstration or biological-validation stage. Dates identify publications; first-use timing remains uncertain. The selection covers synaptic-connectome studies.",
      events: evidence.timeline.events.map(event => ({
        ...event,
        note: eventNotes[event.id] ?? event.note,
      })),
    } } : {}),
  }]),
);
