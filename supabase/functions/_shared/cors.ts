// Shared CORS handling for edge functions.
//
// In development we allow any origin (DEV defaults to allow-all).
// In production set CORS_ALLOWED_ORIGINS to a comma-separated list of
// exact origins; everything else gets rejected with no Allow-Origin header
// (which browsers treat as a CORS failure).

const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

function getAllowlist(): string[] {
  const raw = Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isAllowedOrigin(origin: string | null, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true; // dev fallback: allow all
  if (!origin) return false;
  return allowlist.includes(origin);
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowlist = getAllowlist();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Vary": "Origin",
  };
  if (allowlist.length === 0) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (isAllowedOrigin(origin, allowlist)) {
    headers["Access-Control-Allow-Origin"] = origin as string;
  }
  // If origin is not allowed, omit the Allow-Origin header entirely — the browser will block.
  return headers;
}

export function preflightResponse(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeadersFor(req) });
}
