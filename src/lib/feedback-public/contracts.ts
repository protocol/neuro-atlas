/** Browser-safe public logging DTO. No identity, provider scope, automation or history. */
import type {SimpleFeedbackInput} from '../feedback/contracts';
export type FeedbackScreenshot = {status:'captured'; mimeType:'image/png'; width:number; height:number; data:string} | {status:'unavailable'; reason:'capture_failed' | 'unsupported' | 'too_large' | 'not_visible'};
export type PublicFeedbackInput = Pick<SimpleFeedbackInput, 'feedback' | 'context'> & {screenshot?:FeedbackScreenshot};
export type PublicFeedbackConfig = {enabled: boolean; connected: boolean};
export type PublicFeedbackReceipt = {saved: true};
