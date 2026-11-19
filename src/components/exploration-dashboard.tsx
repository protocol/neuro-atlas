"use client";

import { useEffect, useState } from "react";
import { FieldVelocityGraphDetail } from "@/components/field-velocity-graph";
import { FIELD_VELOCITY_GRAPHS } from "@/data/field-velocity-links";

export function ExplorationDashboard() {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    setSlug(new URLSearchParams(window.location.search).get("add"));
  }, []);
  const entry = FIELD_VELOCITY_GRAPHS.find(graph => graph.slug === slug);
  return <section className="graph-page">
    <h1>Chart dashboard</h1>
    {entry ? <article data-dashboard-graph={entry.slug}>
      <h2>{entry.title}</h2>
      <FieldVelocityGraphDetail entry={entry} />
    </article> : <p>Add a chart to compare measurements.</p>}
  </section>;
}
