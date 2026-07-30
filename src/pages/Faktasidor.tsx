import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Info, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AnthropicScope from "@/components/demo/AnthropicScope";
import CompcareLogo from "@/components/CompcareLogo";
import SiteFooter from "@/components/landing/SiteFooter";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/trackEvent";
import { filterPublicRoles } from "@/lib/roleVisibility";

type Zone = "Zon 1" | "Zon 2" | "Zon 3";

interface RoleRow {
  yrkeskategori: string;
  typ: string;
  detaljer: string | null;
  zon: string;
  timpris_kund: number;
}

interface LocationRow {
  kommun: string;
  region: string;
  zon: string;
}

interface RolePrice {
  role: string;
  group: "Läkare" | "Sjuksköterska och barnmorska";
  detaljer: string | null;
  prices: Partial<Record<Zone, number>>;
}

const ZONES: Zone[] = ["Zon 1", "Zon 2", "Zon 3"];

const ZONE_HELP: Record<Zone, string> = {
  "Zon 1": "Nära storstad",
  "Zon 2": "Mellanstora orter",
  "Zon 3": "Glesbygd och långt avstånd",
};

/** Andel av kundpriset som konsulten typiskt kan behålla (branschmarginal). */
function shareRange(group: RolePrice["group"]) {
  return group === "Läkare" ? { min: 0.85, max: 0.9 } : { min: 0.8, max: 0.85 };
}

const kr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;

const FAKTA_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Faktasidor – ramavtalspriser per roll och kommun",
    url: "https://www.compcare.se/faktasidor",
    inLanguage: "sv-SE",
    description:
      "Offentliga ramavtalspriser 2026 per yrkesroll och zon, samt vilken zon varje svensk kommun tillhör.",
  },
];

export default function Faktasidor() {
  const [roles, setRoles] = useState<RolePrice[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleQuery, setRoleQuery] = useState("");
  const [kommunQuery, setKommunQuery] = useState("");
  const [selectedKommun, setSelectedKommun] = useState<LocationRow | null>(null);
  const [group, setGroup] = useState<"alla" | RolePrice["group"]>("alla");

  useEffect(() => {
    trackEvent("faktasidor_viewed");
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [ratesRes, locRes] = await Promise.all([
        supabase
          .from("contract_version_rates")
          .select("yrkeskategori, typ, detaljer, zon, timpris_kund, contract_versions!inner(is_active)")
          .eq("contract_versions.is_active", true)
          .in("typ", ["Grundpris", "Läkare"]),
        supabase.from("locations").select("kommun, region, zon").order("kommun"),
      ]);

      if (cancelled) return;

      if (ratesRes.error || locRes.error) {
        setError("Kunde inte hämta prislistan just nu. Försök igen om en stund.");
        setLoading(false);
        return;
      }

      const byRole = new Map<string, RolePrice>();
      for (const r of (ratesRes.data ?? []) as unknown as RoleRow[]) {
        const isDoctor = /läkare/i.test(r.yrkeskategori);
        const entry = byRole.get(r.yrkeskategori) ?? {
          role: r.yrkeskategori,
          group: isDoctor ? "Läkare" : "Sjuksköterska och barnmorska",
          detaljer: null,
          prices: {},
        };
        entry.prices[r.zon as Zone] = Number(r.timpris_kund);
        if (r.detaljer && !/^Art\.nr/i.test(r.detaljer)) entry.detaljer = r.detaljer;
        byRole.set(r.yrkeskategori, entry);
      }

      setRoles(
        filterPublicRoles([...byRole.values()], (r) => r.role).sort((a, b) =>
          a.role.localeCompare(b.role, "sv"),
        ),
      );
      setLocations((locRes.data ?? []) as LocationRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const kommunMatches = useMemo(() => {
    const q = kommunQuery.trim().toLowerCase();
    if (!q) return [];
    return locations.filter((l) => l.kommun.toLowerCase().includes(q)).slice(0, 8);
  }, [kommunQuery, locations]);

  const visibleRoles = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    return roles.filter((r) => {
      if (group !== "alla" && r.group !== group) return false;
      if (!q) return true;
      return r.role.toLowerCase().includes(q) || (r.detaljer ?? "").toLowerCase().includes(q);
    });
  }, [roles, roleQuery, group]);

  const activeZone = (selectedKommun?.zon as Zone) ?? null;

  /** Exporterar de synliga rollerna som CSV med semikolon + BOM (öppnas direkt i Excel). */
  function exportToExcel() {
    const head = [
      "Roll",
      "Yrkesgrupp",
      "Zon 1 kundpris (kr/h)",
      "Zon 2 kundpris (kr/h)",
      "Zon 3 kundpris (kr/h)",
      "Zon 1 ersättning (kr/h)",
      "Zon 2 ersättning (kr/h)",
      "Zon 3 ersättning (kr/h)",
    ];
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [head.map(cell).join(";")];

    for (const r of visibleRoles) {
      const { min, max } = shareRange(r.group);
      const span = (z: Zone) => {
        const p = r.prices[z];
        if (!p) return "";
        return `${Math.round(p * min)}–${Math.round(p * max)}`;
      };
      lines.push(
        [
          cell(r.role),
          cell(r.group),
          cell(r.prices["Zon 1"] ?? ""),
          cell(r.prices["Zon 2"] ?? ""),
          cell(r.prices["Zon 3"] ?? ""),
          cell(span("Zon 1")),
          cell(span("Zon 2")),
          cell(span("Zon 3")),
        ].join(";"),
      );
    }
    lines.push("");
    lines.push(
      cell(
        "Källa: SKR ramavtal vårdbemanning 2026. Kundpris exkl. OB och jour. Ersättning = kundpris × branschmarginal (läkare 85–90 %, sjuksköterskor 80–85 %).",
      ),
    );

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compcare-ramavtalspriser-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("faktasidor_export_clicked");
  }

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of locations) counts[l.zon] = (counts[l.zon] ?? 0) + 1;
    return counts;
  }, [locations]);

  return (
    <AnthropicScope>
      <div className="w-full min-h-screen text-foreground font-sans">
        <SEO
          title="Faktasidor – ramavtalspriser per roll och kommun 2026"
          description="Se de offentliga ramavtalspriserna 2026 för sjuksköterskor, barnmorskor och läkare, per zon och kommun. Uppdaterad prislista från regionernas ramavtal."
          path="/faktasidor"
          jsonLd={FAKTA_JSONLD}
        />

        {/* Nav */}
        <nav className="relative flex items-center justify-between px-5 sm:px-6 lg:px-10 h-[60px] border-b border-black/10">
          <Link to="/" aria-label="CompCare startsida" className="inline-flex items-center text-black">
            <CompcareLogo variant="full" inverted={false} />
          </Link>
          <Link to="/logga-in">
            <button
              className="text-sm text-black hover:bg-black/5 transition-colors"
              style={{ backgroundColor: "transparent", border: "1px solid rgba(0,0,0,0.3)", borderRadius: "6px", padding: "8px 16px" }}
            >
              Logga in
            </button>
          </Link>
        </nav>

        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-10 pt-12 pb-8">
          <p className="text-xs uppercase tracking-wider text-black/50 font-medium mb-3">Faktasidor</p>
          <h1 className="font-editorial font-bold leading-[1.12] text-black text-[32px] sm:text-[44px] max-w-[760px]">
            Ramavtalspriser per roll och kommun
          </h1>
          <p className="mt-4 max-w-[640px] text-lg text-black/70 leading-relaxed">
            Priserna nedan är regionernas offentliga ramavtalspriser för 2026 — det kunden betalar per timme.
            Sök upp din kommun för att se vilken zon den tillhör, och din roll för att se priset.
          </p>

          {/* Kommun-sök */}
          <section className="mt-10" aria-labelledby="kommun-rubrik">
            <h2 id="kommun-rubrik" className="text-sm font-semibold text-black mb-3">
              1. Hitta din kommun
            </h2>
            <div className="relative max-w-[420px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" aria-hidden />
              <input
                type="text"
                value={kommunQuery}
                onChange={(e) => {
                  setKommunQuery(e.target.value);
                  setSelectedKommun(null);
                }}
                placeholder="Sök kommun, t.ex. Bollnäs"
                aria-label="Sök kommun"
                className="w-full rounded-lg border border-black/15 bg-white/70 pl-9 pr-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7]/50"
              />
              {kommunMatches.length > 0 && !selectedKommun && (
                <ul className="absolute z-20 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden">
                  {kommunMatches.map((l) => (
                    <li key={l.kommun}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedKommun(l);
                          setKommunQuery(l.kommun);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-black hover:bg-black/5 flex items-center justify-between gap-3"
                      >
                        <span>
                          {l.kommun}
                          <span className="text-black/45"> · {l.region}</span>
                        </span>
                        <span className="text-black/55 text-xs">{l.zon}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedKommun && (
              <div className="mt-4 rounded-xl border border-[#534AB7]/25 bg-[#534AB7]/[0.06] px-4 py-3 text-sm text-black/80 max-w-[520px]">
                <strong className="font-semibold text-black">{selectedKommun.kommun}</strong> ({selectedKommun.region})
                tillhör <strong className="font-semibold text-black">{selectedKommun.zon}</strong> —{" "}
                {ZONE_HELP[selectedKommun.zon as Zone]}. Kolumnen för {selectedKommun.zon} är markerad i tabellen nedan.
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKommun(null);
                    setKommunQuery("");
                  }}
                  className="ml-2 underline underline-offset-4 hover:no-underline"
                >
                  Rensa
                </button>
              </div>
            )}

            <dl className="mt-4 grid gap-2 sm:grid-cols-3 max-w-[720px]">
              {ZONES.map((z) => (
                <div key={z} className="rounded-lg border border-black/10 px-3 py-2">
                  <dt className="text-xs font-semibold text-black">{z}</dt>
                  <dd className="text-xs text-black/60">
                    {ZONE_HELP[z]}
                    {zoneCounts[z] ? ` · ${zoneCounts[z]} kommuner` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Roll-sök + tabell */}
          <section className="mt-12" aria-labelledby="priser-rubrik">
            <h2 id="priser-rubrik" className="text-sm font-semibold text-black mb-3">
              2. Priser per roll
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-[420px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" aria-hidden />
                <input
                  type="text"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                  placeholder="Sök roll, t.ex. anestesi eller barnmorska"
                  aria-label="Sök yrkesroll"
                  className="w-full rounded-lg border border-black/15 bg-white/70 pl-9 pr-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7]/50"
                />
              </div>
              <div className="flex gap-2" role="group" aria-label="Filtrera yrkesgrupp">
                {(["alla", "Sjuksköterska och barnmorska", "Läkare"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    aria-pressed={group === g}
                    className={`text-sm font-medium rounded-lg px-3 py-2 border transition-colors ${
                      group === g
                        ? "border-[#534AB7] bg-[#534AB7] text-white"
                        : "border-black/15 text-black/70 hover:bg-black/5"
                    }`}
                  >
                    {g === "alla" ? "Alla" : g === "Läkare" ? "Läkare" : "Sjuksköterskor"}
                  </button>
                ))}
              </div>
            </div>

            {loading && <p className="mt-6 text-sm text-black/55">Hämtar prislistan…</p>}
            {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

            {!loading && !error && (
              <>
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-black/50">
                    Visar {visibleRoles.length} av {roles.length} roller.
                  </p>
                  <button
                    type="button"
                    onClick={exportToExcel}
                    className="inline-flex items-center gap-2 text-sm font-semibold rounded-lg border border-black/15 px-4 py-2 text-black/80 hover:bg-black/5 transition-colors"
                  >
                    <Download className="w-4 h-4" aria-hidden />
                    Exportera till Excel
                  </button>
                </div>


                <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-white/60">
                  <table className="w-full min-w-[640px] text-sm">
                    <caption className="sr-only">
                      Ramavtalspriser 2026 i kronor per timme, per yrkesroll och zon
                    </caption>
                    <thead>
                      <tr className="border-b border-black/10 text-left">
                        <th scope="col" className="px-4 py-3 font-semibold text-black">
                          Roll
                        </th>
                        {ZONES.map((z) => (
                          <th
                            key={z}
                            scope="col"
                            className={`px-4 py-3 font-semibold text-right whitespace-nowrap ${
                              activeZone === z ? "text-[#534AB7]" : "text-black"
                            }`}
                          >
                            {z}
                          </th>
                        ))}
                        <th scope="col" className="px-4 py-3 font-semibold text-black text-right whitespace-nowrap">
                          Möjlig ersättning
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRoles.map((r) => {
                        const share = shareRange(r.group);
                        const ref = activeZone ? r.prices[activeZone] : r.prices["Zon 1"];
                        return (
                          <tr key={r.role} className="border-b border-black/[0.06] last:border-0">
                            <th scope="row" className="px-4 py-3 font-medium text-black text-left align-top">
                              {r.role}
                              {r.detaljer && (
                                <span className="block text-xs font-normal text-black/50">{r.detaljer}</span>
                              )}
                            </th>
                            {ZONES.map((z) => (
                              <td
                                key={z}
                                className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${
                                  activeZone === z ? "bg-[#534AB7]/[0.07] font-semibold text-black" : "text-black/75"
                                }`}
                              >
                                {r.prices[z] ? kr(r.prices[z]!) : "—"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-black/60">
                              {ref ? `${kr(ref * share.min)}–${kr(ref * share.max)}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {visibleRoles.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-black/55">
                            Ingen roll matchar sökningen.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-5 flex items-start gap-2 max-w-[760px] text-xs leading-relaxed text-black/55">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#534AB7]" aria-hidden />
              <p>
                Priserna är kundpris exklusive moms enligt regionernas ramavtal 2026 och avser grundpris — OB, jour och
                beredskap tillkommer och faktureras separat. Kolumnen ”Möjlig ersättning” visar vad en konsult typiskt
                kan behålla efter bemanningsföretagets marginal: cirka 85–90 procent för specialistläkare och 80–85
                procent för övriga roller. Marginalen kan vara lägre när bolaget garanterar timmar eller tar
                betalningsrisk. Är du anställd i bemanningsföretaget räknas beloppet om med arbetsgivaravgifter
                (faktor 1,38) fördelat på 167 timmar i månaden.{" "}
                <Link to="/" className="underline underline-offset-4 hover:no-underline">
                  Gör en personlig analys
                </Link>{" "}
                för att se vad som gäller för just din roll och ort.
              </p>
            </div>
          </section>
        </div>

        <SiteFooter />
      </div>
    </AnthropicScope>
  );
}
