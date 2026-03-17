import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Download the SQL file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("imports")
      .download("requests_full_export.sql");

    if (downloadError || !fileData) {
      throw new Error(`Failed to download SQL file: ${downloadError?.message}`);
    }

    const sqlContent = await fileData.text();
    
    // Split into individual INSERT statements
    // The file has CREATE TABLE (skip) + multiple INSERT...ON CONFLICT blocks
    const insertStatements = sqlContent
      .split(/ON CONFLICT \(request_id\) DO NOTHING;/)
      .map(s => s.trim())
      .filter(s => s.includes("INSERT INTO"))
      .map(s => {
        // Extract just the INSERT part (skip any CREATE TABLE before first INSERT)
        const insertIdx = s.indexOf("INSERT INTO");
        return s.substring(insertIdx) + "\nON CONFLICT (request_id) DO NOTHING;";
      });

    console.log(`Found ${insertStatements.length} INSERT batches`);

    // Use the DB URL to execute raw SQL via postgres
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL not configured");

    // Import postgres client
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const sql = postgres(dbUrl, { max: 1 });

    let totalInserted = 0;
    for (let i = 0; i < insertStatements.length; i++) {
      const stmt = insertStatements[i];
      try {
        const result = await sql.unsafe(stmt);
        console.log(`Batch ${i + 1}: inserted ${result.count || '?'} rows`);
        totalInserted += (result.count || 0);
      } catch (e) {
        console.error(`Batch ${i + 1} error:`, (e as Error).message);
      }
    }

    await sql.end();

    // Verify count
    const { count } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true });

    return new Response(JSON.stringify({ 
      success: true, 
      batches: insertStatements.length,
      totalInserted,
      finalCount: count 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Import error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
