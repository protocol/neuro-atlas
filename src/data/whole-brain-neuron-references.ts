import type { DraftHorizontalReference } from "@/lib/draft-chart-types";

/** Anatomical estimates for scale context; kept outside the connectome source archive. */
export const WHOLE_BRAIN_NEURON_REFERENCES: readonly DraftHorizontalReference[] = [
  {
    id: "mouse", value: 70_890_000, label: "Mouse ≈70.9M",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1567708/",
    sourceTitle: "Herculano-Houzel et al. (2006), Cellular scaling rules for rodent brains · Table 1",
    scope: "Mouse whole-brain anatomical estimate: 70.89 ± 10.41 million neurons (mean ± SD). Isotropic fractionation; both hemispheres processed, including the olfactory bulb.",
  },
  {
    id: "macaque", value: 6_376_160_000, label: "Macaque ≈6.38B",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1805542/",
    sourceTitle: "Herculano-Houzel et al. (2007), Cellular scaling rules for primate brains · Table 1",
    scope: "Rhesus macaque (Macaca mulatta) whole-brain anatomical estimate: 6,376.16 million neurons. Isotropic fractionation; olfactory bulbs excluded. One hemisphere was processed and its count doubled to estimate the whole brain.",
  },
  {
    id: "human", value: 86_100_000_000, label: "Human ≈86.1B",
    sourceUrl: "https://doi.org/10.1002/cne.21974",
    sourceTitle: "Azevedo et al. (2009), Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain",
    scope: "Adult male human whole-brain anatomical estimate: mean 86.1 ± 8.1 billion NeuN-positive cells (neurons), estimated by isotropic fractionation; value and population scope reported in the publisher abstract.",
  },
];
