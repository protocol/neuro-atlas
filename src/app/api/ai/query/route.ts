import { queryResponse } from "@/lib/ai/query";
export function GET(request: Request) {
  return queryResponse(request);
}
