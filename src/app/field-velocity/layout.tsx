import { GraphExportHost } from "@/components/graph-export-host";
import { FieldVelocityRoutes } from "@/components/field-velocity-routes";
import { GoogleTrendsProvider } from "@/components/google-trends-provider";
import { CitationLatencyProvider } from "@/components/citation-latency-provider";
import { PublicationSourceProvider } from "@/components/publication-source-provider";

export default function FieldVelocityLayout({ children }: { children: React.ReactNode }) {
  return <FieldVelocityRoutes><GoogleTrendsProvider><CitationLatencyProvider><PublicationSourceProvider>
    {children}<GraphExportHost />
  </PublicationSourceProvider></CitationLatencyProvider></GoogleTrendsProvider></FieldVelocityRoutes>;
}
