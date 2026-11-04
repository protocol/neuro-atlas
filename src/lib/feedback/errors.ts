export class FeedbackError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function invalid(): never { throw new FeedbackError(400, "invalid_request", "Invalid feedback request."); }
export function unavailable(): never { throw new FeedbackError(503, "unavailable", "Feedback is unavailable. Try again later."); }
