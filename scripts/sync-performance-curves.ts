import { readFileSync, writeFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseFeed } from "../src/lib/field-velocity/schema";
import { selectPerformance, selectPace } from "../src/lib/field-velocity/performance";

export const MAX_EXPORT_BYTES = 1024 * 1024;

/** An explicit, bounded build-time refresh. No runtime fetch or handwritten series. */
export function syncSnapshot(input: string, providerCommit: string, output = "src/data/field-velocity/neurotech.snapshot.json") {
  if (!/^[a-f0-9]{40}$/.test(providerCommit)) throw new Error("Expected exact 40-character provider commit SHA");
  if (statSync(input).size > MAX_EXPORT_BYTES) throw new Error("Export exceeds 1 MiB limit");
  const bytes = readFileSync(input);
  if (bytes.length > MAX_EXPORT_BYTES) throw new Error("Export exceeds 1 MiB limit");
  const feed = parseFeed(JSON.parse(bytes.toString("utf8")));
  selectPerformance(feed);
  selectPace(feed);
  const provenance = {
    generatedBy: "npm run performance:sync -- <provider-export.json> <provider-commit-sha>",
    providerCommit,
    schemaSource: "https://github.com/protocol/neuro-atlas/blob/b6f99efaa80251c4fbbe608a329776617ae383ac/src/lib/field-velocity/schema.ts",
    source: feed.source,
    exportGeneratedAt: feed.generatedAt,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    mode: "committed-snapshot",
  };
  // All validation precedes any replacement, including provenance.
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output + ".tmp", bytes);
  writeFileSync(output + ".provenance.json.tmp", JSON.stringify(provenance, null, 2) + "\n");
  renameSync(output + ".tmp", output);
  renameSync(output + ".provenance.json.tmp", output + ".provenance.json");
  return provenance;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || !process.argv[3]) throw new Error("Usage: npm run performance:sync -- <provider-export.json> <provider-commit-sha>");
  console.log(JSON.stringify(syncSnapshot(process.argv[2], process.argv[3]), null, 2));
}
