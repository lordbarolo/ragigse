import { useMemo, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import {
  computeRate5c,
  roleOptions5c,
  DEFAULT_ROLE_5C,
  DEFAULT_ZONE_5C,
  kr,
} from "./rate5c";
import { useBaseRates5c } from "./useRates5c";
import { roleLabel5c } from "./roleLabels5c";
import { useLocations } from "@/hooks/useCalculator";

const DEFAULT_PLACE = "Torsby";

export default function Rateraknare() {
  const base = useBaseRates5c();
  const { data: locations } = useLocations();
  const [role, setRole] = useState(DEFAULT_ROLE_5C);
  const [place, setPlace] = useState(DEFAULT_PLACE);

  const options = useMemo(
    () =>
      roleOptions5c(base)
        .map((r) => ({ value: r, label: roleLabel5c(r) }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [base]
  );

  /** Sveriges kommuner — sökbara på både kommun- och regionnamn. */
  const placeOptions = useMemo(
    () =>
      (locations ?? [])
        .map((l) => ({
          value: l.kommun as string,
          label: l.kommun as string,
          group: (l.region as string) ?? "",
          keywords: [l.region as string].filter(Boolean),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [locations]
  );

  const selected = useMemo(
    () => (locations ?? []).find((l) => l.kommun === place),
    [locations, place]
  );
  const zone = (selected?.zon as string) ?? DEFAULT_ZONE_5C;


  const rate = useMemo(() => computeRate5c(base, role, zone), [base, role, zone]);

  return (
    <div
      className="rounded-2xl p-6 md:p-7"
      style={{
        background: "#16171f",
        border: "1px solid #2a2b36",
        borderRadius: 16,
        animation: "fadeUp5c .55s .24s ease both",
      }}
    >
      <h2 className="hidden md:block mb-1 text-[18px] font-semibold" style={{ color: "#ffffff", letterSpacing: "-0.01em" }}>
        AI-INDIKATOR FÖR KONSULTERSÄTTNING
      </h2>
      <p className="hidden md:block mb-5 text-[15px]" style={{ color: "#a1a3ab", lineHeight: 1.5 }}>
        Välj roll och ort för att se marknadsmässig ersättning
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-2 block text-[13px] font-medium uppercase tracking-[0.08em]"
            style={{ color: "#c4c6ce", fontFamily: "'IBM Plex Mono',monospace" }}
          >
            Roll
          </label>
          <SearchableSelect
            options={options}
            value={role}
            onValueChange={setRole}
            placeholder="Välj roll"
            triggerClassName="h-12 rounded-[10px] border-[#2a2b36] bg-[#0b0c10] text-[#ffffff] shadow-none text-[15px]"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-[13px] font-medium uppercase tracking-[0.08em]"
            style={{ color: "#c4c6ce", fontFamily: "'IBM Plex Mono',monospace" }}
          >
            Ort
          </label>
          <SearchableSelect
            options={placeOptions}
            value={place}
            onValueChange={setPlace}
            placeholder="Sök kommun eller region"
            triggerClassName="h-12 rounded-[10px] border-[#2a2b36] bg-[#0b0c10] text-[#ffffff] shadow-none text-[15px]"
          />
        </div>
      </div>


      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-xl p-4"
          style={{
            background: "#0b0c10",
            border: "1px solid #2a2b36",
            borderRadius: 12,
          }}
        >
          <div className="text-[13px] font-medium uppercase tracking-[0.06em]" style={{ color: "#c4c6ce" }}>
            Som företagare
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5" style={{ color: "#fff" }}>
            <span className="text-[34px] font-semibold leading-none">{kr(rate?.foretagareKrH)}</span>
            <span className="text-[14px]">kr/timme</span>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "#0b0c10", border: "1px solid #2a2b36", borderRadius: 12 }}>
          <div className="text-[13px] font-medium uppercase tracking-[0.06em]" style={{ color: "#c4c6ce" }}>
            Som löntagare
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5" style={{ color: "#ffffff" }}>
            <span className="text-[34px] font-semibold leading-none">{kr(rate?.lontagareKrH)}</span>
            <span className="text-[14px]">kr/timme</span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[14px] leading-relaxed" style={{ color: "#a1a3ab" }}>
        {base.length === 0
          ? "Prisdata kunde inte hämtas just nu."
          : rate
            ? (<>
                {`Regionens pris ${kr(rate.timpris_kund)} kr/timme i ${place}${selected?.region ? ` (${selected.region})` : ""}. Källa: `}
                <a href="https://www.vgregion.se/ov/hyrpersonal/avtal-och-dokument/" target="_blank" rel="noopener noreferrer" style={{ color: "#a1a3ab", textDecoration: "underline" }}>SKR:s ramavtal 2026</a>.
              </>)
            : "Pris saknas för denna kombination — kontakta oss."}
      </p>
    </div>
  );
}
