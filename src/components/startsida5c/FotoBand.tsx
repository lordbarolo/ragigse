import sskFoto from "@/assets/startsida5c-ssk.png";
import { computeRate5c, kr } from "./rate5c";
import { useBaseRates5c } from "./useRates5c";

const CARDS: { label: string; yrkeskategori: string; zon: string }[] = [
  { label: "IVA-sjuksköterska", yrkeskategori: "Specialistsjuksköterska intensivvård", zon: "Zon 3" },
  { label: "Operationssjuksköterska", yrkeskategori: "Specialistsjuksköterska operationssjukvård", zon: "Zon 3" },
  { label: "Leg. sjuksköterska", yrkeskategori: "Sjuksköterska", zon: "Zon 2" },
  { label: "Anestesiläkare", yrkeskategori: "Specialistläkare anestesi och intensivvård", zon: "Zon 2" },
];

export default function FotoBand() {
  const base = useBaseRates5c();

  return (
    <section style={{ background: "#f5f5f7", borderBottom: "1px solid #e6e6ea" }}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:px-12 md:py-16 lg:grid-cols-2 lg:gap-14">
        <div className="overflow-hidden" style={{ borderRadius: 16 }}>
          <img
            src={sskFoto}
            alt="Sjuksköterska i vårdmiljö"
            loading="lazy"
            className="h-[300px] w-full object-cover md:h-[420px]"
            style={{ borderRadius: 16 }}
          />
        </div>

        <div>
          <h2
            className="m-0 text-[24px] font-semibold md:text-[30px]"
            style={{ color: "#191922", letterSpacing: "-0.015em", lineHeight: 1.15 }}
          >
            Samma siffror som bolaget sitter på
          </h2>
          <p className="mt-3 max-w-[460px] text-[15px]" style={{ color: "#5a5f6e", lineHeight: 1.6 }}>
            Priserna kommer från SKR:s ramavtal 2026 — offentliga och lika för alla. Här är din del av kundpriset
            som företagare, per roll och zon.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {CARDS.map((c) => {
              const rate = computeRate5c(base, c.yrkeskategori, c.zon);
              return (
                <div
                  key={`${c.yrkeskategori}-${c.zon}`}
                  className="p-4"
                  style={{ background: "#fff", border: "1px solid #e6e6ea", borderRadius: 12 }}
                >
                  <div className="text-[12.5px]" style={{ color: "#5a5f6e" }}>
                    {c.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5" style={{ color: "#191922" }}>
                    <span className="text-[26px] font-semibold leading-none tabular-nums">
                      {kr(rate?.foretagareKrH)}
                    </span>
                    <span className="text-[12.5px]">kr/h</span>
                  </div>
                  <div className="mt-1 text-[11.5px]" style={{ color: "#8a8f9e" }}>
                    {c.zon} · kundpris {kr(rate?.timpris_kund)} kr/h
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
