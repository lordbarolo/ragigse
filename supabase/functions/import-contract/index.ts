import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { catalog_name, version_label, effective_from, notes, rates } = await req.json();

    if (!catalog_name || !version_label || !effective_from || !rates?.length) {
      return new Response(
        JSON.stringify({ error: "Alla obligatoriska fält krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create version
    const { data: version, error: vErr } = await supabase
      .from("contract_versions")
      .insert({
        catalog_name,
        version_label,
        effective_from,
        notes: notes || null,
      })
      .select()
      .single();

    if (vErr) throw vErr;

    // Insert rates
    const rateRows = rates.map((r: any) => ({
      version_id: version.id,
      yrkeskategori: r.yrkeskategori,
      zon: r.zon,
      typ: r.typ,
      timpris_kund: r.timpris_kund,
      detaljer: r.detaljer || null,
    }));

    const { error: rErr } = await supabase
      .from("contract_version_rates")
      .insert(rateRows);

    if (rErr) throw rErr;

    return new Response(
      JSON.stringify({ success: true, version_id: version.id, rows_imported: rateRows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("import-contract error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
