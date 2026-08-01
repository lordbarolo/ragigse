import { useEffect } from "react";
import { SEO } from "@/components/SEO";

/**
 * Dev31 — pixelnära React-version av designförslag "1b" (Räknaren först).
 * Isolerad testyta på /dev_31. Ingen befintlig sida påverkas.
 */

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const mono = "'IBM Plex Mono',monospace";

type Row = { role: string; z1: string; z2: string; z3: string };

const ROWS: Row[] = [
  { role: "Anestesiläkare", z1: "1 210", z2: "1 330", z3: "1 480" },
  { role: "Akutläkare", z1: "1 090", z2: "1 195", z3: "1 340" },
  { role: "Geriatriker", z1: "1 280", z2: "1 415", z3: "1 575" },
  { role: "IVA-sjuksköterska", z1: "620", z2: "685", z3: "760" },
  { role: "Operations-ssk", z1: "640", z2: "700", z3: "730" },
  { role: "Leg. sjuksköterska", z1: "510", z2: "550", z3: "600" },
];

export default function Dev31() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const gridCols = "2fr 1fr 1fr 1fr";

  return (
    <div style={{ background: "#0e1016", minHeight: "100vh", padding: "24px 0" }}>
      <SEO title="CompCare designförslag 1b (dev)" description="Intern testyta för designförslag 1b." path="/dev_31" noindex />

      <div
        style={{
          width: 1240,
          maxWidth: "100%",
          margin: "0 auto",
          background: "#0e1016",
          fontFamily: "'Space Grotesk',sans-serif",
          color: "#eef0f4",
          overflowX: "auto",
        }}
      >
        {/* Nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 48px",
            borderBottom: "1px solid #22242e",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ font: `600 17px/1 ${mono}`, letterSpacing: "-0.5px" }}>compcare</div>
            <div style={{ display: "flex", gap: 24, fontSize: 13.5, color: "#8c90a0" }}>
              <span>Ersättningar</span>
              <span>Avrop</span>
              <span>Assistenten</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13.5, color: "#8c90a0" }}>Logga in</span>
            <span
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                background: "#5b5bf0",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              Skapa konto
            </span>
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr .95fr",
            gap: 56,
            padding: "72px 48px 64px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                font: `500 12px ${mono}`,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#7c7ff2",
                marginBottom: 20,
              }}
            >
              SKR ramavtal 2026 · Offentliga priser
            </div>
            <h1
              style={{
                font: "600 52px/1.06 'Space Grotesk',sans-serif",
                letterSpacing: "-0.02em",
                margin: "0 0 20px",
              }}
            >
              Se din timpeng innan du ringer bemannings&shy;bolaget.
            </h1>
            <p
              style={{
                fontSize: 16.5,
                lineHeight: 1.6,
                color: "#a3a7b7",
                margin: "0 0 32px",
                maxWidth: 480,
                textWrap: "pretty" as never,
              }}
            >
              Kundpris minus typisk marginal — 12 % för läkare, 17 % för sjuksköterskor. Samma siffror som regionen
              ser, per roll och zon.
            </p>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#8c90a0" }}>
              {["Inga uppgifter krävs", "Data inom EU", "Uppdateras vid nya avrop"].map((t) => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#4ade80" }}>✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Räknare-kort */}
          <div
            style={{
              background: "#151823",
              border: "1px solid #262a38",
              borderRadius: 16,
              padding: "26px 26px 22px",
              boxShadow: "0 24px 60px rgba(0,0,0,.45)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: "#8c90a0", marginBottom: 16 }}>Vad får du?</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ background: "#0e1016", border: "1px solid #262a38", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#666b7e", marginBottom: 4 }}>Roll</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5, fontWeight: 500 }}>
                  IVA-sjuksköterska <span style={{ color: "#666b7e" }}>▾</span>
                </div>
              </div>
              <div style={{ background: "#0e1016", border: "1px solid #262a38", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "#666b7e", marginBottom: 4 }}>Zon</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5, fontWeight: 500 }}>
                  Zon 2 · Mellannorrland <span style={{ color: "#666b7e" }}>▾</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  background: "linear-gradient(160deg,#20244d,#161a33)",
                  border: "1px solid #3a3f8a",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 11.5, color: "#9da0e8", marginBottom: 6 }}>Som företagare</div>
                <div style={{ font: "600 30px/1 'Space Grotesk',sans-serif" }}>
                  685 <span style={{ fontSize: 14, fontWeight: 400, color: "#9da0e8" }}>kr/h</span>
                </div>
              </div>
              <div style={{ background: "#0e1016", border: "1px solid #262a38", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11.5, color: "#8c90a0", marginBottom: 6 }}>Som löntagare</div>
                <div style={{ font: "600 30px/1 'Space Grotesk',sans-serif" }}>
                  495 <span style={{ fontSize: 14, fontWeight: 400, color: "#8c90a0" }}>kr/h</span>
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#666b7e",
                lineHeight: 1.5,
                borderTop: "1px solid #22242e",
                paddingTop: 12,
              }}
            >
              Kundpris 825 kr/h − 17 % marginal. Källa: SKR:s ramavtal 2026, publicerade avrop.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0e1016",
                border: "1px solid #262a38",
                borderRadius: 10,
                padding: "10px 10px 10px 14px",
              }}
            >
              <span style={{ flex: 1, fontSize: 13.5, color: "#666b7e" }}>Fråga assistenten om detaljerna…</span>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#5b5bf0",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 15,
                }}
              >
                ↑
              </span>
            </div>
          </div>
        </div>

        {/* Tabell */}
        <div style={{ padding: "0 48px 56px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div style={{ fontSize: 19, fontWeight: 600 }}>Mest sökta rollerna, alla zoner</div>
            <div style={{ font: `400 12px ${mono}`, color: "#666b7e" }}>kr/h som företagare · efter marginal</div>
          </div>

          <div style={{ border: "1px solid #262a38", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                padding: "12px 20px",
                background: "#151823",
                fontSize: 11.5,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#666b7e",
              }}
            >
              <span>Roll</span>
              <span style={{ textAlign: "right" }}>Zon 1 Storstad</span>
              <span style={{ textAlign: "right" }}>Zon 2 Mellannorrl.</span>
              <span style={{ textAlign: "right" }}>Zon 3 Glesbygd</span>
            </div>

            {ROWS.map((r, i) => (
              <div
                key={r.role}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  padding: "14px 20px",
                  borderTop: "1px solid #1c1f2a",
                  fontSize: 14.5,
                  background: i % 2 === 1 ? "#12141d" : undefined,
                }}
              >
                <span>{r.role}</span>
                <span style={{ textAlign: "right", fontFamily: mono }}>{r.z1}</span>
                <span style={{ textAlign: "right", fontFamily: mono }}>{r.z2}</span>
                <span style={{ textAlign: "right", fontFamily: mono, color: "#7c7ff2" }}>{r.z3}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 13, color: "#666b7e" }}>
            <span>Högst ersättning markerad. Fullständig lista med 15 roller efter inloggning.</span>
            <a href="#" style={{ color: "#9da0e8", fontWeight: 500 }}>
              Jämför alla roller →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "18px 48px",
            fontSize: 12,
            color: "#666b7e",
            borderTop: "1px solid #22242e",
          }}
        >
          <span>© 2026 CompCare · Data lagras inom EU · Vi delar aldrig dina uppgifter</span>
          <span>Integritetspolicy</span>
        </div>
      </div>
    </div>
  );
}
