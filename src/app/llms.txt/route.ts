import { indexMarkdown } from "@/lib/ai/markdown";
import { markdownResponse } from "@/lib/ai/http";
export function GET(request: Request) {
  return markdownResponse(request, indexMarkdown(), "neuro-atlas-index.md", "text/plain");
}
