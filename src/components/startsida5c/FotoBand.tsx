
import sskFoto from "@/assets/startsida5c-ssk.png";

const TOOLS: { name: string; desc: string }[] = [
  { name: "Löneanalys", desc: "Se ramavtalspriset för din roll och kommun och vad du kan fakturera." },
  { name: "Pensionssimulator", desc: "Jämför långsiktig effekt av anställning och eget bolag." },
  { name: "Avtalsassistent", desc: "Ai-stöd som går igenom uppdragsavtal och villkor." },
  { name: "CV-assistenten", desc: "Skapar ett CV från grunden eller optimerar ett befintligt." },
];

export default function FotoBand() {
  return (
    <section style={{ background: "#f5f5f7", borderBottom: "1px solid #e3e3e8" }}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-14 pt-8 md:px-12 md:pb-16 md:pt-10 lg:grid-cols-2 lg:gap-14">
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
            style={{ color: "#6b6b6b", letterSpacing: "0.12em" }}
          >
            Innanför inloggningen
          </div>
          <h2
            className="mt-3 text-[24px] font-semibold md:text-[30px]"
            style={{ color: "#1a1b22", letterSpacing: "-0.015em", lineHeight: 1.15 }}
          >
            Verktygen din Ai-assistent använder när du är inloggad.
          </h2>
          <p className="mt-3 max-w-[480px] text-[16px]" style={{ color: "#4a4b52", lineHeight: 1.6 }}>
            Skapa ett konto, svara på fyra frågor i chatten och assistenten låser upp verktygen — allt
            byggt på offentlig data om regionernas ramavtal.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="p-4"
                style={{ background: "#ffffff", border: "1px solid #e3e3e8", borderRadius: 12 }}
              >
                <div className="text-[15px] font-semibold" style={{ color: "#1a1b22" }}>
                  {t.name}
                </div>
                <div className="mt-1.5 text-[14px]" style={{ color: "#5a5b62", lineHeight: 1.55 }}>
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
