/** Koch et al. (2006), Results: “How Much Information Does the Eye Send the Brain?”
 * Independent-channel animal estimate and an explicitly scaled human scenario.
 * This module is deliberately outside the observation and fit projections.
 */
export const RETINAL_OUTPUT = {
  source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/",
  animalBitsPerSecond: 875_000,
  animalAxons: 100_000,
  humanGanglionCells: 1_000_000,
} as const;
export const humanRetinalScenario = RETINAL_OUTPUT.animalBitsPerSecond * RETINAL_OUTPUT.humanGanglionCells / RETINAL_OUTPUT.animalAxons;
