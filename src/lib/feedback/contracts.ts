/** Browser-safe frozen DTOs. No database/provider credentials in this module. */
import { draftChartAnchors, metricChartAnchors } from "../../data/draft-chart-links";
export type FeedbackInput = {
  privateComment: string;
  publicTask: {title: string; summary: string; acceptance: string[]};
  publicApproval: {approved: true; policyVersion: "atlas-feedback-v1"};
  context: {
    route: "/" | "/field-velocity" | "/funding" | "/milestones" | "/ecosystem" | "/methodology";
    targetId?: string; chartId?: string; scenario?: string;
    viewport: {width: number; height: number}; theme: "light" | "dark" | "system";
    deployedRevision?: string;
  };
};
export type FeedbackElementReference = {
  /** Structural tag/nth-of-type locator only: no text, HTML, attributes, values or URLs. */
  selector: string;
  tagName: string;
  role?: string;
  classes?: string[];
};
export const FEEDBACK_SIMPLE_POLICY_VERSION = "atlas-feedback-simple-v1" as const;
export type SimpleFeedbackInput = {
  feedback: string;
  processingConsent: { approved: true; policyVersion: typeof FEEDBACK_SIMPLE_POLICY_VERSION };
  context: FeedbackInput["context"] & { element?: FeedbackElementReference };
};
export type FeedbackSubmission = FeedbackInput | SimpleFeedbackInput;
export type FeedbackState = "received" | "queued" | "working" | "validating" | "publishing" | "pr_ready" | "merged" | "live" | "needs_clarification" | "needs_human_review" | "failed" | "cancelled";
export type FeedbackStatus = {
  id: string; version: number; state: FeedbackState; createdAt: string; updatedAt: string;
  reasonCode?: string; clarification?: string; pr?: {number: number; url: string; headSha: string};
  preview?: {url: string; verifiedSha: string}; mergedSha?: string; liveSha?: string;
};
export type FeedbackSession =
  | {session: string; expiresAt: string; provider?: 'github'; actor: {githubId: number; login: string}}
  | {session: string; expiresAt: string; provider: 'linear'; actor: {linearId: string; workspaceId: string; login: string}};
export type FeedbackReceipt = Pick<FeedbackStatus, "id" | "state" | "version">;
export const FEEDBACK_SESSION_HEADER = "X-Atlas-Feedback-Session";
export const FEEDBACK_POLICY_VERSION = "atlas-feedback-v1" as const;
// Shared curated identities keep browser selection and strict server intake aligned.
export const FEEDBACK_SELECTABLE_CHART_IDS = [
  ...draftChartAnchors, ...metricChartAnchors,
  "simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours",
  "idea_vintage", "latency_compression", "google-trends-neurotech", "google-trends-neuralink",
] as const;
export const FEEDBACK_TARGET_IDS = ["site-nav", "page-header", "field-velocity", "funding", "milestones", "ecosystem", "methodology", "velocity-tabs", ...FEEDBACK_SELECTABLE_CHART_IDS] as const;
export const FEEDBACK_CHART_IDS = ["papers", "patents", "funding", "trials", "companies", "performance", "recording-hours", "neurons", "google-trends", ...FEEDBACK_SELECTABLE_CHART_IDS] as const;
export const FEEDBACK_SCENARIOS = ["historical", "literature", "plateau"] as const;
