import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/lib/router-compat";
import Hero from "@/components/startsida5c/Hero";
import RolltabellDark from "@/components/startsida5c/RolltabellDark";
import OvergangChatt from "@/components/startsida5c/OvergangChatt";
import FotoBand from "@/components/startsida5c/FotoBand";
import Footer5c from "@/components/startsida5c/Footer5c";
import AnimationSektion from "@/components/startsida5c/AnimationSektion";
import {
  AssistentenAnimation,
  LonekollenAnimation,
  MissadeTimmarAnimation,
} from "@/components/animationer";

export const Route = createFileRoute("/dev/startsida-animationer")({
  head: () => ({
    meta: [
      { title: "Startsida med animationer — förhandsvisning" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Intern förhandsvisning av startsidan med de tre landningsanimationerna och tillhörande copy.",
      },
      { property: "og:title", content: "Startsida med animationer — förhandsvisning" },
      {
        property: "og:description",
        content: "Intern förhandsvisning av startsidan med de tre landningsanimationerna.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DevStartsidaAnimationer,
});

function DevStartsidaAnimationer() {
  return (
    <div
      style={{ background: "#0b0c10", fontFamily: "'Space Grotesk',system-ui,sans-serif", color: "#ffffff" }}
    >
      <div
        className="px-5 py-2 text-center text-[12px] sm:px-8"
        style={{ background: "#16171f", color: "#9b9da7", fontFamily: "'IBM Plex Mono', monospace" }}
      >
        Intern förhandsvisning · startsidan med tre animationssektioner
      </div>

      <header
        className="flex items-center justify-between px-5 py-4 md:px-12 md:py-5"
        style={{ borderBottom: "1px solid #22232b" }}
      >
        <Link to="/" className="inline-flex items-center" aria-label="vårdbemanning.ai">
          <img
            src="/vardbemanning-wordmark-dark.png"
            alt="vårdbemanning.ai"
            className="h-6 w-auto select-none md:h-7"
            draggable={false}
          />
        </Link>
        <Link
          to="/logga-in"
          aria-label="Logga in"
          className="text-[14px] font-medium text-white/70 transition-colors hover:text-white"
        >
          Logga in
        </Link>
      </header>

      <Hero />

      <AnimationSektion
        Animation={LonekollenAnimation}
        etikett="Lönekollen"
        rubrik={"Vad är din tid värd\nnär du vet vad regionen betalar?"}
        brodtext="Välj din roll och din ort. Assistenten hämtar den ersättningsnivå som gäller i regionens ramavtal just nu och visar vad det betyder för dig per timme — inte ett gissat riksgenomsnitt."
        punkter={[
          "Roll och ort avgör nivån — vi räknar på exakt din kombination.",
          "Bygger på regionernas egna ramavtalspriser för 2026.",
          "Du ser underlaget, inte bara ett resultat.",
        ]}
        cta={{ text: "Gör en lönekoll", till: "/" }}
        ton="ljus"
      />

      <FotoBand />

      <AnimationSektion
        Animation={MissadeTimmarAnimation}
        etikett="Fakturahjälpen"
        rubrik={"Timmarna du faktiskt jobbade\nsyns inte alltid på fakturan"}
        brodtext="Ladda upp tidrapport och faktura. Assistenten går rad för rad, jämför mot avtalets ersättningsregler och markerar det som saknas eller ligger fel — jour, förskjuten tid, restid, avrundade pass."
        
        punkter={[
          "Rad-för-rad-genomgång av underlag mot avtal.",
          "Avvikelser markeras med förklaring du kan skicka vidare.",
          "Du bestämmer själv om och hur du tar det med uppdragsgivaren.",
        ]}
        cta={{ text: "Läs mer om fakturahjälpen", till: "/registrera" }}
        ton="ljus"
        omvand
      />

      <RolltabellDark />

      <AnimationSektion
        Animation={AssistentenAnimation}
        etikett="Assistenten"
        rubrik={"En assistent som läser avtalen\nså att du inte behöver göra det"}
        brodtext="Ställ frågan i klartext. Assistenten läser ramavtal och prisbilagor, svarar kort och visar vilken källa svaret bygger på. Den minns din roll, din ort och vad ni pratade om förra gången."
        punkter={[
          "Svar med hänvisning till källan — inga lösa påståenden.",
          "Kommer ihåg din situation mellan samtalen.",
          "Fyra verktyg i samma vy: lön, pension, avtal och faktura.",
        ]}
        cta={{ text: "Skapa konto och kom igång", till: "/registrera" }}
        ton="mork"
      />

      <OvergangChatt />

      <Footer5c />
    </div>
  );
}
