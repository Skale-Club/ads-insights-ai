import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeadersFor, preflightResponse } from "../_shared/cors.ts";

serve((req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const corsHeaders = corsHeadersFor(req);

  const body = {
    ok: true,
    service: "healthcheck",
    ts: new Date().toISOString(),
    region: Deno.env.get("SB_REGION") ?? null,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
