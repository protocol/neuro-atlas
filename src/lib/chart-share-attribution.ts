import { FIELD_VELOCITY_GRAPHS } from "@/data/field-velocity-links";

const sharedCampaign = { utm_source: "neuro_atlas", utm_medium: "share", utm_campaign: "chart_share" } as const;
const slugs = new Set(FIELD_VELOCITY_GRAPHS.map(entry => entry.slug));

/** Fixed, nonidentifying vocabulary. Never copy a campaign value supplied by a visitor. */
export function chartShareAttribution(slug: string) {
  return slugs.has(slug) ? new URLSearchParams({ ...sharedCampaign, utm_content: slug }) : new URLSearchParams();
}

/** Only the exact generated tuple on its matching real chart can be measured. */
export function readChartShareAttribution(url: URL) {
  const slug = url.pathname.match(/\/field-velocity\/([a-z0-9-]+)\/?$/)?.[1];
  if (!slug || !slugs.has(slug)) return "";
  const expected = chartShareAttribution(slug);
  for (const [key, value] of expected) {
    const actual = url.searchParams.getAll(key);
    if (actual.length !== 1 || actual[0] !== value) return "";
  }
  return expected.toString();
}
