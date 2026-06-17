import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fmt(v: number): string {
  return v.toLocaleString("sv-SE");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "Missing report_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();

    if (error || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = report.result_json as Record<string, any>;
    const rec = r?.recommendation;
    const market = r?.market;
    const inputs = r?.inputs;
    const isEmployee = report.employment_type === "anstalld";

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const darkBg = rgb(0.06, 0.08, 0.14);
    const primaryColor = rgb(0.2, 0.72, 0.9);
    const accentColor = rgb(0.3, 0.78, 0.6);
    const white = rgb(1, 1, 1);
    const gray = rgb(0.6, 0.63, 0.7);
    const lightGray = rgb(0.35, 0.38, 0.45);

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: darkBg });

    // Header bar
    page.drawRectangle({
      x: 0, y: height - 100, width, height: 100,
      color: rgb(0.08, 0.1, 0.18),
    });

    let y = height - 40;

    // Logo text
    page.drawText("compcare", {
      x: 40, y, size: 22, font: fontBold, color: white,
    });
    page.drawText(".se", {
      x: 40 + fontBold.widthOfTextAtSize("compcare", 22), y, size: 22, font: fontBold, color: primaryColor,
    });

    y -= 25;
    page.drawText("Ersättningsanalys", {
      x: 40, y, size: 9, font, color: gray,
    });

    // Report title
    y = height - 130;
    page.drawText(report.occupation || "Konsultrapport", {
      x: 40, y, size: 20, font: fontBold, color: white,
    });

    y -= 22;
    const subtitle = [
      report.kommun,
      isEmployee ? "Anställd" : "Eget bolag",
    ].filter(Boolean).join(" · ");
    page.drawText(subtitle, {
      x: 40, y, size: 10, font, color: gray,
    });

    // Divider
    y -= 20;
    page.drawRectangle({ x: 40, y, width: width - 80, height: 0.5, color: lightGray });

    // Market rate
    if (market?.rate_customer_sek_per_hour) {
      y -= 30;
      page.drawText("Ramavtalspris (kundpris)", {
        x: 40, y, size: 9, font, color: gray,
      });
      y -= 18;
      page.drawText(`${fmt(market.rate_customer_sek_per_hour)} kr/h`, {
        x: 40, y, size: 16, font: fontBold, color: white,
      });
    }

    // Recommendation
    if (rec) {
      y -= 35;
      page.drawText("Rekommenderad ersättning", {
        x: 40, y, size: 9, font, color: gray,
      });
      y -= 18;
      page.drawText(`${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr/h`, {
        x: 40, y, size: 16, font: fontBold, color: accentColor,
      });
      y -= 15;
      page.drawText(`${fmt(rec.recommended_monthly_min)}–${fmt(rec.recommended_monthly_max)} kr/mån`, {
        x: 40, y, size: 10, font, color: gray,
      });
    }

    // Current salary
    if (inputs?.current_salary_sek) {
      y -= 35;
      page.drawText("Din nuvarande ersättning", {
        x: 40, y, size: 9, font, color: gray,
      });
      y -= 18;
      const salaryLabel = inputs.salary_type === "hourly"
        ? `${fmt(inputs.current_salary_sek)} kr/h`
        : `${fmt(inputs.current_salary_sek)} kr/mån`;
      page.drawText(salaryLabel, {
        x: 40, y, size: 16, font: fontBold, color: white,
      });
    }

    // Share of customer price
    if (rec && market?.rate_customer_sek_per_hour && inputs?.current_salary_sek) {
      const currentHourly = inputs.salary_type === "hourly"
        ? inputs.current_salary_sek
        : Math.round(inputs.current_salary_sek / 167);
      const employerFactor = rec.employee_factor || 1.42;
      const costToCompare = isEmployee ? Math.round(currentHourly * employerFactor) : currentHourly;
      const sharePercent = Math.round((costToCompare / market.rate_customer_sek_per_hour) * 100);

      y -= 35;
      page.drawText(isEmployee ? "Din lönekostnad vs kundpriset" : "Din andel av kundpriset", {
        x: 40, y, size: 9, font, color: gray,
      });
      y -= 22;
      page.drawText(`${sharePercent}%`, {
        x: 40, y, size: 28, font: fontBold, color: accentColor,
      });
      y -= 14;
      page.drawText(`av ${fmt(market.rate_customer_sek_per_hour)} kr/h`, {
        x: 40, y, size: 9, font, color: lightGray,
      });

      // Progress bar
      y -= 18;
      const barWidth = width - 80;
      const barHeight = 6;
      page.drawRectangle({ x: 40, y, width: barWidth, height: barHeight, color: rgb(0.12, 0.14, 0.22) });
      page.drawRectangle({
        x: 40, y, width: Math.min(sharePercent / 100, 1) * barWidth, height: barHeight, color: accentColor,
      });
    }

    // Margin breakdown
    if (rec) {
      y -= 35;
      page.drawText("Beräkningsantaganden", {
        x: 40, y, size: 9, font, color: gray,
      });
      const assumptions = [
        `Bemanningsbolagets marginal: ${Math.round((1 - rec.consultant_share_max) * 100)}–${Math.round((1 - rec.consultant_share_min) * 100)}%`,
        isEmployee ? `Arbetsgivaravgifter: faktor ${rec.employee_factor}` : "Fakturerar via eget bolag",
        `Arbetsmånad: ${rec.hours_per_month || 167} timmar`,
      ];
      for (const a of assumptions) {
        y -= 16;
        page.drawText(`• ${a}`, { x: 48, y, size: 9, font, color: lightGray });
      }
    }

    // Footer
    y = 60;
    page.drawRectangle({ x: 40, y: y + 10, width: width - 80, height: 0.5, color: lightGray });
    page.drawText("CompCare.se — Ersättningsanalys baserad på ramavtal 2026", {
      x: 40, y: y - 8, size: 8, font, color: lightGray,
    });
    page.drawText("Faktisk ersättning kan variera beroende på arbetsgivare, uppdrag och individuella avtal.", {
      x: 40, y: y - 20, size: 7, font, color: lightGray,
    });

    const pdfBytes = await pdfDoc.save();
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(
      JSON.stringify({ pdf_base64: base64, filename: `CompCare_${report.occupation}_${report.kommun}.pdf` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate PDF error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
