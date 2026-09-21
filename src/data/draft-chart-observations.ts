import raw from "./draft-chart-evidence.json";
import type { DraftChartEvidence } from "@/lib/draft-chart-types";

/** Curated public-source evidence; never inferred annual observations. */
export const DRAFT_CHART_EVIDENCE: Record<string, DraftChartEvidence> = raw as Record<string, DraftChartEvidence>;
