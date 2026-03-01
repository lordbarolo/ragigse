import { useState } from "react";
import { Lock, TrendingDown, TrendingUp, ChevronDown, Gift, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Theme definitions ─── */
interface ThemeTokens {
  name: string;
  description: string;
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  danger: string;
  dangerBg: string;
  shadow: string;
  radius: string;
  font: string;
}

const themes: ThemeTokens[] = [
  {
    name: "Stripe Clean",
    description: "Nuvarande — professionellt, skarpt, trovärdigt",
    bg: "#F6F9FC",
    card: "#FFFFFF",
    cardBorder: "#E3E8EF",
    text: "#0A2540",
    textMuted: "#546679",
    primary: "#635BFF",
    primaryFg: "#FFFFFF",
    accent: "#635BFF",
    accentFg: "#FFFFFF",
    danger: "#DF1B41",
    dangerBg: "#FFF0F3",
    shadow: "0 2px 8px rgba(0,0,0,0.06)",
    radius: "12px",
    font: "'Inter', system-ui, sans-serif",
  },
  {
    name: "Warm Trust",
    description: "Mjukt, tryggt — sand & skogsgrön, vårdkänsla",
    bg: "#FAF8F5",
    card: "#FFFFFF",
    cardBorder: "#E8E0D4",
    text: "#1B3A2D",
    textMuted: "#6B7C72",
    primary: "#2D6A4F",
    primaryFg: "#FFFFFF",
    accent: "#D4A373",
    accentFg: "#1B3A2D",
    danger: "#C1440E",
    dangerBg: "#FFF3EC",
    shadow: "0 2px 12px rgba(45,106,79,0.08)",
    radius: "16px",
    font: "'Inter', Georgia, serif",
  },
  {
    name: "Bold Nordic",
    description: "Premium, mörkt mode — djupblå, teal, stark kontrast",
    bg: "#0B1120",
    card: "#131B2E",
    cardBorder: "#1E2A45",
    text: "#E8EDF5",
    textMuted: "#8B9AB8",
    primary: "#38BDF8",
    primaryFg: "#0B1120",
    accent: "#2DD4BF",
    accentFg: "#0B1120",
    danger: "#FB7185",
    dangerBg: "rgba(251,113,133,0.12)",
    shadow: "0 4px 20px rgba(0,0,0,0.3)",
    radius: "14px",
    font: "'Inter', system-ui, sans-serif",
  },
];

/* ─── Mock result card ─── */
function MockResultCard({ t }: { t: ThemeTokens }) {
  return (
    <div style={{ fontFamily: t.font }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase" }}>
          CompCare · Löneanalys
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: "8px 0 4px" }}>
          Din löneanalys är klar
        </h2>
        <p style={{ fontSize: 13, color: t.textMuted }}>
          Vi har jämfört din ersättning med ramavtalspriserna i Stockholm
        </p>
      </div>

      {/* Occupation pill */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: t.radius,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          boxShadow: t.shadow,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Specialistläkare</span>
        <span style={{ fontSize: 13, color: t.textMuted }}>📍 Stockholm</span>
      </div>

      {/* Warning card */}
      <div
        style={{
          background: t.dangerBg,
          border: `1px solid ${t.danger}22`,
          borderRadius: t.radius,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <TrendingDown size={18} color={t.danger} />
          <span style={{ fontSize: 15, fontWeight: 700, color: t.danger }}>
            Du ligger 26% under marknaden
          </span>
        </div>
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
          Baserat på offentliga ramavtalspriser i din zon
        </p>

        {/* Locked overlay */}
        <div
          style={{
            marginTop: 12,
            background: `linear-gradient(135deg, ${t.card}88, ${t.card}CC)`,
            backdropFilter: "blur(4px)",
            borderRadius: "8px",
            padding: "20px 16px",
            textAlign: "center",
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <Lock size={20} color={t.primary} style={{ marginBottom: 6 }} />
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
            Se exakt hur mycket du förlorar
          </p>
        </div>
      </div>

      {/* Verdict card */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: t.radius,
          padding: 16,
          marginBottom: 12,
          boxShadow: t.shadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <TrendingUp size={16} color={t.primary} />
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
            Du är sannolikt underbetald
          </span>
        </div>

        {/* Bars */}
        {[
          { label: "Din nuvarande lön", value: "800 kr/h", width: "55%" },
          { label: "Vad regionen betalar bemanningsföretag", value: "███", width: "80%", blur: true },
          { label: "Rekommenderad lön", value: "███", width: "70%", blur: true },
        ].map((bar, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: t.textMuted }}>{bar.label}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: bar.blur ? t.textMuted : t.text,
                  filter: bar.blur ? "blur(5px)" : "none",
                }}
              >
                {bar.value}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: `${t.primary}22`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: bar.width,
                  height: "100%",
                  borderRadius: 4,
                  background: bar.blur
                    ? `linear-gradient(90deg, ${t.primary}66, ${t.primary}33)`
                    : t.primary,
                  filter: bar.blur ? "blur(3px)" : "none",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        style={{
          width: "100%",
          padding: "14px 0",
          background: t.primary,
          color: t.primaryFg,
          border: "none",
          borderRadius: t.radius,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 8,
          boxShadow: `0 4px 14px ${t.primary}44`,
        }}
      >
        Se din fulla löneanalys — 49 kr →
      </button>
      <p style={{ fontSize: 11, color: t.textMuted, textAlign: "center" }}>
        Engångsbetalning · Ingen bindningstid
      </p>

      {/* Referral teaser */}
      <div
        style={{
          marginTop: 12,
          background: `${t.accent}11`,
          border: `1px solid ${t.accent}33`,
          borderRadius: t.radius,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Gift size={18} color={t.accent} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
            Gratis — tipsa en kollega
          </span>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "2px 0 0" }}>
            Lås upp hela rapporten utan kostnad
          </p>
        </div>
        <Send size={14} color={t.accent} />
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ThemePreview() {
  const [selected, setSelected] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F5", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E3E8EF",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#546679",
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} />
          Tillbaka
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0A2540", margin: 0 }}>
            Jämför visuella teman
          </h1>
          <p style={{ fontSize: 13, color: "#546679", margin: "2px 0 0" }}>
            Välj det tema som passar bäst — ingen förändring görs förrän du bestämmer dig
          </p>
        </div>
        <div style={{ width: 70 }} />
      </div>

      {/* Theme cards grid */}
      <div
        style={{
          maxWidth: 1200,
          margin: "32px auto",
          padding: "0 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 24,
        }}
      >
        {themes.map((theme, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column" }}>
            {/* Theme label */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#0A2540",
                    margin: 0,
                  }}
                >
                  {i === 0 && "A) "}
                  {i === 1 && "B) "}
                  {i === 2 && "C) "}
                  {theme.name}
                  {i === 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        background: "#635BFF",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: 20,
                        marginLeft: 8,
                        fontWeight: 500,
                      }}
                    >
                      Nuvarande
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: 13, color: "#546679", margin: "2px 0 0" }}>
                  {theme.description}
                </p>
              </div>
              <button
                onClick={() => setSelected(i)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: selected === i ? `2px solid ${theme.primary}` : "1px solid #D1D5DB",
                  background: selected === i ? `${theme.primary}11` : "#FFF",
                  color: selected === i ? theme.primary : "#546679",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {selected === i ? "✓ Vald" : "Välj"}
              </button>
            </div>

            {/* Mock phone frame */}
            <div
              style={{
                background: theme.bg,
                borderRadius: 20,
                border: selected === i ? `3px solid ${theme.primary}` : `1px solid ${theme.cardBorder}`,
                padding: "24px 20px",
                flex: 1,
                boxShadow: selected === i ? `0 0 0 4px ${theme.primary}22` : theme.shadow,
                transition: "all 0.2s ease",
              }}
            >
              <MockResultCard t={theme} />
            </div>

            {/* Color swatches */}
            <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
              {[theme.bg, theme.text, theme.primary, theme.accent, theme.danger].map((c, j) => (
                <div
                  key={j}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c,
                    border: "2px solid #fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom info */}
      {selected !== null && (
        <div
          style={{
            textAlign: "center",
            padding: "24px 20px 48px",
          }}
        >
          <p style={{ fontSize: 14, color: "#546679" }}>
            Du har valt <strong style={{ color: "#0A2540" }}>{themes[selected].name}</strong>. 
            Skriv i chatten att du vill applicera det temat så fixar jag det!
          </p>
        </div>
      )}
    </div>
  );
}
