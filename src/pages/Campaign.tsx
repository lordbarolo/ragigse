import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, ArrowRight, FileCheck, MessageSquare, BarChart3 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

/* ── Slug → yrkeskategori mapping ───────────────── */
const ROLE_MAP: Record<string, string> = {
  anestesi: "Specialistsjuksköterska anestesi",
  intensivvard: "Specialistsjuksköterska intensivvård",
  operation: "Specialistsjuksköterska operationssjukvård",
  akutsjukvard: "Specialistsjuksköterska akutsjukvård",
  ambulans: "Specialistsjuksköterska ambulanssjukvård",
  barnmorska: "Barnmorska",
  sjukskoterska: "Sjuksköterska",
  distriktsskoterska: "Distriktssjuksköterska",
  rontgen: "Röntgensjuksköterska",
  psykiatri: "Specialistsjuksköterska psykiatrisk vård",
  onkologi: "Specialistsjuksköterska onkologisk vård",
  kirurgi: "Specialistsjuksköterska kirurgisk vård",
  medicin: "Specialistsjuksköterska medicinsk vård",
  palliativ: "Specialistsjuksköterska palliativ vård",
  barn: "Specialistsjuksköterska barn och ungdom",
  hjart: "Specialistsjuksköterska hjärtsjukvård",
  aldre: "Specialistsjuksköterska vård av äldre",
  diabetes: "Specialistsjuksköterska diabetesvård",
  infektion: "Specialistsjuksköterska infektionssjukvård",
  ogon: "Specialistsjuksköterska ögonsjukvård",
  foretagshalsa: "Specialistsjuksköterska företagshälsovård",
  skola: "Skolsköterska",
  lakare: "Legitimerad läkare",
  "specialist-a": "Specialistläkare Grupp A",
  "specialist-b": "Specialistläkare Grupp B",
};

/* Short display label for the role */
function shortLabel(fullRole: string): string {
  return fullRole
    .replace("Specialistsjuksköterska ", "")
    .replace("Specialistläkare ", "Specialistläkare – ");
}

interface ZoneRate {
  zon: string;
  timpris_kund: number;
}

export default function Campaign() {
  const { role } = useParams<{ role: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uniqueId = searchParams.get("id");

  const yrkeskategori = role ? ROLE_MAP[role] : undefined;
  const displayLabel = yrkeskategori ? shortLabel(yrkeskategori) : role ?? "";

  const [rates, setRates] = useState<ZoneRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch rates for this role
      if (yrkeskategori) {
        const { data } = await supabase
          .from("contract_version_rates")
          .select("zon, timpris_kund")
          .eq("yrkeskategori", yrkeskategori)
          .in("version_id", 
            (await supabase.from("contract_versions").select("id").eq("is_active", true)).data?.map(v => v.id) ?? []
          )
          .order("zon");
        if (data) setRates(data);
      }

      // Track campaign visit (fire-and-forget, no personal data used on page)
      if (uniqueId) {
        supabase.functions.invoke("track-event", {
          body: { event_name: "campaign_visit", metadata: { external_id: uniqueId, role: role } },
        }).catch(() => {});
      }

      setLoading(false);
    }
    load();
  }, [yrkeskategori, uniqueId, role]);

  if (!yrkeskategori) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-semibold text-foreground">Okänd yrkesroll</h1>
          <p className="text-muted-foreground">Kontrollera länken du fick i mailet.</p>
        </div>
      </div>
    );
  }

  const zonLabel = (z: string) => {
    if (z === "Zon 1") return "Zon 1 · Storstad";
    if (z === "Zon 2") return "Zon 2 · Mellanstor stad";
    return "Zon 3 · Glesbygd";
  };

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* ── Nav ──────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <CompcareLogo />
        <button
          onClick={() => navigate("/logga-in")}
          className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
        >
          Logga in
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-20">
        {/* ── Hero ─────────────────────────────── */}
        <section className="pt-12 pb-10 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Vårdlivet, lite enklare.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Vi sammanställer marknadens data så att du får full insyn i ersättningar och avtal.
            Baserat på granskade siffror från regionernas ramavtal 2026.
          </p>
        </section>

        {/* ── Pricing table ───────────────────── */}
        <section className="mb-14">
          <h2
            className="text-lg font-semibold text-foreground mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Aktuella priser – {displayLabel}
          </h2>
          <div className="border border-border rounded-2xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left py-3.5 px-5 font-medium text-muted-foreground">Zon</th>
                  <th className="text-right py-3.5 px-5 font-medium text-muted-foreground">Regionens pris (kr/tim)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-muted-foreground">Laddar…</td>
                  </tr>
                ) : rates.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-muted-foreground">Prisdata saknas för denna roll.</td>
                  </tr>
                ) : (
                  rates.map((r, i) => (
                    <tr key={r.zon} className={i < rates.length - 1 ? "border-b border-border" : ""}>
                      <td className="py-3.5 px-5 text-foreground font-medium">{zonLabel(r.zon)}</td>
                      <td className="py-3.5 px-5 text-right text-foreground tabular-nums font-semibold">
                        {r.timpris_kund.toLocaleString("sv-SE")} kr
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-2.5 text-center">
            Källa: SKR ramavtal 2026. Priserna avser vad regionen betalar bemanningsföretaget.
          </p>
        </section>

        {/* ── Service cards ────────────────────── */}
        <section className="mb-14">
          <h2
            className="text-lg font-semibold text-foreground mb-6 text-center"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tre frågor. Ett svar.
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Card 1: Löneanalys — open */}
            <button
              onClick={() => navigate("/")}
              className="group text-left border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                Löneanalys
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Jämför din ersättning mot regionernas faktiska priser i realtid.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Starta analys <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            {/* Card 2: Löneassistenten — locked */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="group text-left border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-all relative"
            >
              <div className="absolute top-4 right-4">
                <Lock className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                Löneassistenten
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Få personlig rådgivning baserad på din specifika erfarenhet.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-sm text-muted-foreground/60">
                Kräver säker inloggning
              </span>
            </button>

            {/* Card 3: Fakturakontroll */}
            <button
              onClick={() => navigate("/consultant/fakturakontroll")}
              className="group text-left border border-border rounded-2xl p-6 bg-card hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                Fakturakontroll
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Säkerställ att du inte missat ersättning för OB, jour eller arbetad tid.
              </p>
              <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Kontrollera <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        </section>

        {/* ── Bottom summary ──────────────────── */}
        <section className="mb-14 text-center">
          <h2
            className="text-lg font-semibold text-foreground mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Allt för din yrkesekonomi på ett ställe
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Löneanalys, förhandlingsunderlag och fakturakontroll – samlat i en plattform
            byggd för dig som vårdkonsult. Data hämtas från SKR:s ramavtal 2026,
            Medlingsinstitutet och avropsdata från 21 regioner.
          </p>
        </section>

        {/* ── CTA ─────────────────────────────── */}
        <section className="text-center pb-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background font-semibold text-base hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Se rapporten för din roll
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-muted-foreground/50 mt-3">
            Inga påhittade siffror – bara granskad marknadsdata
          </p>
        </section>

        {/* ── Footer ──────────────────────────── */}
        <footer className="pt-10 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} CompCare · <a href="/integritetspolicy" className="underline hover:text-muted-foreground">Integritetspolicy</a>
          </p>
        </footer>
      </main>

      {/* ── Auth Modal ────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAuthModal(false)}>
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Identifiera dig säkert
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Identifiera dig säkert för personlig rådgivning. Din data hanteras enligt
              högsta säkerhetsstandard och delas aldrig med utomstående.
            </p>
            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate("/registrera")}
                className="w-full py-3.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Skapa konto
              </button>
              <button
                onClick={() => navigate("/logga-in")}
                className="w-full py-3.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-secondary/50 transition-colors"
              >
                Logga in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
