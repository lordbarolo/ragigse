import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Search, MapPin, Info, Download, Lock } from "lucide-react";
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
  zon?: string;
  timpris_kund?: number;
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
    name: "Ersättningssökning – ramavtalspriser per roll och kommun",
    url: "https://www.compcare.se/faktasidor",
    inLanguage: "sv-SE",
    description:
      "Sök din yrkesroll och kommun för att få din ersättningsanalys enligt regionernas ramavtal 2026. Exakta nivåer visas efter inloggning.",
  },
];

export default function Faktasidor() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [roles, setRoles] = useState<RolePrice[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleQuery, setRoleQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<RolePrice | null>(null);
  const [kommunQuery, setKommunQuery] = useState("");
  const [selectedKommun, setSelectedKommun] = useState<LocationRow | null>(null);
  const [group, setGroup] = useState<"alla" | RolePrice["group"]>("alla");

  useEffect(() => {
    trackEvent("faktasidor_viewed");
  }, []);

  // Auth-status avgör om exakta priser får hämtas alls.
  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!cancelled) setAuthed(!!session);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setAuthed(!!data.user);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authed === null) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Utloggad: hämta ENDAST rollnamn (ingen prisdata lämnar backend).
      // Inloggad: hämta prisdata för den fullständiga analysen.
      const selectCols = authed
        ? "yrkeskategori, typ, detaljer, zon, timpris_kund, contract_versions!inner(is_active)"
        : "yrkeskategori, typ, detaljer, contract_versions!inner(is_active)";

      const [ratesRes, locRes] = await Promise.all([
        supabase
          .from("contract_version_rates")
          .select(selectCols)
          .eq("contract_versions.is_active", true)
          .in("typ", ["Grundpris", "Läkare"]),
        supabase.from("locations").select("kommun, region, zon").order("kommun"),
      ]);

      if (cancelled) return;

      if (ratesRes.error || locRes.error) {
        setError("Kunde inte hämta rollistan just nu. Försök igen om en stund.");
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
        if (r.zon && typeof r.timpris_kund === "number") {
          entry.prices[r.zon as Zone] = Number(r.timpris_kund);
        }
        if (r.detaljer && !/^Art\.nr/i.test(r.detaljer)) entry.detaljer = r.detaljer;
        byRole.set(r.yrkeskategori, entry);
      }

      const list = filterPublicRoles([...byRole.values()], (r) => r.role).sort((a, b) =>
        a.role.localeCompare(b.role, "sv"),
      );
      setRoles(list);
      setSelectedRole((prev) => (prev ? list.find((r) => r.role === prev.role) ?? null : null));
      setLocations((locRes.data ?? []) as LocationRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  const kommunMatches = useMemo(() => {
    const q = kommunQuery.trim().toLowerCase();
    if (!q) return [];
    return locations.filter((l) => l.kommun.toLowerCase().includes(q)).slice(0, 8);
  }, [kommunQuery, locations]);

  const roleMatches = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    return roles
      .filter((r) => {
        if (group !== "alla" && r.group !== group) return false;
        if (!q) return true;
        return r.role.toLowerCase().includes(q) || (r.detaljer ?? "").toLowerCase().includes(q);
      })
      .slice(0, 10);
  }, [roles, roleQuery, group]);

  const activeZone = (selectedKommun?.zon as Zone) ?? null;

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of locations) counts[l.zon] = (counts[l.zon] ?? 0) + 1;
    return counts;
  }, [locations]);

  /** Export är en inloggad funktion — utloggade har ingen prisdata i klienten. */
  function exportToExcel() {
    if (!authed) return;
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

    for (const r of roles) {
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
    lines.push(cell("Källa: SKR ramavtal vårdbemanning 2026. Kundpris exkl. OB och jour."));

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compcare-ramavtalspriser-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("faktasidor_export_clicked");
  }

  function pickRole(r: RolePrice) {
    setSelectedRole(r);
    setRoleQuery(r.role);
    trackEvent("faktasidor_role_selected");
  }

  const zoneForResult: Zone = activeZone ?? "Zon 1";
  const selectedPrice = selectedRole?.prices[zoneForResult];

  return (
    <AnthropicScope>
      <div className="w-full min-h-screen text-foreground font-sans">
        <SEO
          title="Din ersättning enligt ramavtalet 2026 – sök roll och kommun"
          description="Sök din yrkesroll och kommun och få en personlig ersättningsanalys enligt regionernas ramavtal 2026. Skapa konto för att se exakta nivåer."
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
          <p className="text-xs uppercase tracking-wider text-black/50 font-medium mb-3">Ersättningssökning</p>
          <h1 className="font-editorial font-bold leading-[1.12] text-black text-[32px] sm:text-[44px] max-w-[760px]">
            Vad ger ramavtalet för din roll?
          </h1>
          <p className="mt-4 max-w-[640px] text-lg text-black/70 leading-relaxed">
            Välj din yrkesroll och din kommun. Analysen bygger på regionernas ramavtal 2026 och branschens
            marginalmodeller — exakta nivåer visas när du skapat ett konto.
          </p>

          {/* Steg 1: kommun */}
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
                className="w-full rounded-lg border border-black/15 bg-white/70 pl-9 pr-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:outline-hidden focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7]/50"
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
                {ZONE_HELP[selectedKommun.zon as Zone]}.
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

          {/* Steg 2: roll-sök */}
          <section className="mt-12" aria-labelledby="roll-rubrik">
            <h2 id="roll-rubrik" className="text-sm font-semibold text-black mb-3">
              2. Välj din yrkesroll
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-[420px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" aria-hidden />
                <input
                  type="text"
                  value={roleQuery}
                  onChange={(e) => {
                    setRoleQuery(e.target.value);
                    setSelectedRole(null);
                  }}
                  placeholder="Sök roll, t.ex. barnmorska eller psykiatri"
                  aria-label="Sök yrkesroll"
                  role="combobox"
                  aria-expanded={roleMatches.length > 0 && !selectedRole}
                  aria-controls="rollista"
                  className="w-full rounded-lg border border-black/15 bg-white/70 pl-9 pr-3 py-2.5 text-sm text-black placeholder:text-black/40 focus:outline-hidden focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7]/50"
                />
                {!loading && !selectedRole && roleQuery.trim() !== "" && (
                  <ul
                    id="rollista"
                    className="absolute z-20 mt-1 w-full rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden max-h-[320px] overflow-y-auto"
                  >
                    {roleMatches.map((r) => (
                      <li key={r.role}>
                        <button
                          type="button"
                          onClick={() => pickRole(r)}
                          className="w-full text-left px-3 py-2 text-sm text-black hover:bg-black/5"
                        >
                          {r.role}
                          {r.detaljer && <span className="block text-xs text-black/45">{r.detaljer}</span>}
                        </button>
                      </li>
                    ))}
                    {roleMatches.length === 0 && (
                      <li className="px-3 py-2 text-sm text-black/55">Ingen roll matchar sökningen.</li>
                    )}
                  </ul>
                )}
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

            {loading && <p className="mt-6 text-sm text-black/55">Hämtar rollistan…</p>}
            {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

            {/* Resultat */}
            {!loading && !error && selectedRole && (
              <div className="mt-6 max-w-[640px] rounded-2xl border border-black/10 bg-white/70 p-5 sm:p-6">
                <p className="text-xs uppercase tracking-wider text-black/45 font-medium">
                  {zoneForResult} · {ZONE_HELP[zoneForResult]}
                  {selectedKommun ? ` · ${selectedKommun.kommun}` : ""}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-black">{selectedRole.role}</h3>

                {authed && selectedPrice ? (
                  <>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-black/10 px-4 py-3">
                        <dt className="text-xs text-black/55">Kundpris enligt ramavtal</dt>
                        <dd className="text-lg font-semibold text-black tabular-nums">{kr(selectedPrice)}/h</dd>
                      </div>
                      <div className="rounded-xl border border-[#534AB7]/25 bg-[#534AB7]/[0.06] px-4 py-3">
                        <dt className="text-xs text-black/55">Möjlig ersättning som företagare</dt>
                        <dd className="text-lg font-semibold text-black tabular-nums">
                          {kr(selectedPrice * shareRange(selectedRole.group).min)}–
                          {kr(selectedPrice * shareRange(selectedRole.group).max)}/h
                        </dd>
                      </div>
                    </dl>
                    <Link
                      to="/"
                      className="mt-5 inline-flex text-sm font-semibold rounded-lg bg-[#534AB7] text-white px-6 py-3 hover:bg-[#463cA6] transition-colors"
                    >
                      Gör din personliga analys
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-black">
                        <Lock className="w-4 h-4 text-[#534AB7]" aria-hidden />
                        Ersättningsspann beräknat
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-black/25 select-none tabular-nums" aria-hidden>
                        ••• kr – ••• kr /h
                      </p>
                      <p className="mt-2 text-sm text-black/60 leading-relaxed">
                        Vi har räknat fram ramavtalsnivån och marginalspannet för {selectedRole.role} i{" "}
                        {zoneForResult.toLowerCase()}. Skapa konto med e-post eller Google för att se exakt nivå,
                        marginal och vad det ger dig per månad.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        to="/registrera"
                        onClick={() => trackEvent("faktasidor_signup_cta_clicked")}
                        className="inline-flex text-sm font-semibold rounded-lg bg-[#534AB7] text-white px-6 py-3 hover:bg-[#463cA6] transition-colors"
                      >
                        Skapa konto och se analysen
                      </Link>
                      <Link
                        to="/logga-in"
                        className="inline-flex text-sm font-semibold rounded-lg border border-black/15 text-black/80 px-6 py-3 hover:bg-black/5 transition-colors"
                      >
                        Jag har redan konto
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading && !error && !selectedRole && (
              <p className="mt-6 text-sm text-black/55 max-w-[560px]">
                {roles.length} yrkesroller finns i ramavtalet 2026. Sök upp din roll ovan för att få din analys.
              </p>
            )}

            {authed && !loading && !error && (
              <button
                type="button"
                onClick={exportToExcel}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold rounded-lg border border-black/15 px-4 py-2 text-black/80 hover:bg-black/5 transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden />
                Exportera hela listan till Excel
              </button>
            )}

            <div className="mt-8 flex items-start gap-2 max-w-[760px] text-xs leading-relaxed text-black/55">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#534AB7]" aria-hidden />
              <p>
                Underlaget är regionernas offentliga ramavtal 2026 (kundpris exklusive moms, grundpris — OB, jour och
                beredskap tillkommer och faktureras separat). Ersättningsspannet räknas fram utifrån branschens
                marginalmodeller och, för anställda, arbetsgivaravgifter. Hela kalkylen körs i din personliga analys
                efter inloggning. Bygger du en agent? Se{" "}
                <a href="/llms.txt" className="underline underline-offset-4 hover:no-underline">
                  /llms.txt
                </a>{" "}
                och{" "}
                <a href="/openapi.json" className="underline underline-offset-4 hover:no-underline">
                  /openapi.json
                </a>{" "}
                för det maskinläsbara sökflödet.
              </p>
            </div>
          </section>
        </div>

        <SiteFooter />
      </div>
    </AnthropicScope>
  );
}
