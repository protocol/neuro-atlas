import { GraphBackLink } from "@/components/graph-back-link";
import { notFound } from "next/navigation";
import { FieldVelocityGraphDetail } from "@/components/field-velocity-graph";
import { FIELD_VELOCITY_GRAPHS, GRAPH_GROUP_ANCHORS, graphPath } from "@/data/field-velocity-links";
import { atlasMetadata } from "@/lib/atlas-metadata";
import { atlasPath } from "@/lib/atlas-path";

// With a basePath, Next16 fallback:false misses can re-enter legacy redirects.
// Known graphs remain prerendered; unknown paths must reach our explicit 404.
export const dynamicParams = true;
export function generateStaticParams() {
  return FIELD_VELOCITY_GRAPHS.map(({ slug }) => ({ slug }));
}

type GraphPageProps = { params: Promise<{ slug: string }> };
async function graphForRoute({ params }: GraphPageProps) {
  const { slug } = await params;
  // Path aliases are deliberately not accepted; fragment aliases remain supported.
  return FIELD_VELOCITY_GRAPHS.find(entry => entry.slug === slug) ?? notFound();
}

export async function generateMetadata(props: GraphPageProps) {
  const entry = await graphForRoute(props);
  return atlasMetadata(graphPath(entry), `${entry.title} — Neuro Atlas`, entry.graph.description);
}

export default async function GraphPage(props: GraphPageProps) {
  const entry = await graphForRoute(props);
  const related = FIELD_VELOCITY_GRAPHS.filter(peer => peer.graph.group === entry.graph.group && peer.slug !== entry.slug);
  return <article className="graph-page" data-graph-page={entry.slug}>
    <header>
      <GraphBackLink fallback={atlasPath(`/field-velocity#${GRAPH_GROUP_ANCHORS[entry.graph.group]}`)} />
      <h1>{entry.title}</h1>
      <p className="graph-description">{entry.graph.description}</p>
      <a className="dashboard-pill" data-add-to-dashboard href={atlasPath(`/field-velocity/dashboard?add=${entry.slug}`)}>Add to dashboard</a>
    </header>
    <FieldVelocityGraphDetail entry={entry} />
    <nav className="graph-related" aria-label="More in this group">
      <h2>More in this group</h2>
      <ul>{related.map(peer => <li key={peer.slug}><a href={atlasPath(graphPath(peer))}>{peer.title}</a></li>)}</ul>
    </nav>
  </article>;
}
