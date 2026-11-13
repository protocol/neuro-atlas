// Server time is the only launch authority. Never import launch-access's crypto into the client.
const launchAt = Date.parse("2026-11-19T14:00:00Z");

export function analyticsContext(now: number, environment?: string, measurementId?: string) {
  if (!Number.isFinite(now) || now < launchAt || environment !== "production" ||
      !measurementId || !/^G-[A-Z0-9]{6,20}$/.test(measurementId) ||
      measurementId === "G-XPSNFVNHGB") return { eligible: false as const };
  return { eligible: true as const, measurementId };
}
