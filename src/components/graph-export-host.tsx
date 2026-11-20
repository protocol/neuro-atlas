"use client";
import { useEffect, useSyncExternalStore } from "react";
import { attachGraphExportHost, currentGraphExport, subscribeGraphExport } from "@/lib/chart-export-api";
import { FieldVelocityGraphDetail } from "@/components/field-velocity-graph";
import { GraphExportContext } from "@/components/graph-export-context";

export function GraphExportHost() {
  const request = useSyncExternalStore(subscribeGraphExport, currentGraphExport, () => null);
  useEffect(attachGraphExportHost, []);
  if (!request) return null;
  return <div className="chart-export-host" data-graph-export-host={request.entry.slug} aria-hidden="true" inert>
    <GraphExportContext.Provider key={request.id} value={request}>
      <FieldVelocityGraphDetail entry={request.entry} />
    </GraphExportContext.Provider>
  </div>;
}
