import { fullMarkdown } from "@/lib/ai/markdown";
import { markdownResponse } from "@/lib/ai/http";
export function GET(request: Request) {
  return markdownResponse(request, fullMarkdown(), "neuro-atlas-full.md", "text/plain");
}
