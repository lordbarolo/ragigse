const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endUserIp, getQr } = await req.json();

    if (typeof endUserIp !== "string" || typeof getQr !== "boolean") {
      return new Response(
        JSON.stringify({
          error: "Invalid body. Expected { endUserIp: string, getQr: boolean }",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const upstream = await fetch(
      "https://banksign-test.azurewebsites.net/api/sign",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUser: Deno.env.get("BANKID_API_USER"),
          password: Deno.env.get("BANKID_API_PASSWORD"),
          companyApiGuid: Deno.env.get("BANKID_COMPANY_GUID"),
          endUserIp,
          getQr,
        }),
      },
    );

    const text = await upstream.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    return new Response(JSON.stringify(payload), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
