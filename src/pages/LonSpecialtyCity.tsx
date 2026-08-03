/**
 * /lon/[specialty]/[city] — programmatisk SEO-sida för timpeng per roll och ort.
 *
 * Kundpriset (SKR:s ramavtal 2026) hämtas server-side i route-loadern och är
 * offentligt. Ersättningen som företagare/löntagare kräver inloggning och
 * hämtas via en autentiserad server function — den lämnar aldrig servern för
 * en utloggad besökare, varken renderad, i JSON-LD eller i JS-bundlen.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRouteApi } from "@tanstack/react-router";
import { getLonCompRate, getLonOptions } from "@/lib/rates.functions";
import { useAuth } from "@/hooks/useAuth";
import { SITE_URL } from "@/lib/site";
import { SEO } from "@/components/SEO";
import SearchableSelect from "@/components/SearchableSelect";

const routeApi = getRouteApi("/lon/$specialty/$city");

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

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
  const { specialty, city } = routeApi.useParams();
  const loaderData = routeApi.useLoaderData();
  const navigate = useNavigate();
  const { user } = useAuth();
  const signedIn = !!user;

  const data = loaderData.found ? loaderData : null;
  const state: "ok" | "missing" = data ? "ok" : "missing";

  const [pickRole, setPickRole] = useState("");
  const [pickCity, setPickCity] = useState("");

  const fetchComp = useServerFn(getLonCompRate);
  const { data: comp } = useQuery({
    queryKey: ["lon-comp", specialty, city],
    queryFn: () => fetchComp({ data: { specialty, city } }),
    enabled: signedIn && state === "ok",
    staleTime: 1000 * 60 * 60,
  });

  const fetchOptions = useServerFn(getLonOptions);
  const { data: options } = useQuery({
    queryKey: ["lon-options"],
    queryFn: () => fetchOptions(),
    enabled: state === "missing",
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    const id = "lon-page-fonts";
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const specialtyLabel = data?.specialty_name ?? titleCase(specialty);
  const cityLabel = data?.location_name ? dedupePlace(data.location_name) : titleCase(city);

  // JSON-LD: @graph med Occupation, Dataset, FAQPage och BreadcrumbList.
  // Endast kundpris — ersättningsnivåerna är vår produkt och publiceras inte.
  const jsonLd = useMemo(() => {
    if (!data) return undefined;
    const place = dedupePlace(data.location_name);
    const url = `${SITE_URL}/lon/${specialty}/${city}`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Occupation",
          "@id": `${url}#occupation`,
          name: data.specialty_name,
          occupationalCategory: data.specialty_name,
          description: `Konsultuppdrag som ${data.specialty_name} i ${place}. Kundpris enligt regionernas ramavtal 2026: ${data.client_rate} kr/h.`,
          occupationLocation: { "@type": "City", name: place, addressCountry: "SE" },
          estimatedSalary: [
            {
              "@type": "MonetaryAmountDistribution",
              name: "Kundpris enligt regionernas ramavtal 2026",
              currency: "SEK",
              unitText: "HOUR",
              median: data.client_rate,
            },
          ],
          provider: {
            "@type": "Organization",
            name: "vårdbemanning.ai",
            url: SITE_URL,
          },
          mainEntityOfPage: { "@id": url },
        },
        {
          "@type": "Dataset",
          "@id": `${url}#dataset`,
          name: `Ramavtalspris ${data.specialty_name}, ${place}, 2026`,
          description: `Timpris (kundpris) enligt regionernas ramavtal 2026 för ${data.specialty_name} i ${place}.`,
          url,
          isAccessibleForFree: true,
          inLanguage: "sv-SE",
          temporalCoverage: "2026",
          spatialCoverage: { "@type": "Place", name: place, addressCountry: "SE" },
          variableMeasured: [
            { "@type": "PropertyValue", name: "Kundpris", unitText: "SEK/timme", value: data.client_rate },
          ],
          creator: { "@type": "Organization", name: "vårdbemanning.ai", url: SITE_URL },
          citation: data.source,
        },
        {
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          mainEntity: [
            {
              "@type": "Question",
              name: `Vad är kundpriset för ${data.specialty_name} i ${place} 2026?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Enligt regionernas ramavtal 2026 är kundpriset ${data.client_rate} kr/h för ${data.specialty_name} i ${place}. Källa: ${data.source}.`,
              },
            },
            {
              "@type": "Question",
              name: `Varför skiljer sig kundpriset från min ersättning som ${data.specialty_name}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Kundpriset (${data.client_rate} kr/h) är vad regionen betalar bemanningsbolaget. Bolaget behåller en marginal för administration, garanterade timmar och betalningsrisk. Som löntagare tas dessutom arbetsgivaravgifter och avtalspension bort. Din beräknade ersättning visas efter inloggning.`,
              },
            },
            {
              "@type": "Question",
              name: `Vilken källa används för priset i ${place}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${data.source}. Vi använder enbart regionernas upphandlade ramavtalspriser samt bemanningsbranschens marginalmodell — aldrig SCB- eller Medlingsinstitutets lönestatistik.`,
              },
            },
          ],
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${url}#breadcrumbs`,
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "vårdbemanning.ai", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Timpeng per roll och ort", item: `${SITE_URL}/faktasidor` },
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

  const Masked = () => (
    <span className="text-[34px] font-semibold leading-none tracking-[0.06em]">••••</span>
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
            ? `Timpeng ${specialtyLabel} i ${cityLabel} 2026 | vårdbemanning.ai`
            : `Timpeng per roll och ort 2026 | vårdbemanning.ai`
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
          vårdbemanning.ai
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
          {state === "ok"
            ? `Timpeng för ${specialtyLabel} i ${cityLabel} (2026)`
            : "Vi hittade ingen prisuppgift för den kombinationen"}
        </h1>

        {state === "ok" && data && (
          <>
            <p className="mt-5 text-[15.5px] leading-relaxed" style={{ color: "#a8adbd" }}>
              Enligt regionernas gällande ramavtal för 2026 ligger det faktiska kundpriset för en{" "}
              {data.specialty_name} i {cityLabel} på {kr(data.client_rate)} kr/h. Efter
              bemanningsbolagets marginal återstår din ersättning som konsult.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl p-5" style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", borderRadius: 12 }}>
                <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,.82)" }}>
                  Som företagare
                </div>
                <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#fff" }}>
                  {signedIn ? (
                    <span className="text-[34px] font-semibold leading-none">{kr(comp?.foretagareKrH)}</span>
                  ) : (
                    <Masked />
                  )}
                  <span className="text-[13px]">kr/h</span>
                </div>
                {!signedIn && (
                  <Link
                    to="/registrera"
                    className="mt-2 inline-block text-[12px] font-semibold underline underline-offset-2"
                    style={{ color: "#fff" }}
                  >
                    Skapa konto för att se
                  </Link>
                )}
              </div>

              <div className="rounded-xl p-5" style={{ background: "#151823", border: "1px solid #262a38", borderRadius: 12 }}>
                <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "#8c90a0" }}>
                  Som löntagare
                </div>
                <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#eef0f4" }}>
                  {signedIn ? (
                    <span className="text-[34px] font-semibold leading-none">{kr(comp?.lontagareKrH)}</span>
                  ) : (
                    <Masked />
                  )}
                  <span className="text-[13px]">kr/h</span>
                </div>
                {!signedIn && (
                  <Link
                    to="/logga-in"
                    className="mt-2 inline-block text-[12px] font-semibold underline underline-offset-2"
                    style={{ color: "#8b8bf6" }}
                  >
                    Logga in
                  </Link>
                )}
              </div>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "#666b7e" }}>
              Kundpris {kr(data.client_rate)} kr/h enligt {data.source}. Ersättningen beräknas utifrån
              ramavtalspriset, bemanningsbranschens marginal och arbetsgivarfaktorn.
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
