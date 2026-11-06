import { canonicalPerformanceAnchor } from "../src/data/field-velocity-links.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { performanceUrl } from "../src/lib/field-velocity/navigation.ts";

for (const anchor of ["simultaneously-recorded-neurons", "tissue-mapped", "neural-recording-hours", "idea_vintage", "latency_compression"]) test(`${anchor} share URLs preserve actual deployment, path and query`, () => {
  for (const base of ["https://neuro-atlas-app.vercel.app/field-velocity", "https://preview.example/atlas/field-velocity?review=1", "http://127.0.0.1:3387/field-velocity"]) {
    assert.equal(performanceUrl(base + "#old", anchor), base + "#" + canonicalPerformanceAnchor(anchor));
  }
});
test("unknown graph identifiers are rejected, not normalized into a plausible link", () => {
  assert.throws(() => performanceUrl("https://atlas.example/field-velocity", "TISSUE-MAPPED"), /Unknown/);
});
