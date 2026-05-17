import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, preflightResponse } from "../_shared/cors.ts";

const META_API = "https://graph.facebook.com/v20.0";

interface MetaAdAccountResp {
  id: string;
  name?: string;
  currency?: string;
  account_status?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const corsHeaders = corsHeadersFor(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Extract and validate the caller's JWT instead of trusting a userId in the body.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const userId = userData.user.id;

  // Service-role client for table reads/writes scoped to the authenticated user.
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch the caller's Meta access token server-side — it never crosses the wire from the browser.
  const { data: conn, error: connError } = await supabase
    .from("meta_connections")
    .select("access_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (connError) {
    console.error("[meta-accounts] connection lookup error");
    return new Response(
      JSON.stringify({ error: "Failed to look up Meta connection" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!conn?.access_token) {
    return new Response(
      JSON.stringify({ error: "No Meta connection — connect Meta in Settings first" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (conn.expires_at && new Date(conn.expires_at) <= new Date()) {
    return new Response(
      JSON.stringify({ error: "Meta token expired — reconnect in Settings" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const accessToken = conn.access_token;

  try {
    const resp = await fetch(
      `${META_API}/me/adaccounts` +
        `?fields=id,name,currency,account_status,business` +
        `&limit=50` +
        `&access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[meta-accounts] Meta API error (${resp.status})`);
      return new Response(
        JSON.stringify({ error: `Meta API error: ${errText}` }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const rawAccounts: MetaAdAccountResp[] = data.data ?? [];

    const accounts = rawAccounts.map((item) => ({
      account_id: item.id,
      account_name: item.name ?? item.id,
      currency: item.currency ?? "USD",
      account_status: item.account_status ?? 1,
    }));

    if (accounts.length === 0) {
      return new Response(
        JSON.stringify({ accounts: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existing } = await supabase
      .from("meta_accounts")
      .select("account_id")
      .eq("user_id", userId)
      .eq("is_selected", true)
      .maybeSingle();

    const hasSelected = !!existing;

    const rows = accounts.map((acc, idx) => ({
      user_id: userId,
      account_id: acc.account_id,
      account_name: acc.account_name,
      currency: acc.currency,
      account_status: acc.account_status,
      is_selected: !hasSelected && idx === 0,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("meta_accounts")
      .upsert(rows, { onConflict: "user_id,account_id" });

    if (upsertError) {
      console.error("[meta-accounts] Upsert error:", upsertError.message);
      return new Response(
        JSON.stringify({ error: `Failed to save accounts: ${upsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[meta-accounts] Upserted ${accounts.length} accounts for user ${userId}`);

    return new Response(
      JSON.stringify({ accounts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[meta-accounts] Error");
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
