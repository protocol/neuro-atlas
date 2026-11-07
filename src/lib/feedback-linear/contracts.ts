/** Shared native-feedback wire contracts. No credentials or operator identities. */
import type {SimpleFeedbackInput} from "../feedback/contracts";

export const LINEAR_FEEDBACK_POLICY_VERSION = "atlas-feedback-linear-v1" as const;
export type LinearFeedbackInput = Omit<SimpleFeedbackInput, "processingConsent"> & {
  processingConsent: {approved: true; policyVersion: typeof LINEAR_FEEDBACK_POLICY_VERSION};
};

/** Kept only in a non-synced private Linear comment, never an issue description. */
export type LinearFeedbackPrivateRecord = {
  schema: "atlas-linear-feedback-v1";
  feedbackId: string;
  version: number;
  operationId: string;
  ownerLinearId: string;
  requestHash: string;
  previousRecordHash?: string;
  createdAt: string;
  input: LinearFeedbackInput;
  signature: string;
};

export type LinearFeedbackIssueReference = {
  id: string;
  identifier: string;
  url: string;
  projectId: string;
  teamId: string;
};
