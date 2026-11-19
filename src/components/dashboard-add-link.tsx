"use client";

import { useContext, useSyncExternalStore } from "react";
import { ChartExplorationContext } from "@/components/chart-exploration-context";
import type { FieldVelocityGraph } from "@/data/field-velocity-links";
import { DASHBOARD_ROUTE, dashboardHash } from "@/lib/dashboard-state";
import { atlasPath } from "@/lib/atlas-path";
import { recordingViewToken } from "@/lib/recording-view";

function subscribe(callback: () => void) {
  const events = ["popstate", "atlas-performance-location"];
  events.forEach(event => window.addEventListener(event, callback));
  return () => events.forEach(event => window.removeEventListener(event, callback));
}
const recording = () => recordingViewToken(new URL(window.location.href));
const none = () => undefined;
const idle = () => () => {};

export function DashboardAddLink({ entry }: { entry: FieldVelocityGraph }) {
  const view = useSyncExternalStore(entry.graph.renderer === "recording" ? subscribe : idle, entry.graph.renderer === "recording" ? recording : none, none);
  const current = useContext(ChartExplorationContext)?.settings;
  const settings = { ...current, recordingView: view };
  const selected = Object.values(settings).some(value => Array.isArray(value) ? value.length > 0 : !!value);
  const href = DASHBOARD_ROUTE + (selected ? dashboardHash({ name: "Untitled dashboard", cards: [{ slug: entry.slug, settings }] }) : `?add=${entry.slug}`);
  return <a className="dashboard-pill" data-add-to-dashboard href={atlasPath(href)}>Add to dashboard</a>;
}
