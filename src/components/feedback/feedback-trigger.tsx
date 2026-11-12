"use client";

export const FEEDBACK_OPEN_EVENT = "atlas-feedback-open";

/** Shared with the adjacent PR action; the page-lifetime controller owns the flow. */
export function FeedbackTrigger({ className }: { className?: string }) {
  return <button type="button" data-atlas-feedback data-feedback-trigger className={className}
    aria-haspopup="dialog" aria-keyshortcuts="Alt+Shift+F" title="Feedback (Alt+Shift+F, outside text fields)"
    onClick={() => window.dispatchEvent(new window.CustomEvent(FEEDBACK_OPEN_EVENT))}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" className="shrink-0">
      <path d="M13.5 7.25a5.5 5.5 0 0 1-5.5 5.5H5l-3 2V7.25a5.5 5.5 0 1 1 11 0Z" strokeLinejoin="round" />
      <path d="M5 6h6M5 8.5h4" strokeLinecap="round" />
    </svg>
    <span>Feedback</span>
  </button>;
}
