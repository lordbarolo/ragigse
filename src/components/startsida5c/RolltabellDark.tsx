import { Link } from "@/lib/router-compat";
import { computeRate5c, ZONES_5C, kr } from "./rate5c";
import { useBaseRates5c } from "./useRates5c";

const ROWS: { label: string; yrkeskategori: string }[] = [
  { label: "Anestesiläkare", yrkeskategori: "Specialistläkare anestesi och intensivvård" },
  { label: "Psykiater", yrkeskategori: "Specialistläkare psykiatri" },
  { label: "Geriatriker", yrkeskategori: "Specialistläkare geriatrik" },
  { label: "Legitimerad läkare", yrkeskategori: "Legitimerad läkare" },
  { label: "IVA-sjuksköterska", yrkeskategori: "Specialistsjuksköterska intensivvård" },
  { label: "Leg. sjuksköterska", yrkeskategori: "Sjuksköterska" },
];

// Sektionen är mörk hela vägen; fadet till ljust sker först efter innehållet
// (nedre kanten av sektionen), så alla rader har mörk-tema-färger.
const ROW_THEME = [
  { label: "#eef0f4", value: "#a3a7b7", accent: "#7c7ff2", border: "#22242e" },
  { label: "#eef0f4", value: "#a3a7b7", accent: "#7c7ff2", border: "#22242e" },
  { label: "#eef0f4", value: "#a3a7b7", accent: "#7c7ff2", border: "#22242e" },
  { label: "#eef0f4", value: "#a3a7b7", accent: "#7c7ff2", border: "#22242e" },
  { label: "#eef0f4", value: "#a3a7b7", accent: "#7c7ff2", border: "#22242e" },
  { label: "#eef0f4", value: "#a3a7b7", accent: "#7c7ff2", border: "#22242e" },
];

export default function RolltabellDark() {
  const base = useBaseRates5c();

  return (
    <section
      style={{
        background: "#0e1016",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-12 md:py-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-[22px] font-semibold md:text-[26px]" style={{ color: "#eef0f4", letterSpacing: "-0.01em" }}>
            Mest sökta rollerna, alla zoner
          </h2>
          <span className="text-[12px]" style={{ color: "#8c90a0" }}>
            kr/h som företagare
          </span>
        </div>

        {base.length === 0 ? (
          <p className="text-[13px]" style={{ color: "#8c90a0" }}>
            Prisdata kunde inte hämtas just nu.
          </p>
        ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr>
                {["Roll", ...ZONES_5C.map((z) => z.column)].map((h, i) => (
                  <th
                    key={h}
                    className="pb-3 text-[11px] font-medium uppercase tracking-[0.1em]"
                    style={{
                      color: "#666b7e",
                      borderBottom: "1px solid #22242e",
                      textAlign: i === 0 ? "left" : "right",
                      fontFamily: "'IBM Plex Mono',monospace",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, rowIndex) => {
                const t = ROW_THEME[rowIndex] ?? ROW_THEME[ROW_THEME.length - 1];
                const values = ZONES_5C.map((z) => computeRate5c(base, r.yrkeskategori, z.value));
                const max = Math.max(...values.map((v) => v?.foretagareKrH ?? -1));
                return (
                  <tr key={r.yrkeskategori}>
                    <td className="py-3.5 text-[14px]" style={{ color: t.label, borderBottom: `1px solid ${t.border}` }}>
                      {r.label}
                    </td>
                    {values.map((v, i) => {
                      const isMax = v != null && v.foretagareKrH === max;
                      return (
                        <td
                          key={ZONES_5C[i].value}
                          className="py-3.5 text-right text-[14px] tabular-nums"
                          style={{
                            color: isMax ? t.accent : t.value,
                            fontWeight: isMax ? 600 : 400,
                            borderBottom: `1px solid ${t.border}`,
                          }}
                        >
                          {kr(v?.foretagareKrH)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12px]" style={{ color: "#6b7080" }}>
          <span>Högst ersättning markerad. Fullständig lista med alla roller efter inloggning.</span>
          <Link to="/faktasidor" style={{ color: "#4f46e5" }} className="hover:underline">
            Jämför alla roller →
          </Link>
        </div>
      </div>

      {/* Övergång mörkt → ljust, efter sektionens innehåll */}
      <div
        aria-hidden
        className="h-24 w-full md:h-32"
        style={{
          background:
            "linear-gradient(180deg,#0e1016 0%,#191d2d 18%,#343950 34%,#6b7083 52%,#a7aab5 68%,#d8d9df 82%,#f5f5f7 100%)",
        }}
      />
    </section>
  );
}
