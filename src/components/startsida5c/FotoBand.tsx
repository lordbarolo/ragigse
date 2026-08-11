
import sskFoto from "@/assets/startsida5c-ssk.png";

const TOOLS: { name: string; desc: string }[] = [
  { name: "Löneanalys", desc: "Se ramavtalspriset för din roll och kommun och vad du kan fakturera." },
  { name: "Pensionssimulator", desc: "Jämför långsiktig effekt av anställning och eget bolag." },
  { name: "Avtalsassistent", desc: "Ai-stöd som går igenom uppdragsavtal och villkor." },
  { name: "CV-assistenten", desc: "Bygger om ditt CV enligt best practice och fyller luckorna." },
];

export default function FotoBand() {
  return (
    <section style={{ background: "#0b0c10", borderBottom: "1px solid #22232b" }}>
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
          <div
            className="text-[11.5px] font-semibold uppercase"
            style={{ color: "#8a8c94", letterSpacing: "0.12em" }}
          >
            Innanför inloggningen
          </div>
          <h2
            className="mt-3 text-[24px] font-semibold md:text-[30px]"
            style={{ color: "#ffffff", letterSpacing: "-0.015em", lineHeight: 1.15 }}
          >
            Verktygen din Ai-assistent använder när du är inloggad.
          </h2>
          <p className="mt-3 max-w-[480px] text-[16px]" style={{ color: "#b8bac2", lineHeight: 1.6 }}>
            Skapa ett konto, svara på fyra frågor i chatten och assistenten låser upp verktygen — allt
            byggt på offentlig data om regionernas ramavtal.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="p-4"
                style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 12 }}
              >
                <div className="text-[15px] font-semibold" style={{ color: "#ffffff" }}>
                  {t.name}
                </div>
                <div className="mt-1.5 text-[14px]" style={{ color: "#b8bac2", lineHeight: 1.55 }}>
                  {t.desc}
                </div>
              </div>
            ))}
          </div>


        </div>
      </div>
    </section>
  );
}
