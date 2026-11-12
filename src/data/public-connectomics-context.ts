import type { DraftReference } from "@/lib/draft-chart-types";

/** Anatomical neuron counts, not completed-connectome targets or byte conversions. */
export const WHOLE_BRAIN_NEURON_REFERENCES: readonly DraftReference[] = [
  {
    id: "mouse-whole-brain-neurons",
    y: 70_890_000,
    label: "Mouse ≈70.9M",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1567708/",
    sourceTitle: "Herculano-Houzel et al. (2006), Cellular scaling rules for rodent brains, Table 1",
    quote: "Mouse 40.4 ± 11.6 0.416 ± 0.028 108.69 ± 16.25 70.89 ± 10.41",
    note: "Table 1 total neurons: 70.89 million, with 10.41 million SD. Isotropic-fractionator estimate across the cerebral cortex, cerebellum and remaining brain areas, including the olfactory bulb. Both mouse hemispheres were counted together. The displayed line uses the published mean; biological and counting uncertainty remain in the source.",
  },
  {
    id: "macaque-whole-brain-neurons",
    y: 6_376_160_000,
    label: "Macaque ≈6.38B",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1805542/",
    sourceTitle: "Herculano-Houzel et al. (2007), Cellular scaling rules for primate brains, Table 1",
    quote: "Macaque monkey 3,900.0 87.346 6,376.16 7,162.90",
    note: "Table 1 total neurons: 6,376.16 million for rhesus macaque (Macaca mulatta); olfactory bulbs excluded. One hemisphere was processed and the result doubled for the brain estimate. This source reports a single macaque value; variation across nonhuman primate species is substantial. The macaque line is a named species reference, rather than a generic primate brain.",
  },
  {
    id: "human-whole-brain-neurons",
    y: 86_100_000_000,
    label: "Human ≈86.1B",
    sourceUrl: "https://doi.org/10.1002/cne.21974",
    sourceTitle: "Azevedo et al. (2009), Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain",
    quote: 'We find that the adult male human brain contains on average 86.1 +/- 8.1 billion NeuN-positive cells ("neurons") and 84.6 +/- 9.8 billion NeuN-negative ("nonneuronal") cells.',
    note: "The primary abstract reports an adult male human brain average of 86.1 billion NeuN-positive cells, with ±8.1 billion reported uncertainty. The line shows the source's rounded mean, derived by isotropic fractionation. This is anatomical population-scale context, with study-specific donor and counting-method scope.",
  },
];
