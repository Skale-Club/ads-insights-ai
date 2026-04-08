import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v20.0";

const RequestSchema = z.object({
  accessToken: z.string().min(1, "accessToken is required"),
  userId: z.string().min(1, "userId is required"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      const messages = parseResult.error.errors.map((e) => e.message).join(", ");
      return new Response(
        JSON.stringify({ error: `Invalid request: ${messages}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { accessToken, userId } = parseResult.data;

    // Fetch ad accounts from Meta Marketing API
    const resp = await fetch(
      `${META_API}/me/adaccounts` +
        `?fields=id,name,currency,account_status,business` +
        `&limit=50` +
        `&access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[meta-accounts] Meta API error (${resp.status}):`, errText);
      return new Response(
        JSON.stringify({ error: `Meta API error: ${errText}` }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const rawAccounts: any[] = data.data ?? [];

    const accounts = rawAccounts.map((item: any) => ({
      account_id: item.id,           // already in act_XXXXXXXXX format
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

    // Upsert into meta_accounts via service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already has a selected account
    const { data: existing } = await supabase
      .from("meta_accounts")
      .select("account_id")
      .eq("user_id", userId)
      .eq("is_selected", true)
      .single();

    const hasSelected = !!existing;

    const rows = accounts.map((acc, idx) => ({
      user_id: userId,
      account_id: acc.account_id,
      account_name: acc.account_name,
      currency: acc.currency,
      account_status: acc.account_status,
      is_selected: !hasSelected && idx === 0, // auto-select first if none selected
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("meta_accounts")
      .upsert(rows, { onConflict: "user_id,account_id" });

    if (upsertError) {
      console.error("[meta-accounts] Upsert error:", upsertError);
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
    console.error("[meta-accounts] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
