import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import sskWindow from "@/assets/ssk-window.png";
import { captureError } from "@/lib/posthog";
import {
  buildRateCards,
  fetchActiveContractRates,
  formatRate,
  type RoleRateCard,
} from "@/lib/homeRates";

function RateCard({ card }: { card: RoleRateCard }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-[18px] py-4">
      <div className="mb-2 flex items-start justify-between gap-3 text-[10.5px] uppercase tracking-[0.05em] text-[#666b7e]">
        <span className="leading-tight">{card.role}</span>
        <span className="shrink-0">{card.zone}</span>
      </div>
      <div className="flex gap-5">
        <div>
          <div className="mb-0.5 text-[11px] text-[#8c90a0]">Företagare</div>
          <div className="font-plex text-xl font-medium text-[#eef0f4]">
            {formatRate(card.foretagare)}
          </div>
        </div>
        <div>
          <div className="mb-0.5 text-[11px] text-[#8c90a0]">Löntagare</div>
          <div className="font-plex text-xl font-medium text-[#8c90a0]">
            {formatRate(card.lontagare)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsultantRatesBand() {
  const [cards, setCards] = useState<RoleRateCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleCount, setRoleCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rates = await fetchActiveContractRates();
      setRoleCount(new Set(rates.map((r) => r.yrkeskategori)).size);
      setCards(buildRateCards(rates, 15));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Okänt fel";
      setError(message);
      captureError(err, { scope: "consultant_rates_band" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="grid border-t border-white/[0.07] lg:grid-cols-[420px_1fr]">
      {/* Foto */}
      <div className="relative min-h-[280px] overflow-hidden lg:min-h-[460px]">
        <img
          src={sskWindow}
          alt="Sjuksköterska vid ett fönster på sjukhus"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover animate-cc-kenburns motion-reduce:animate-none"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background: "linear-gradient(90deg,rgba(13,15,21,0) 60%,rgba(13,15,21,.9))",
          }}
        />
      </div>

      {/* Innehåll */}
      <div className="px-6 py-10 sm:px-10 lg:p-12">
        <p className="mb-2.5 font-plex text-[11px] font-medium uppercase tracking-[0.1em] text-[#7c7ff2]">
          SKR ramavtal 2026 · Konsultersättning per zon
        </p>
        <h2 className="mb-2 font-grotesk text-[26px] font-semibold tracking-[-0.01em] text-[#eef0f4]">
          Vad konsulten faktiskt får
        </h2>
        <p className="mb-[26px] max-w-[520px] text-[13.5px] leading-[1.55] text-[#8c90a0]">
          {roleCount > 0
            ? `Exempel från ${Math.min(roleCount, 15)} av de mest sökta rollerna`
            : "Exempel från de mest sökta rollerna"}{" "}
          — kundpris minus typisk bemanningsmarginal (12 % läkare · 17 % sjuksköterskor).
        </p>

        {loading && (
          <div
            className="flex items-center gap-2 text-[13.5px] text-[#8c90a0]"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Hämtar aktuella ramavtalspriser…
          </div>
        )}

        {!loading && error && (
          <div
            className="max-w-[520px] rounded-xl border border-[#f0a5a5]/25 bg-[#f0a5a5]/[0.07] px-[18px] py-4"
            role="alert"
          >
            <p className="text-[13.5px] leading-[1.55] text-[#e8c9c9]">
              Priserna kunde inte hämtas just nu. Det är ett tillfälligt fel — siffrorna finns, de
              gick bara inte att läsa den här gången.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9da0f5] hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Försök igen
            </button>
          </div>
        )}

        {!loading && !error && cards?.length === 0 && (
          <p className="max-w-[520px] text-[13.5px] leading-[1.55] text-[#8c90a0]">
            Ingen aktiv avtalsversion är publicerad just nu. Priserna visas så snart nästa version
            är på plats.
          </p>
        )}

        {!loading && !error && cards && cards.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => (
              <RateCard key={`${card.role}-${card.zone}`} card={card} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
