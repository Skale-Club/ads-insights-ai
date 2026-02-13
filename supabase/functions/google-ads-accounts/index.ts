import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
    // Optional: Manager Account ID for Explorer Access / MCC handling
    const loginCustomerId = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID");

    if (!developerToken) {
      throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN not configured");
    }

    const { providerToken } = await req.json();

    if (!providerToken) {
      throw new Error("Provider token not provided");
    }

    // Explicitly logging version for debug
    console.log("Attempting to connect to Google Ads API v20...");
    if (loginCustomerId) console.log(`Using Login-Customer-Id: ${loginCustomerId}`);

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${providerToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };

    if (loginCustomerId) {
      headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");
    }

    let accounts = [];

    // Strategy: If MCC ID is provided, query for sub-accounts. Otherwise, list accessible accounts.
    if (loginCustomerId) {
      const cleanCustomerId = loginCustomerId.replace(/-/g, "");
      console.log(`Fetching sub-accounts for MCC: ${cleanCustomerId}`);

      const query = `
        SELECT
          customer_client.id,
          customer_client.descriptive_name,
          customer_client.currency_code,
          customer_client.time_zone,
          customer_client.manager,
          customer_client.status
        FROM customer_client
        WHERE customer_client.manager = false
      `;

      // Use the searchStream endpoint for better error handling and robust querying
      const searchResponse = await fetch(
        `https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:searchStream`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ query })
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("Google Ads API Search error:", errorText);

        // Return 200 with error object so client can display the specific API error
        return new Response(
          JSON.stringify({ error: `Google Ads API Error (${searchResponse.status}): ${errorText}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const searchData = await searchResponse.json();
      // searchStream returns an array of batches
      const results = searchData.reduce((acc: any[], batch: any) => {
        return acc.concat(batch.results || []);
      }, []);

      accounts = results.map((row: any) => {
        const client = row.customerClient;
        const idStr = String(client.id);
        return {
          id: idStr,
          customerId: idStr.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"),
          name: client.descriptiveName || `Account ${client.id}`,
          currencyCode: client.currencyCode,
          timeZone: client.timeZone,
          isManager: client.manager,
          status: client.status,
        };
      });

    } else {
      // Fallback: List accessible accounts (Direct access)
      const customersResponse = await fetch(
        "https://googleads.googleapis.com/v20/customers:listAccessibleCustomers",
        {
          method: "GET",
          headers,
        }
      );

      if (!customersResponse.ok) {
        const errorText = await customersResponse.text();
        console.error("Google Ads API error:", errorText);
        throw new Error(`Google Ads API error (${customersResponse.status}): ${errorText}`);
      }

      const customersData = await customersResponse.json();
      const resourceNames = customersData.resourceNames || [];

      for (const resourceName of resourceNames) {
        const customerId = resourceName.replace("customers/", "");
        accounts.push({
          id: customerId,
          customerId: customerId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3"),
          name: `Account ${customerId}`,
          isManager: false,
        });
      }
    }

    return new Response(JSON.stringify({ accounts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
