import { Link } from "react-router-dom";
import { basePrices, computeRate5c, ZONES_5C, kr, type RateRow } from "./rate5c";

interface Props {
  rows: RateRow[];
  isLoading: boolean;
}

const ROWS: { label: string; yrkeskategori: string }[] = [
  { label: "Anestesiläkare", yrkeskategori: "Specialistläkare anestesi och intensivvård" },
  { label: "Psykiater", yrkeskategori: "Specialistläkare psykiatri" },
  { label: "Geriatriker", yrkeskategori: "Specialistläkare geriatrik" },
  { label: "Legitimerad läkare", yrkeskategori: "Legitimerad läkare" },
  { label: "IVA-sjuksköterska", yrkeskategori: "Specialistsjuksköterska intensivvård" },
  { label: "Leg. sjuksköterska", yrkeskategori: "Sjuksköterska" },
];

export default function RolltabellDark({ rows, isLoading }: Props) {
  const base = basePrices(rows);

  return (
    <section style={{ background: "#0e1016", borderBottom: "1px solid #22242e" }}>
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-12 md:py-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-[22px] font-semibold md:text-[26px]" style={{ color: "#eef0f4", letterSpacing: "-0.01em" }}>
            Mest sökta rollerna, alla zoner
          </h2>
          <span className="text-[12px]" style={{ color: "#8c90a0" }}>
            kr/h som företagare · efter marginal
          </span>
        </div>

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
              {ROWS.map((r) => {
                const values = ZONES_5C.map((z) => computeRate5c(base, r.yrkeskategori, z.value));
                const max = Math.max(...values.map((v) => v?.foretagareKrH ?? -1));
                return (
                  <tr key={r.yrkeskategori}>
                    <td className="py-3.5 text-[14px]" style={{ color: "#eef0f4", borderBottom: "1px solid #22242e" }}>
                      {r.label}
                    </td>
                    {values.map((v, i) => {
                      const isMax = v != null && v.foretagareKrH === max;
                      return (
                        <td
                          key={ZONES_5C[i].value}
                          className="py-3.5 text-right text-[14px] tabular-nums"
                          style={{
                            color: isMax ? "#7c7ff2" : "#a3a7b7",
                            fontWeight: isMax ? 600 : 400,
                            borderBottom: "1px solid #22242e",
                          }}
                        >
                          {isLoading ? (
                            <span className="ml-auto inline-block h-4 w-14 animate-pulse rounded" style={{ background: "#1c2030" }} />
                          ) : (
                            kr(v?.foretagareKrH)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12px]" style={{ color: "#666b7e" }}>
          <span>Högst ersättning markerad. Fullständig lista med alla roller efter inloggning.</span>
          <Link to="/faktasidor" style={{ color: "#8b8bf6" }} className="hover:underline">
            Jämför alla roller →
          </Link>
        </div>
      </div>
    </section>
  );
}
