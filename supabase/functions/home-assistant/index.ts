// home-assistant — publika, fördefinierade frågor för startsidans assistent.
// Endast deterministiska svar ur SKR-katalogen (contract_version_rates) och
// historiska avrop (calloff_imports). Ingen fritext, ingen AI, ingen PII.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROUP_LABEL = /\bgrupp\s*[a-zA-Z0-9]+\b/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Läkare behåller 85–90 % av kundpriset, övriga roller 80–85 %. */
function shareRange(role: string): [number, number] {
  const isDoctor = /läkare|lakare/i.test(role);
  return isDoctor ? [0.85, 0.9] : [0.8, 0.85];
}

const kr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr/h`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(supabase, "home-assistant", clientIp, 60, 60);
  if (!rl.allowed) {
    return json({ error: "För många frågor just nu. Försök igen om en stund." }, 429);
  }

  let body: { action?: string; key?: string; role?: string; zone?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig förfrågan" }, 400);
  }

  try {
    // ── Rollista ur katalogen (aktiva ramavtalsversioner) ──
    if (body.action === "roles") {
      const { data, error } = await supabase
        .from("contract_version_rates")
        .select("yrkeskategori, contract_versions!inner(is_active)")
        .eq("typ", "Grundpris")
        .eq("contract_versions.is_active", true);
      if (error) throw error;

      const roles = Array.from(
        new Set((data ?? []).map((r: { yrkeskategori: string }) => r.yrkeskategori)),
      )
        .filter((r) => r && !GROUP_LABEL.test(r))
        .sort((a, b) => a.localeCompare(b, "sv"));

      return json({ roles });
    }

    if (body.action !== "answer") return json({ error: "Okänd åtgärd" }, 400);

    const key = body.key ?? "";

    // ── Statiska kunskapssvar ──
    if (key === "ramavtal") {
      return json({
        answer:
          "SKR:s ramavtal sätter det pris regionen betalar per timme för en given roll och zon (grundpris). " +
          "I grundpriset ingår ordinarie arbetstid. Utanför grundpriset ligger OB, jour och beredskap, som ersätts " +
          "separat enligt avtalets påslag, samt resor och boende som regleras per avrop.\n\n" +
          "Ramavtalet reglerar inte din ersättning — det reglerar vad regionen betalar bemanningsföretaget. " +
          "Din del beror på bolagets marginal.",
        source: "SKR:s ramavtal för hyrpersonal, offentliga prisbilagor",
      });
    }

    if (key === "anstallningsform") {
      return json({
        answer:
          "Som egenföretagare fakturerar du kundpriset minus bemanningsbolagets marginal — normalt behåller läkare " +
          "85–90 % och övriga roller 80–85 % av kundpriset. Marginalen kan vara lägre när bolaget tar betalningsrisk " +
          "eller garanterar timmar.\n\n" +
          "Som anställd konsult räknas samma belopp om till lön genom att dela med arbetsgivaravgifter och " +
          "avtalspension (faktor 1,38) och 167 timmar per månad. Samma kundpris ger därför olika belopp på lönebeskedet " +
          "beroende på anställningsform.",
        source: "SKR-ramavtal + branschens standardmarginaler",
      });
    }

    if (key === "uppgifter") {
      return json({
        answer:
          "Roll, ort, kontraktsform och ersättning behövs för att visa information om dina villkor i förhållande till " +
          "den övriga marknaden. Inga uppgifter delas.\n\n" +
          "Data lagras inom EU och används endast för din egen analys.",
        source: "CompCares integritetspolicy",
      });
    }

    // ── Avrop senaste 30 dagarna (historiska, publicerade) ──
    if (key === "avrop") {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { count } = await supabase
        .from("calloff_imports")
        .select("id", { count: "exact", head: true })
        .gte("calloff_date", since);

      const { data: rows } = await supabase
        .from("calloff_imports")
        .select("role, region")
        .gte("calloff_date", since)
        .limit(1000);

      const byRole = new Map<string, number>();
      for (const r of (rows ?? []) as { role: string | null }[]) {
        if (!r.role || GROUP_LABEL.test(r.role)) continue;
        byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1);
      }
      const top = [...byRole.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

      return json({
        answer:
          `Senaste 30 dagarna finns ${count ?? 0} publicerade avrop i underlaget.` +
          (top.length
            ? `\n\nVanligast förekommande roller:\n${top.map(([r, n]) => `• ${r} — ${n} st`).join("\n")}`
            : "") +
          "\n\nUnderlaget är historiskt. CompCare visar inte pågående eller framtida uppdrag.",
        source: "Publicerade avrop, historiskt underlag",
      });
    }

    // ── Prisfrågor: kräver roll (+ zon för pris/fakturering) ──
    if (key === "pris" || key === "fakturera" || key === "zoner") {
      const role = body.role;
      if (!role) return json({ need: "role" });
      if (GROUP_LABEL.test(role)) return json({ error: "Ogiltig roll" }, 400);
      if (key !== "zoner" && !body.zone) return json({ need: "zone", role });

      const { data, error } = await supabase
        .from("contract_version_rates")
        .select("zon, timpris_kund, contract_versions!inner(is_active, version_label)")
        .eq("typ", "Grundpris")
        .eq("contract_versions.is_active", true)
        .ilike("yrkeskategori", role);
      if (error) throw error;

      const rows = (data ?? []) as unknown as {
        zon: string;
        timpris_kund: number;
        contract_versions: { version_label: string };
      }[];
      if (!rows.length) return json({ answer: `Jag hittar inget aktivt ramavtalspris för ${role}.` });

      const byZone: Record<string, number> = {};
      let version = "";
      for (const r of rows) {
        byZone[r.zon] = Number(r.timpris_kund);
        version = r.contract_versions.version_label;
      }
      const [lo, hi] = shareRange(role);

      if (key === "zoner") {
        const lines = ["Zon 1", "Zon 2", "Zon 3"]
          .filter((z) => byZone[z] != null)
          .map((z) => `• ${z}: ${kr(byZone[z])}`)
          .join("\n");
        return json({
          answer: `Kundpris per zon för ${role} (ramavtal ${version}):\n${lines}\n\nZonen bestäms av var uppdraget utförs — zon 3 är mest avlägsen och har högst pris.`,
          source: `SKR-ramavtal ${version}`,
        });
      }

      const zone = body.zone!;
      const price = byZone[zone];
      if (price == null) return json({ answer: `Jag hittar inget pris för ${role} i ${zone}.` });

      if (key === "pris") {
        return json({
          answer:
            `Regionen betalar ${kr(price)} för ${role} i ${zone} enligt ramavtal ${version}.\n\n` +
            `Det är kundpriset — bemanningsbolagets marginal dras innan din ersättning.`,
          source: `SKR-ramavtal ${version}`,
        });
      }

      return json({
        answer:
          `${role} i ${zone}: kundpris ${kr(price)} enligt ramavtal ${version}.\n\n` +
          `Efter bemanningsbolagets standardmarginal landar din fakturering normalt på ` +
          `${kr(price * lo)}–${kr(price * hi)} (${Math.round(lo * 100)}–${Math.round(hi * 100)} % av kundpriset).\n\n` +
          `Som anställd motsvarar det ungefär ${kr((price * lo) / 1.38)}–${kr((price * hi) / 1.38)} i lön, ` +
          `efter arbetsgivaravgifter och avtalspension (faktor 1,38).`,
        source: `SKR-ramavtal ${version} + branschens standardmarginaler`,
      });
    }

    return json({ error: "Okänd fråga" }, 400);
  } catch (e) {
    console.error("[home-assistant]", e);
    return json({ error: "Något gick fel. Försök igen." }, 500);
  }
});
