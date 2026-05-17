import { corsHeadersFor, preflightResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflightResponse(req);
  const corsHeaders = corsHeadersFor(req);

  const metaAppId = Deno.env.get('META_APP_ID');

  if (!metaAppId) {
    return new Response(
      JSON.stringify({ error: 'META_APP_ID not configured. Add it in Supabase Dashboard → Edge Functions → Secrets.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ metaAppId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
