import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "@/components/SearchableSelect";
import {
  basePrices,
  computeRate5c,
  roleOptions5c,
  ZONES_5C,
  DEFAULT_ROLE_5C,
  DEFAULT_ZONE_5C,
  kr,
  type RateRow,
} from "./rate5c";

interface Props {
  rows: RateRow[];
  isLoading: boolean;
}

export default function Rateraknare({ rows, isLoading }: Props) {
  const navigate = useNavigate();
  const [role, setRole] = useState(DEFAULT_ROLE_5C);
  const [zone, setZone] = useState(DEFAULT_ZONE_5C);

  const base = useMemo(() => basePrices(rows), [rows]);
  const options = useMemo(
    () => roleOptions5c(base).map((r) => ({ value: r, label: r })),
    [base]
  );
  const rate = useMemo(() => computeRate5c(base, role, zone), [base, role, zone]);

  const skeleton = isLoading;

  return (
    <div
      className="rounded-2xl p-6 md:p-7"
      style={{
        background: "#151823",
        border: "1px solid #262a38",
        borderRadius: 16,
        animation: "fadeUp5c .55s .24s ease both",
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "#8c90a0", fontFamily: "'IBM Plex Mono',monospace" }}
          >
            Roll
          </label>
          {skeleton ? (
            <div className="h-12 animate-pulse rounded-[10px]" style={{ background: "#1c2030" }} />
          ) : (
            <SearchableSelect
              options={options}
              value={role}
              onValueChange={setRole}
              placeholder="Välj roll"
              triggerClassName="h-12 rounded-[10px] border-[#2c3142] bg-[#0e1016] text-[#eef0f4] shadow-none"
            />
          )}
        </div>

        <div>
          <label
            className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "#8c90a0", fontFamily: "'IBM Plex Mono',monospace" }}
          >
            Zon
          </label>
          <div className="flex h-12 items-center rounded-[10px]" style={{ background: "#0e1016", border: "1px solid #2c3142" }}>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              aria-label="Zon"
              className="h-full w-full bg-transparent px-3 text-[14.5px] outline-hidden"
              style={{ color: "#eef0f4" }}
            >
              {ZONES_5C.map((z) => (
                <option key={z.value} value={z.value} style={{ color: "#191922" }}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)",
            borderRadius: 12,
          }}
        >
          <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,.82)" }}>
            Som företagare
          </div>
          <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#fff" }}>
            {skeleton ? (
              <span className="inline-block h-8 w-24 animate-pulse rounded" style={{ background: "rgba(255,255,255,.25)" }} />
            ) : (
              <>
                <span className="text-[32px] font-semibold leading-none">{kr(rate?.foretagareKrH)}</span>
                <span className="text-[13px]">kr/h</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "#0e1016", border: "1px solid #262a38", borderRadius: 12 }}>
          <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "#8c90a0" }}>
            Som löntagare
          </div>
          <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#eef0f4" }}>
            {skeleton ? (
              <span className="inline-block h-8 w-24 animate-pulse rounded" style={{ background: "#1c2030" }} />
            ) : (
              <>
                <span className="text-[32px] font-semibold leading-none">{kr(rate?.lontagareKrH)}</span>
                <span className="text-[13px]">kr/h</span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "#666b7e" }}>
        {skeleton || !rate
          ? "Hämtar priser från SKR:s ramavtal 2026…"
          : `Kundpris ${kr(rate.timpris_kund)} kr/h − ${rate.margin_text} marginal. Källa: SKR:s ramavtal 2026.`}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (new FormData(e.currentTarget).get("q") as string) || "";
          if (q.trim()) navigate(`/consultant/forhandla?q=${encodeURIComponent(q.trim())}`);
        }}
        className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2"
        style={{ background: "#0e1016", border: "1px solid #262a38", borderRadius: 12 }}
      >
        <input
          name="q"
          placeholder="Fråga assistenten om detaljerna…"
          className="h-9 flex-1 bg-transparent text-[14px] outline-hidden"
          style={{ color: "#eef0f4" }}
        />
        <span aria-hidden className="inline-block h-[15px] w-[1.5px] caret5c" style={{ background: "#8b8bf6" }} />
        <button
          type="submit"
          aria-label="Skicka fråga till assistenten"
          className="grid h-9 w-9 place-items-center rounded-[10px] text-[16px]"
          style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", color: "#fff" }}
        >
          ↑
        </button>
      </form>
    </div>
  );
}
