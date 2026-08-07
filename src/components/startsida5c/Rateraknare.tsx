import { useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import SearchableSelect from "@/components/SearchableSelect";
import {
  computeRate5c,
  roleOptions5c,
  ZONES_5C,
  DEFAULT_ROLE_5C,
  DEFAULT_ZONE_5C,
  kr,
} from "./rate5c";
import { useBaseRates5c } from "./useRates5c";
import { roleLabel5c } from "./roleLabels5c";


export default function Rateraknare() {
  const base = useBaseRates5c();
  const navigate = useNavigate();
  const [role, setRole] = useState(DEFAULT_ROLE_5C);
  const [zone, setZone] = useState(DEFAULT_ZONE_5C);

  const options = useMemo(
    () =>
      roleOptions5c(base)
        .map((r) => ({ value: r, label: roleLabel5c(r) }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [base]
  );

  const rate = useMemo(() => computeRate5c(base, role, zone), [base, role, zone]);

  return (
    <div
      className="rounded-2xl p-6 md:p-7"
      style={{
        background: "#121319",
        border: "1px solid #22232b",
        borderRadius: 16,
        animation: "fadeUp5c .55s .24s ease both",
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "#8a8c94", fontFamily: "'IBM Plex Mono',monospace" }}
          >
            Roll
          </label>
          <SearchableSelect
            options={options}
            value={role}
            onValueChange={setRole}
            placeholder="Välj roll"
            triggerClassName="h-12 rounded-[10px] border-[#22232b] bg-[#0b0c10] text-[#ffffff] shadow-none"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "#8a8c94", fontFamily: "'IBM Plex Mono',monospace" }}
          >
            Zon
          </label>
          <div className="flex h-12 items-center rounded-[10px]" style={{ background: "#0b0c10", border: "1px solid #22232b" }}>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              aria-label="Zon"
              className="h-full w-full bg-transparent px-3 text-[14.5px] outline-hidden"
              style={{ color: "#ffffff" }}
            >
              {ZONES_5C.map((z) => (
                <option key={z.value} value={z.value} style={{ color: "#121319" }}>
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
            background: "#121319",
            border: "1px solid #22232b",
            borderRadius: 12,
          }}
        >
          <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,.82)" }}>
            Som företagare
          </div>
          <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#fff" }}>
            <span className="text-[32px] font-semibold leading-none">{kr(rate?.foretagareKrH)}</span>
            <span className="text-[13px]">kr/h</span>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "#0b0c10", border: "1px solid #22232b", borderRadius: 12 }}>
          <div className="text-[11.5px] uppercase tracking-[0.1em]" style={{ color: "#8a8c94" }}>
            Som löntagare
          </div>
          <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#ffffff" }}>
            <span className="text-[32px] font-semibold leading-none">{kr(rate?.lontagareKrH)}</span>
            <span className="text-[13px]">kr/h</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "#6f7178" }}>
        {base.length === 0
          ? "Prisdata kunde inte hämtas just nu."
          : rate
            ? `Kundpris ${kr(rate.timpris_kund)} kr/h. Källa: SKR:s ramavtal 2026.`
            : "Pris saknas för denna kombination — kontakta oss."}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/registrera");
        }}
        className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2"
        style={{ background: "#0b0c10", border: "1px solid #22232b", borderRadius: 12 }}
      >
        <input
          name="q"
          placeholder="Fråga assistenten om detaljerna…"
          className="h-9 flex-1 bg-transparent text-[14px] outline-hidden"
          style={{ color: "#ffffff" }}
          onFocus={() => navigate("/registrera")}
        />
        <span aria-hidden className="inline-block h-[15px] w-[1.5px] caret5c" style={{ background: "#e8e9ec" }} />
        <button
          type="submit"
          aria-label="Gå till assistenten"
          className="grid h-9 w-9 place-items-center rounded-[10px] text-[16px]"
          style={{ background: "#ffffff", color: "#121319" }}
        >
          ↑
        </button>
      </form>
    </div>
  );
}
