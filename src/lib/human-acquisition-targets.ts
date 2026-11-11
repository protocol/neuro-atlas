/** Planning assumptions, separate from the archived acquisition-cost observations. */
export const HUMAN_ACQUISITION_SCENARIO = {
  tissueVolumeCm3: 1_200,
  voxelNm: [4, 4, 40] as const,
  volumeSource: {
    title: "Collins et al. (2025), Comparative prospects of imaging methods for whole-brain mammalian connectomics",
    url: "https://www.cell.com/cell-reports-methods/fulltext/S2667-2375(25)00024-4",
    quote: "the human brain has a volume in the range of 1,200,000 mm3",
  },
  voxelSource: {
    title: "Yin et al. (2020), A petascale automated imaging pipeline",
    url: "https://www.nature.com/articles/s41467-020-18659-3",
    quote: "the montage acquisition magnification (4 nm/pixel)",
    sectionQuote: "After resin embedding, ultrathin sections (40 nm)",
  },
  scope: "Hypothetical whole-human acquisition budgets: 1,200 cm³ of tissue, sampled once at 4 × 4 × 40 nm (anisotropic). One pass, with no overlap, reacquisition, tissue loss, expansion or shrinkage allowance. Preparation, reconstruction, compute, storage and proofreading need separate budgets. The volume is a published planning assumption; voxel geometry comes from a mouse EM protocol. Each plotted source estimate retains its own resolution and cost scope; applying this voxel count to optical or other EM protocols requires separate validation.",
} as const;

/** 1 cm = 10⁷ nm; N = V × 10²¹ / (dx × dy × dz); c = budget × 10⁷ / N. */
export function humanAcquisitionTargets() {
  const { tissueVolumeCm3, voxelNm } = HUMAN_ACQUISITION_SCENARIO;
  const voxelCount = tissueVolumeCm3 * 1e21 / (voxelNm[0] * voxelNm[1] * voxelNm[2]);
  return [
    { budgetDollars: 1e9, label: "$1B" },
    { budgetDollars: 1e8, label: "$100M" },
    { budgetDollars: 1e7, label: "$10M" },
    { budgetDollars: 1e6, label: "$1M" },
    { budgetDollars: 1e5, label: "$100K" },
  ].map(target => ({ ...target, voxelCount, dollarsPer10MVoxels: target.budgetDollars * 1e7 / voxelCount, kind: "hypothetical-acquisition-budget" as const }));
}
