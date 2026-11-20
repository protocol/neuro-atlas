/** Koch et al. (2006), How Much the Eye Tells the Brain.
 * Independent-channel guinea pig estimate, scaled to a human retinal scenario;
 * deliberately separate from BCI observations and fit inputs.
 */
export const RETINAL_OUTPUT = {
  source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/",
  animalBitsPerSecond: 875_000,
  animalAxons: 100_000,
  humanGanglionCells: 1_000_000,
} as const;
export const humanRetinalScenario = RETINAL_OUTPUT.animalBitsPerSecond * (RETINAL_OUTPUT.humanGanglionCells / RETINAL_OUTPUT.animalAxons);
export const retinalScenarioLabel = "Eye → brain ≈9 Mb/s · animal-scaled human retinal scenario";
export const retinalScenarioAssumptions = "Koch et al. (2006) estimated 875,000 bits/s across about 100,000 guinea pig optic-nerve axons. Scaling to about 1,000,000 human retinal ganglion cells gives 875,000 × (1,000,000 / 100,000) = 8,750,000 bits/s. This assumes independent channels and ignores inter-cell correlations; it is not a direct human measurement, channel capacity, or BCI target. Sensory input and task-specific BCI communication rates measure different things.";
