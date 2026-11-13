/** Modeled context only: never merge these scenarios into source observations.
 * Volume sources and demonstrated EM sampling are independent inputs. Applying
 * that sampling densely across an entire brain is an image-capacity scenario,
 * not a demonstrated whole-brain acquisition or a completeness denominator.
 */
export const BRAIN_IMAGE_MODEL = {
  voxelDimensionsNm: [4, 4, 40],
  bytesPerVoxel: 1,
  volumesMm3: { mouse: 450, macaque: 78_550, human: 1_200_000 },
} as const;

const mouseSource = { title: "Adult mouse volume estimate · Volume EM", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4927572/" };
const volumeSource = { title: "Human volume estimate · introduction", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11955263/" };
const samplingSource = { title: "Demonstrated EM sampling · 4 nm pixels, 40 nm sections", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11981939/" };
const macaqueSource = { title: "Rhesus macaque MRI brain-volume cohort · §4.1", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4512905/" };

export type BrainBenchmarkReference = { id: string; value: number; label: string; volumeMm3?: number; budget?: number };
export type BrainBenchmarkContext = {
  toggleLabel: string;
  scopeLabel: string;
  disclosure: string;
  sources: { title: string; url: string }[];
  references: BrainBenchmarkReference[];
};

export const brainImageVoxels = (volumeMm3: number) => volumeMm3 * 1e18 / BRAIN_IMAGE_MODEL.voxelDimensionsNm.reduce((product, side) => product * side, 1);
const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const imageLabel = (value: number) => {
  const rounded = Number(value.toPrecision(2));
  return rounded >= 1e6 ? `${rounded / 1e6}M` : rounded >= 1e3 ? `${rounded / 1e3}K` : number(rounded);
};
const sampling = BRAIN_IMAGE_MODEL.voxelDimensionsNm.join("×");
const volumeBasis = `Adult mouse ≈${number(BRAIN_IMAGE_MODEL.volumesMm3.mouse)} mm³; human ≈${number(BRAIN_IMAGE_MODEL.volumesMm3.human)} mm³. Rhesus macaque ≈${number(BRAIN_IMAGE_MODEL.volumesMm3.macaque)} mm³: 10 postmortem adolescent–adult MRI specimens, mean 78.55 ± 5.49 mL. Brain extraction and fixation can affect volume; this cohort provides approximate scale context.`;
const imageBasis = `Dense ${sampling} nm sampling at ${BRAIN_IMAGE_MODEL.bytesPerVoxel} byte/voxel, using demonstrated EM pixel/section dimensions. Voxels = volume in mm³ × 10¹⁸ ÷ (4 × 4 × 40); PB = voxels × bytes/voxel ÷ 10¹⁵.`;

export function brainBenchmarkContext(plotId: string): BrainBenchmarkContext | undefined {
  if (plotId === "public-data-size") return {
    toggleLabel: "Whole-brain scale",
    scopeLabel: `${sampling} nm · 8-bit raw images`,
    disclosure: `Whole-brain image-equivalent capacity scenarios. ${volumeBasis} ${imageBasis} Stored compressed public resources have heterogeneous resolution, encoding and included products; modeled image capacity is separate from connectome completion.`,
    sources: [mouseSource, volumeSource, samplingSource, macaqueSource],
    references: Object.entries(BRAIN_IMAGE_MODEL.volumesMm3).map(([id, volumeMm3]) => {
      const value = brainImageVoxels(volumeMm3) * BRAIN_IMAGE_MODEL.bytesPerVoxel / 1e15;
      return { id, volumeMm3, value, label: `${id === "macaque" ? "Macaque" : id === "mouse" ? "Mouse" : "Human"} ≈${imageLabel(value)} PB` };
    }),
  };
  if (plotId === "acquisition-economics") return {
    toggleLabel: "Human-brain cost targets",
    scopeLabel: `Human · ${sampling} nm cost scenario`,
    disclosure: `Human-brain image-acquisition-only budget scenarios: $1B, $100M, $10M, $1M and $100K. Human volume ${number(BRAIN_IMAGE_MODEL.volumesMm3.human)} mm³ at dense ${sampling} nm sampling gives ${number(brainImageVoxels(BRAIN_IMAGE_MODEL.volumesMm3.human))} voxels. Target $/10M voxels = budget ÷ (human voxels ÷ 10,000,000). Preparation, labeling, alignment, reconstruction, proofreading and storage require additional budgets. Optical and EM observations retain their own resolution and biological scope; the common voxel scenario is a scale comparison.`,
    sources: [volumeSource, samplingSource],
    references: [1e9, 1e8, 1e7, 1e6, 1e5].map((budget, index) => {
      const value = budget / (brainImageVoxels(BRAIN_IMAGE_MODEL.volumesMm3.human) / 10_000_000);
      const name = ["$1B", "$100M", "$10M", "$1M", "$100K"][index];
      return { id: `human-budget-${budget}`, budget, value, label: `${name} · $${value.toExponential(2).replace("e+", "e")}` };
    }),
  };
  return undefined;
}
