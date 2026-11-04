export const recordingViewQuery = "recordingView";
export const recordingViewIds = ["electrical", "human-channels", "optical"] as const;
export type RecordingViewId = typeof recordingViewIds[number];

/** Only one exact enum value may carry chart state; duplicates fail closed. */
export function recordingViewToken(url: URL): RecordingViewId | undefined {
  const values = url.searchParams.getAll(recordingViewQuery);
  return values.length === 1 && (recordingViewIds as readonly string[]).includes(values[0])
    ? values[0] as RecordingViewId : undefined;
}
