// Password access is enforced by the proxy, independently of Analytics eligibility.
// Keep authorized prelaunch content measurable without tracking the password screen.

export function analyticsContext(now: number, environment?: string, measurementId?: string) {
  if (!Number.isFinite(now) || environment !== "production" ||
      !measurementId || !/^G-[A-Z0-9]{6,20}$/.test(measurementId) ||
      measurementId === "G-XPSNFVNHGB") return { eligible: false as const };
  return { eligible: true as const, measurementId };
}
