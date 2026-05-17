import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { SPECIALITY_OPTIONS } from "@/lib/specialitySlugs";
import { trackEvent } from "@/lib/trackEvent";

/**
 * Hero inline form: specialty dropdown + CTA.
 * Skickar besökaren till /v1?start=1&yrke=<slug> så Survey öppnar
 * direkt på rätt steg via PREFILL_MAP / resolvePrefill().
 *
 * Vi medvetet HOPPAR ÖVER zon-fältet i hero-formuläret eftersom:
 *  - Zon kräver kommun (per mem://logic/geographical-pricing-logic)
 *  - Tre dropdowns i hero blir för tungt på mobil (375px-budget)
 *  - Survey steg 3 hanterar kommun → zon redan korrekt
 */
export default function HeroInlineForm() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SPECIALITY_OPTIONS;
    return SPECIALITY_OPTIONS.filter((o) => o.label.toLowerCase().includes(q));
  }, [query]);

  const handlePick = (slug: string, label: string) => {
    trackEvent("product_cta_clicked", { cta: "hero_inline_role", target: `/v1?yrke=${slug}`, role: label });
    navigate(`/v1?start=1&yrke=${encodeURIComponent(slug)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasQuery = query.trim().length > 0;
    if (hasQuery && filtered[0]) {
      handlePick(filtered[0].slug, filtered[0].label);
    } else {
      trackEvent("product_cta_clicked", { cta: "hero_inline_empty", target: "/v1?start=1" });
      navigate("/v1?start=1");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(13,11,42,0.18)] p-3 sm:p-4 flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3 max-w-[560px] w-full"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B85] pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Sök specialitet (t.ex. anestesi)"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full h-11 pl-9 pr-3 text-[15px] text-[#0D0B2A] placeholder:text-[#6B6B85] bg-white border border-[#E2E1EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7]"
          aria-label="Specialitet"
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#E2E1EC] rounded-lg shadow-lg max-h-64 overflow-auto">
            {filtered.map((o) => (
              <button
                key={o.slug}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(o.slug, o.label)}
                className="w-full text-left px-3.5 py-2.5 text-[14px] text-[#0D0B2A] hover:bg-[#F2F1F8] transition-colors border-b border-[#E2E1EC]/60 last:border-b-0"
              >
                {o.label}
                <span className="ml-2 text-[11px] text-[#6B6B85] uppercase tracking-wide">
                  {o.category === "lakare" ? "Läkare" : "Sjuksköterska"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="submit"
        className="h-11 px-5 bg-[#1a1545] hover:bg-[#0d0b2a] text-white text-[14px] font-semibold rounded-lg whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors"
      >
        Visa min analys <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
