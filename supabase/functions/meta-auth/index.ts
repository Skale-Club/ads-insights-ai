import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_API = "https://graph.facebook.com/v20.0";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // state = user_id
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const redirectUri = Deno.env.get("META_REDIRECT_URI");
  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const redirectError = (msg: string) =>
    new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/settings?meta_error=${encodeURIComponent(msg)}` },
    });

  if (errorParam) {
    return redirectError(errorDesc ?? errorParam);
  }

  if (!code || !state) {
    return redirectError("Missing OAuth code or state");
  }

  if (!appId || !appSecret || !redirectUri || !supabaseUrl || !serviceRoleKey) {
    return redirectError("Server configuration error — missing Meta env vars");
  }

  try {
    // Step 1: Exchange code for short-lived token
    const shortLivedResp = await fetch(
      `${META_API}/oauth/access_token` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&code=${encodeURIComponent(code)}`,
    );

    if (!shortLivedResp.ok) {
      const err = await shortLivedResp.text();
      console.error("[meta-auth] Short-lived token error:", err);
      return redirectError(`Meta OAuth error: ${err}`);
    }

    const shortLivedData = await shortLivedResp.json();
    const shortLivedToken: string = shortLivedData.access_token;

    // Step 2: Exchange short-lived for long-lived token (~60 days)
    const longLivedResp = await fetch(
      `${META_API}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`,
    );

    if (!longLivedResp.ok) {
      const err = await longLivedResp.text();
      console.error("[meta-auth] Long-lived token error:", err);
      return redirectError(`Meta token exchange error: ${err}`);
    }

    const longLivedData = await longLivedResp.json();
    const accessToken: string = longLivedData.access_token;
    const expiresIn: number = longLivedData.expires_in ?? 5183944; // ~60 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Step 3: Fetch Meta user info
    const meResp = await fetch(
      `${META_API}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!meResp.ok) {
      const err = await meResp.text();
      return redirectError(`Failed to fetch Meta user info: ${err}`);
    }

    const meData = await meResp.json();
    const metaUserId: string = meData.id;
    const metaUserName: string = meData.name ?? "";

    // Step 4: Upsert into meta_connections via service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error: upsertError } = await supabase
      .from("meta_connections")
      .upsert(
        {
          user_id: state,
          access_token: accessToken,
          token_type: "long_lived",
          meta_user_id: metaUserId,
          meta_user_name: metaUserName,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      console.error("[meta-auth] Supabase upsert error:", upsertError);
      return redirectError(`Failed to save Meta connection: ${upsertError.message}`);
    }

    console.log(`[meta-auth] Connected Meta user ${metaUserId} (${metaUserName}) for user ${state}`);

    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/settings?meta_connected=true` },
    });
  } catch (err) {
    console.error("[meta-auth] Unexpected error:", err);
    return redirectError(err instanceof Error ? err.message : "Unknown error");
  }
});
