/** Display-only US short-scale counts; scientific source coordinates stay exact. */
const SCALES = [
  [1e15, "Q", "quadrillion"], [1e12, "T", "trillion"],
  [1e9, "B", "billion"], [1e6, "M", "million"], [1e3, "K", "thousand"],
] as const;
function parts(value: number) {
  if (!Number.isFinite(value)) throw new Error("A finite count is required");
  // Choose the scale at displayed precision, so a reciprocal rounding tail
  // (999,999,999.9999999) becomes 1 billion rather than 1,000 million.
  const scale = SCALES.find(([unit]) => Number(Math.abs(value).toPrecision(3)) >= unit);
  return { number: new Intl.NumberFormat("en-US", {maximumSignificantDigits: 3}).format(scale ? value / scale[0] : value), short: scale?.[1] ?? "", word: scale?.[2] ?? "" };
}
export function compactCount(value: number) { const p = parts(value); return p.number + p.short; }
export function countWords(value: number) { const p = parts(value); return p.number + (p.word ? ` ${p.word}` : ""); }
