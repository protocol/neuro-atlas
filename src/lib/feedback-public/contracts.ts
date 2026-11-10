/** Browser-safe public logging DTO. No identity, provider scope, automation or history. */
import type {SimpleFeedbackInput} from '../feedback/contracts';
export type PublicFeedbackInput = Pick<SimpleFeedbackInput, 'feedback' | 'context'>;
export type PublicFeedbackConfig = {enabled: boolean; connected: boolean};
export type PublicFeedbackReceipt = {saved: true};
