import { catalog, recordMarkdown } from "@/lib/ai/markdown";
import { markdownResponse, errorResponse } from "@/lib/ai/http";
export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const row = catalog.records.find(r => `${r.id}.md` === resource);
  return row ? markdownResponse(request, recordMarkdown(row), `neuro-atlas-${row.id}.md`) : errorResponse(404, "Unknown record.");
}
