/**
 * /lon/[specialty]/[city] — programmatic SEO-sida för timpeng per roll och ort.
 * All prisdata kommer från edge-funktionen `public-lon-lookup`, som i sin tur
 * anropar RPC:n `lookup_rate` (SKR:s ramavtal 2026). Ingen prislogik i klienten.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import SearchableSelect from "@/components/SearchableSelect";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

interface LonData {
  found: true;
  specialty_name: string;
  location_name: string;
  client_rate: number;
  contractor_rate: number;
  employee_rate: number;
  source: string;
}

interface Options {
  roles: { name: string; slug: string }[];
  cities: { name: string; region: string; slug: string }[];
}

const kr = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("sv-SE") : "—";

const titleCase = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export default function LonSpecialtyCity() {
  const { specialty = "", city = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<LonData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [options, setOptions] = useState<Options | null>(null);
  const [pickRole, setPickRole] = useState("");
  const [pickCity, setPickCity] = useState("");

  useEffect(() => {
    const id = "lon-page-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setState("loading");
    setData(null);
    supabase.functions
      .invoke("public-lon-lookup", { body: { specialty, city } })
      .then(({ data: res }) => {
        if (!active) return;
        if (res && (res as LonData).found) {
          setData(res as LonData);
          setState("ok");
        } else {
          setState("missing");
        }
      })
      .catch(() => active && setState("missing"));
    return () => {
      active = false;
    };
  }, [specialty, city]);

  // Hämta valbara roller/orter först när vi behöver fallback-sökrutan.
  useEffect(() => {
    if (state !== "missing" || options) return;
    let active = true;
    supabase.functions
      .invoke("public-lon-lookup", { body: { action: "options" } })
      .then(({ data: res }) => {
        if (active && res) setOptions(res as Options);
      });
    return () => {
      active = false;
    };
  }, [state, options]);

  const specialtyLabel = data?.specialty_name ?? titleCase(specialty);
  const cityLabel = data?.location_name ?? titleCase(city);

  const jsonLd = useMemo(() => {
    if (!data) return undefined;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Vad är timpengen för ${data.specialty_name} i ${data.location_name} 2026?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Enligt regionernas ramavtal 2026 är kundpriset ${data.client_rate} kr/h. Som företagare kan ersättningen ligga omkring ${data.contractor_rate} kr/h och som löntagare omkring ${data.employee_rate} kr/h efter bemanningsbolagets marginal. Källa: ${data.source}.`,
          },
        },
      ],
    };
  }, [data]);

  const roleSelectOptions = useMemo(
    () => (options?.roles ?? []).map((r) => ({ value: r.slug, label: r.name })),
    [options],
  );
  const citySelectOptions = useMemo(
    () => (options?.cities ?? []).map((c) => ({ value: c.slug, label: `${c.name} (${c.region})` })),
    [options],
  );

  return (
    <div
      style={{
        background: "#0e1016",
        minHeight: "100vh",
        fontFamily: "'Space Grotesk',system-ui,sans-serif",
        color: "#eef0f4",
      }}
    >
      <SEO
        title={
          state === "ok"
            ? `Timpeng ${specialtyLabel} i ${cityLabel} 2026 | CompCare`
            : `Timpeng per roll och ort 2026 | CompCare`
        }
        description={
          state === "ok" && data
            ? `Kundpris enligt regionernas ramavtal 2026 för ${specialtyLabel} i ${cityLabel}: ${data.client_rate} kr/h. Se vad du kan få som företagare eller löntagare.`
            : "Timpeng och ersättningsspann per yrkesroll och ort enligt regionernas ramavtal 2026."
        }
        path={`/lon/${specialty}/${city}`}
        noindex={state !== "ok"}
        jsonLd={jsonLd}
      />

      <header
        className="flex items-center justify-between px-5 py-4 md:px-12 md:py-5"
        style={{ borderBottom: "1px solid #22242e" }}
      >
        <Link
          to="/"
          className="text-[17px] font-semibold"
          style={{ fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "-0.5px", color: "#eef0f4" }}
        >
          compcare
        </Link>
        <Link
          to="/logga-in"
          className="rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          style={{ border: "1px solid rgba(255,255,255,.18)", color: "#eef0f4" }}
        >
          Logga in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-5 py-12 md:px-8 md:py-16">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em]"
          style={{ background: "#151823", border: "1px solid #262a38", color: "#8c90a0", fontFamily: "'IBM Plex Mono',monospace" }}
        >
          SKR Ramavtal 2026
        </div>

        <h1 className="text-[30px] font-semibold leading-[1.15] md:text-[40px]" style={{ letterSpacing: "-1px" }}>
          {state === "loading"
            ? "Hämtar timpeng…"
            : state === "ok"
              ? `Timpeng för ${specialtyLabel} i ${cityLabel} (2026)`
              : "Vi hittade ingen prisuppgift för den kombinationen"}
        </h1>

        {state === "ok" && data && (
          <>
            <p className="mt-5 text-[15.5px] leading-relaxed" style={{ color: "#a8adbd" }}>
              Enligt regionernas gällande ramavtal för 2026 ligger det faktiska kundpriset för en{" "}
              {data.specialty_name} i {data.location_name} på {kr(data.client_rate)} kr/h. Efter
              bemanningsbolagets typiska marginal kan du som konsult förvänta dig följande ersättningsspann.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl p-5" style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", borderRadius: 12 }}>
                <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,.82)" }}>
                  Som företagare
                </div>
                <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#fff" }}>
                  <span className="text-[34px] font-semibold leading-none">{kr(data.contractor_rate)}</span>
                  <span className="text-[13px]">kr/h</span>
                </div>
              </div>

              <div className="rounded-xl p-5" style={{ background: "#151823", border: "1px solid #262a38", borderRadius: 12 }}>
                <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "#8c90a0" }}>
                  Som löntagare
                </div>
                <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#eef0f4" }}>
                  <span className="text-[34px] font-semibold leading-none">{kr(data.employee_rate)}</span>
                  <span className="text-[13px]">kr/h</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "#666b7e" }}>
              Kundpris {kr(data.client_rate)} kr/h enligt {data.source}. Löntagarnivån är omräknad med
              arbetsgivaravgifter och avtalspension.
            </p>

            <div
              className="mt-9 rounded-2xl p-6"
              style={{ background: "#151823", border: "1px solid #262a38", borderRadius: 16 }}
            >
              <p className="text-[15px] leading-relaxed" style={{ color: "#c8ccd8" }}>
                Vill du se exakt marginalanalys, bevaka skift eller få personlig rådgivning?
              </p>
              <Link
                to="/logga-in"
                className="mt-4 inline-block rounded-full text-sm font-semibold"
                style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", color: "#fff", padding: "12px 24px" }}
              >
                Logga in med e-post
              </Link>
            </div>
          </>
        )}

        {state === "missing" && (
          <div
            className="mt-7 rounded-2xl p-6"
            style={{ background: "#151823", border: "1px solid #262a38", borderRadius: 16 }}
          >
            <p className="text-[14.5px] leading-relaxed" style={{ color: "#a8adbd" }}>
              Välj yrkesroll och ort nedan för att se timpengen enligt ramavtalet 2026.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "#8c90a0", fontFamily: "'IBM Plex Mono',monospace" }}
                >
                  Yrkesroll
                </label>
                <SearchableSelect
                  options={roleSelectOptions}
                  value={pickRole}
                  onValueChange={setPickRole}
                  placeholder={options ? "Välj yrkesroll" : "Hämtar roller…"}
                  triggerClassName="h-12 rounded-[10px] border-[#2c3142] bg-[#0e1016] text-[#eef0f4] shadow-none"
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "#8c90a0", fontFamily: "'IBM Plex Mono',monospace" }}
                >
                  Ort
                </label>
                <SearchableSelect
                  options={citySelectOptions}
                  value={pickCity}
                  onValueChange={setPickCity}
                  placeholder={options ? "Välj ort" : "Hämtar orter…"}
                  triggerClassName="h-12 rounded-[10px] border-[#2c3142] bg-[#0e1016] text-[#eef0f4] shadow-none"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={!pickRole || !pickCity}
              onClick={() => navigate(`/lon/${pickRole}/${pickCity}`)}
              className="mt-5 rounded-full text-sm font-semibold disabled:opacity-50"
              style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", color: "#fff", padding: "12px 24px" }}
            >
              Visa timpeng
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
