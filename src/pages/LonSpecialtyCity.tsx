/**
 * /lon/[specialty]/[city] — programmatic SEO-sida för timpeng per roll och ort.
 * All prisdata kommer från edge-funktionen `public-lon-lookup`, som i sin tur
 * anropar RPC:n `lookup_rate` (SKR:s ramavtal 2026). Ingen prislogik i klienten.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { JsonLd } from "@/components/JsonLd";
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

/** "Stockholm, Stockholm" → "Stockholm" */
const dedupePlace = (name: string) =>
  Array.from(new Set(name.split(",").map((p) => p.trim()).filter(Boolean))).join(", ");

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
  const cityLabel = data?.location_name ? dedupePlace(data.location_name) : titleCase(city);

  // JSON-LD: @graph med Occupation (maskinläsbara spann), FAQPage och BreadcrumbList.
  // Optimerat för LLM:er/agenter — varje siffra har enhet, valuta, giltighet och källa.
  const jsonLd = useMemo(() => {
    if (!data) return undefined;
    const place = dedupePlace(data.location_name);
    const url = `https://vardbemanning.ai/lon/${specialty}/${city}`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Occupation",
          "@id": `${url}#occupation`,
          name: data.specialty_name,
          occupationalCategory: data.specialty_name,
          description: `Konsultuppdrag som ${data.specialty_name} i ${place}. Kundpris enligt regionernas ramavtal 2026: ${data.client_rate} kr/timme.`,
          occupationLocation: { "@type": "City", name: place, addressCountry: "SE" },
          // Primär siffra för agenter: konsultens ersättning som företagare (contractor_rate).
          estimatedSalary: [
            {
              "@type": "MonetaryAmountDistribution",
              name: "Ersättning som företagare",
              currency: "SEK",
              unitText: "HOUR",
              median: data.contractor_rate,
            },
            {
              "@type": "MonetaryAmountDistribution",
              name: "Kundpris enligt regionernas ramavtal 2026",
              currency: "SEK",
              unitText: "HOUR",
              median: data.client_rate,
            },
            {
              "@type": "MonetaryAmountDistribution",
              name: "Ersättning som löntagare",
              currency: "SEK",
              unitText: "HOUR",
              median: data.employee_rate,
            },
          ],
          provider: {
            "@type": "Organization",
            name: "vårdbemanning.ai",
            url: "https://vardbemanning.ai",
          },
          mainEntityOfPage: { "@id": url },
        },

        {
          "@type": "Dataset",
          "@id": `${url}#dataset`,
          name: `Ramavtalspris ${data.specialty_name}, ${place}, 2026`,
          description: `Timpris (kundpris) enligt regionernas ramavtal 2026 för ${data.specialty_name} i ${place}, samt möjlig ersättning för företagare och löntagare.`,
          url,
          isAccessibleForFree: true,
          inLanguage: "sv-SE",
          temporalCoverage: "2026",
          spatialCoverage: { "@type": "Place", name: place, addressCountry: "SE" },
          variableMeasured: [
            { "@type": "PropertyValue", name: "Kundpris", unitText: "SEK/timme", value: data.client_rate },
            { "@type": "PropertyValue", name: "Företagare", unitText: "SEK/timme", value: data.contractor_rate },
            { "@type": "PropertyValue", name: "Löntagare", unitText: "SEK/timme", value: data.employee_rate },
          ],
          creator: { "@type": "Organization", name: "vårdbemanning.ai", url: "https://vardbemanning.ai" },
          citation: data.source,
        },
        {
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: [
            {
              "@type": "Question",
              name: `Vad är timpengen för ${data.specialty_name} i ${place} 2026?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Enligt regionernas ramavtal 2026 är kundpriset ${data.client_rate} kr/timme för ${data.specialty_name} i ${place}. Som företagare kan ersättningen ligga omkring ${data.contractor_rate} kr/timme och som löntagare omkring ${data.employee_rate} kr/timme. Källa: ${data.source}.`,
              },
            },
            {
              "@type": "Question",
              name: `Varför skiljer sig kundpriset från min ersättning som ${data.specialty_name}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Kundpriset (${data.client_rate} kr/timme) är vad regionen betalar bemanningsbolaget. Möjlig ersättning till konsulten är omkring ${data.contractor_rate} kr/timme som företagare och omkring ${data.employee_rate} kr/timme som löntagare.`,
              },
            },
            {
              "@type": "Question",
              name: `Vilken källa används för priset i ${place}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${data.source}. vårdbemanning.ai använder enbart regionernas upphandlade ramavtalspriser — aldrig SCB- eller Medlingsinstitutets lönestatistik.`,
              },
            },
          ],
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${url}#breadcrumbs`,
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "vårdbemanning.ai", item: "https://vardbemanning.ai/" },
            { "@type": "ListItem", position: 2, name: "Timpeng per roll och ort", item: "https://vardbemanning.ai/faktasidor" },
            { "@type": "ListItem", position: 3, name: `${data.specialty_name} i ${place}`, item: url },
          ],
        },
      ],
    };
  }, [data, specialty, city]);


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
        background: "#0b0c10",
        minHeight: "100vh",
        fontFamily: "'Space Grotesk',system-ui,sans-serif",
        color: "#ffffff",
      }}
    >
      {jsonLd ? <JsonLd data={jsonLd} /> : null}

      <header
        className="flex items-center justify-between px-5 py-4 md:px-12 md:py-5"
        style={{ borderBottom: "1px solid #22232b" }}
      >
        <Link
          to="/"
          className="text-[17px] font-semibold"
          style={{ fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "-0.5px", color: "#ffffff" }}
        >
          vårdbemanning.ai
        </Link>
        <Link
          to="/logga-in"
          className="rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          style={{ border: "1px solid rgba(255,255,255,.18)", color: "#ffffff" }}
        >
          Logga in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-5 py-12 md:px-8 md:py-16">
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em]"
          style={{ background: "#121319", border: "1px solid #22232b", color: "#8a8c94", fontFamily: "'IBM Plex Mono',monospace" }}
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
              {data.specialty_name} i {cityLabel} på {kr(data.client_rate)} kr/timme. Efter
              ramavtalet kan du som konsult förvänta dig följande ersättningsspann.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl p-5" style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 12 }}>
                <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,.82)" }}>
                  Som företagare
                </div>
                <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#fff" }}>
                  <span className="text-[34px] font-semibold leading-none">{kr(data.contractor_rate)}</span>
                  <span className="text-[13px]">kr/timme</span>
                </div>
              </div>

              <div className="rounded-xl p-5" style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 12 }}>
                <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "#8a8c94" }}>
                  Som löntagare
                </div>
                <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#ffffff" }}>
                  <span className="text-[34px] font-semibold leading-none">{kr(data.employee_rate)}</span>
                  <span className="text-[13px]">kr/timme</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "#6f7178" }}>
              Kundpris {kr(data.client_rate)} kr/timme enligt {data.source}. Löntagarnivån är omräknad med
              arbetsgivaravgifter och avtalspension.
            </p>

            <div
              className="mt-9 rounded-2xl p-6"
              style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 16 }}
            >
              <p className="text-[15px] leading-relaxed" style={{ color: "#c8ccd8" }}>
                Vill du se din personliga analys, bevaka skift eller få rådgivning?
              </p>
              <Link
                to="/logga-in"
                className="mt-4 inline-block rounded-full text-sm font-semibold"
                style={{ background: "#ffffff", color: "#121319", padding: "12px 24px" }}
              >
                Logga in med e-post
              </Link>
            </div>
          </>
        )}

        {state === "missing" && (
          <div
            className="mt-7 rounded-2xl p-6"
            style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 16 }}
          >
            <p className="text-[14.5px] leading-relaxed" style={{ color: "#a8adbd" }}>
              Välj yrkesroll och ort nedan för att se timpengen enligt ramavtalet 2026.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "#8a8c94", fontFamily: "'IBM Plex Mono',monospace" }}
                >
                  Yrkesroll
                </label>
                <SearchableSelect
                  options={roleSelectOptions}
                  value={pickRole}
                  onValueChange={setPickRole}
                  placeholder={options ? "Välj yrkesroll" : "Hämtar roller…"}
                  triggerClassName="h-12 rounded-[10px] border-[#22232b] bg-[#0b0c10] text-[#ffffff] shadow-none"
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
                  style={{ color: "#8a8c94", fontFamily: "'IBM Plex Mono',monospace" }}
                >
                  Ort
                </label>
                <SearchableSelect
                  options={citySelectOptions}
                  value={pickCity}
                  onValueChange={setPickCity}
                  placeholder={options ? "Välj ort" : "Hämtar orter…"}
                  triggerClassName="h-12 rounded-[10px] border-[#22232b] bg-[#0b0c10] text-[#ffffff] shadow-none"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={!pickRole || !pickCity}
              onClick={() => navigate(`/lon/${pickRole}/${pickCity}`)}
              className="mt-5 rounded-full text-sm font-semibold disabled:opacity-50"
              style={{ background: "#ffffff", color: "#121319", padding: "12px 24px" }}
            >
              Visa timpeng
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
