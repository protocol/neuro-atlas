import { RECORD_CONTEXT_SOURCE_URLS, recordSourceContextsForUrl } from "./source-context-records";
import INFLECTIONS from "../data/velocity/neurotech_inflection_points.json";
import MARKETS from "../data/velocity/neurotech_market_signals.json";
import PUBLICATIONS from "../data/publications/publication-charts.snapshot.json";
import TRENDS from "../../public/data/google-trends/bundled-20261106/google-trends.json";
import { PUBLICATION_ANCHORS } from "./publication-data";
import TRANSLATION from "../data/field-velocity/bci-translation-evidence.json";
import { bundledCitationData } from "./field-velocity/citation-latency-bundled";
import { projectCitationRecord } from "./field-velocity/citation-latency-feed";
import type { InstrumentRecord } from "./field-velocity/schema";
import SNAPSHOT from "../data/field-velocity/neurotech.snapshot.json";
import PARTICIPANT_ADDITIONS from "../data/field-velocity/bci-participants.additions.json";
import { HISTORICAL_RECORDING, HISTORICAL_RECORDING_SOURCE } from "../data/historical-recording";
import { RECORDING_VIEWS } from "../data/recording-evidence";
import { METRIC_CHARTS, METRIC_CHART_EVIDENCE, isVisibleMetric } from "../data/metric-chart-visibility";
import { DRAFT_CHART_LINKS } from "../data/draft-chart-links";
import { fieldVelocityLink } from "../data/field-velocity-links";

import { normalizeSourceContextUrl } from "./source-context-url";

export type SourceContext = { href: string; label: string };

const contexts = new Map<string, Map<string, SourceContext>>();

function add(url: string | undefined, context: SourceContext) {
  const key = normalizeSourceContextUrl(url);
  if (!key) return;
  const matches = contexts.get(key) ?? new Map<string, SourceContext>();
  matches.set(context.href, context);
  contexts.set(key, matches);
}

for (const chart of METRIC_CHARTS.filter(isVisibleMetric)) {
  const links = DRAFT_CHART_LINKS.find(link => link.title === chart.title);
  const evidence = METRIC_CHART_EVIDENCE[chart.title];
  for (const plot of evidence.plots) {
    const panel = links?.panels.find(panel => panel.plotId === plot.id);
    const link = panel && fieldVelocityLink(panel.id);
    if (!link || link.kind !== "chart" || link.fallback) continue;
    const context = { href: `/field-velocity#${link.slug}`, label: link.title };
    add(plot.curationSource?.url, context);
    for (const point of plot.points) {
      add(point.sourceUrl, context);
      for (const reference of point.supportingReferences ?? []) add(reference.url, context);
      add(point.calculationSource?.url, context);
    }
    add(plot.referenceTrendline?.methodologyUrl, context);
    for (const trend of plot.referenceTrendlines ?? []) add(trend.methodologyUrl, context);
  }
  const timelinePanel = links?.panels.find(panel => panel.plotId === null);
  const timelineLink = timelinePanel && fieldVelocityLink(timelinePanel.id);
  if (timelineLink && evidence.timeline) {
    for (const event of evidence.timeline.events) add(event.sourceUrl, { href: `/field-velocity#${timelineLink.slug}`, label: timelineLink.title });
  }
}


for (const view of [HISTORICAL_RECORDING, ...RECORDING_VIEWS]) {
  const context = { href: `/field-velocity?recordingView=${view.id}#${fieldVelocityLink("simultaneously-recorded-neurons")!.slug}`, label: `Simultaneous neural recordings · ${view.label}` };
  for (const point of view.points) add(point.sourceUrl, context);
  if (view.id === "historical") {
    add(HISTORICAL_RECORDING_SOURCE.sourceUrl, context);
    add(HISTORICAL_RECORDING_SOURCE.producerUrl, context);
  }
}


const participantLink = fieldVelocityLink("revealed_commitments")!;
const participantContext = { href: `/field-velocity#${participantLink.slug}`, label: participantLink.title };
const inheritedParticipants = SNAPSHOT.measurementSeries.find(series => series.id === "bci-implants")!;
for (const track of [...inheritedParticipants.tracks, ...PARTICIPANT_ADDITIONS.tracks]) {
  for (const point of track.points) add(point.sourceUrl, participantContext);
}
for (const paper of PARTICIPANT_ADDITIONS.papers) add(paper.url, participantContext);


const translationLink = fieldVelocityLink("latency_compression")!;
const translationContext = { href: `/field-velocity#${translationLink.slug}`, label: translationLink.title };
add(TRANSLATION.corpusUrl, translationContext);
for (const source of TRANSLATION.previewSources) add(source.url, translationContext);
for (const pair of TRANSLATION.intervals) {
  add(pair.report.url, translationContext);
  add(pair.human.url, translationContext);
}
for (const pathway of TRANSLATION.additionalPathways) {
  for (const source of pathway.sources) add(source.url, translationContext);
}
const citationLink = fieldVelocityLink("idea_vintage")!;
const citationRecord = projectCitationRecord(bundledCitationData, SNAPSHOT.records.find(record => record.instrument === "idea_vintage") as InstrumentRecord);
for (const source of citationRecord.sources ?? []) add(source.url, { href: `/field-velocity#${citationLink.slug}`, label: citationLink.title });


// These definition links are literal citations in the corresponding card components.
for (const anchor of PUBLICATION_ANCHORS) {
  const link = fieldVelocityLink(anchor)!;
  const context = { href: `/field-velocity#${link.slug}`, label: link.title };
  add(PUBLICATIONS.source.url, context);
  add("https://docs.openalex.org", context);
}
for (const group of TRENDS.groups.filter(group => group.id === "neurotech")) {
  const link = fieldVelocityLink(`google-trends-${group.id}`)!;
  const context = { href: `/field-velocity#${link.slug}`, label: link.title };
  add(group.sourceUrl, context);
  add("https://support.google.com/trends/answer/4365533?hl=en", context);
  add("https://support.google.com/trends/answer/4359550?hl=en", context);
}


for (const point of INFLECTIONS.points) {
  const market = MARKETS.mappings.find(mapping => mapping.title === point.title);
  if (market?.match !== "proxy") continue;
  const context = { href: "/field-velocity#inflection-points", label: "Inflection points · related forecasts" };
  add(market.primary?.url, context);
  if ("fallback" in market) add(market.fallback?.url, context);
}
// Existing prose citations only. The source directory itself is not a context.
add("https://neurotechnology.substack.com/p/representations2", { href: "/methodology#data-gathering", label: "How data is gathered · Milestones" });
add("https://www.plrd.org/", { href: "/methodology#field-velocity-methodology", label: "How data is gathered · Field Velocity" });

for (const url of RECORD_CONTEXT_SOURCE_URLS) {
  for (const context of recordSourceContextsForUrl(url)) add(url, context);
}

/** Current local destinations only; paths intentionally exclude the deployment basePath. */
export function sourceContextsForUrl(url: unknown): SourceContext[] {
  const key = normalizeSourceContextUrl(url);
  return key ? [...(contexts.get(key)?.values() ?? [])].sort((a, b) => a.href < b.href ? -1 : a.href > b.href ? 1 : 0).map(context => ({ ...context })) : [];
}
