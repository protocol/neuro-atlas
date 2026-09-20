import { SCHEMA_VERSION } from "./catalog";

export const responseHeaders = {
  "Cache-Control": "private, no-store",
  "Vary": "Authorization",
  "X-Content-Type-Options": "nosniff",
  "Link": '</llms.txt>; rel="describedby"; type="text/plain"',
};
export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: responseHeaders });
}
export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ schemaVersion: SCHEMA_VERSION, error: { status, message } }, status);
}
export function markdownResponse(request: Request, body: string, filename: string, type = "text/markdown"): Response {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(k => k !== "download") || params.getAll("download").length > 1 || (params.has("download") && params.get("download") !== "1")) return errorResponse(400, "Only download=1 is supported for Markdown resources.");
  return new Response(body, { headers: {
    ...responseHeaders,
    "Content-Type": `${type}; charset=utf-8`,
    "Content-Disposition": `${params.has("download") ? "attachment" : "inline"}; filename="${filename}"`,
  } });
}
