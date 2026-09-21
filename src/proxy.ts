import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple HTTP Basic Auth gate for the whole site. Any username, password "plneuro".
const PASSWORD = "plneuro";

export function proxy(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === PASSWORD) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Neuro Atlas", charset="UTF-8"' },
  });
}

export const config = {
  // Explicit root matcher also covers the bare basePath (e.g. /neuro-atlas).
  // The catch-all alone requires a slash after the prefix and misses that URL.
  // Keep the existing internal asset and favicon exclusions.
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
