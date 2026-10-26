import { catalog, sectionMarkdown } from "@/lib/ai/markdown";
import { markdownResponse, errorResponse } from "@/lib/ai/http";
export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const section = catalog.sections.find(s => `${s.id}.md` === resource);
  return section ? markdownResponse(request, sectionMarkdown(section), `neuro-atlas-${section.id}.md`) : errorResponse(404, "Unknown section.");
}
