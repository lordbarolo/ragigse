import { Link } from "react-router-dom";
import logoDark from "@/assets/logo-dark.png";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="py-8 px-5 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <Link to="/">
            <img src={logoDark} alt="CompCare" className="h-8 sm:h-10" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16 prose prose-sm prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold text-foreground mb-2">Integritetspolicy</h1>
        <p className="text-sm text-muted-foreground mb-10">Senast uppdaterad: mars 2026</p>

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground">1. Personuppgiftsansvarig</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Compcare drivs av Piemonte Invest AB (org.nr 559264-3836) med säte i Stockholm. Vi är personuppgiftsansvariga för behandlingen av dina personuppgifter när du använder compcare.se.
            </p>
            <p className="text-sm text-muted-foreground mt-2">Kontakt: <a href="mailto:info@compcare.se" className="text-primary hover:underline">info@compcare.se</a></p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">2. Vilka uppgifter samlar vi in</h2>

            <h3 className="text-base font-medium text-foreground mt-4">2.1 Uppgifter du anger i enkäten</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              När du använder vår ersättningsanalys samlar vi in: yrkesroll, specialisering, geografisk zon, anställningsform och din nuvarande timersättning. Dessa uppgifter är inte direkt kopplade till din identitet och samlas in anonymt.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.2 Uppgifter vid betalning</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Vid köp av den fullständiga analysen hanteras betalningen av Stripe (stripe.com). Vi lagrar inte dina kortuppgifter. Stripe agerar som självständig personuppgiftsansvarig för betaluppgifterna. Se Stripes integritetspolicy på{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a>.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.3 Tekniska uppgifter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Vi använder PostHog (EU-baserat) för anonym användaranalys. Detta inkluderar: sidvisningar, klick och navigation i tjänsten, enhetsinformation (mobil/desktop, webbläsare), samt geografisk region (baserat på IP-adress, som inte lagras i klartext). Inga session recordings eller skärminspelningar görs.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.4 Kupongkoder</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Om du använder en kupongkod (via URL-parameter) lagrar vi vilken kod som använts. Koden kopplas inte till din identitet utan till en anonym sessions-ID.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">3. Varför behandlar vi dina uppgifter</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-2 list-none pl-0">
              <li><strong className="text-foreground">Leverans av tjänsten:</strong> Vi behandlar dina enkätsvar för att beräkna och leverera din ersättningsanalys. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Förbättring av tjänsten:</strong> Vi använder anonymiserad användarstatistik för att förbättra tjänsten. Rättslig grund: berättigat intresse (artikel 6.1f GDPR).</li>
              <li><strong className="text-foreground">Betalning:</strong> Vi delar nödvändiga uppgifter med Stripe för att genomföra betalningen. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">4. Vilka vi delar uppgifter med</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi delar uppgifter med följande tjänsteleverantörer, som alla agerar som personuppgiftsbiträden eller självständigt personuppgiftsansvariga:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Supabase:</strong> Databas och lagring. Data lagras inom EU. Databiträdesavtal finns.</li>
              <li><strong className="text-foreground">Stripe:</strong> Betalningshantering. Självständig personuppgiftsansvarig. Privacy Shield-certifierade och GDPR-compliant.</li>
              <li><strong className="text-foreground">PostHog:</strong> Analysverktyg. EU-instans (eu.posthog.com). Anonymiserad data.</li>
              <li><strong className="text-foreground">Resend:</strong> E-postleverans. Används vid transaktionsmeddelanden.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Vi säljer aldrig dina personuppgifter till tredje part.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">5. Var lagras dina uppgifter</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Alla uppgifter lagras inom EU/EES. Supabase och PostHog är konfigurerade med EU-baserade servrar. Stripe kan överföra uppgifter till USA under EU-US Data Privacy Framework.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">6. Hur länge sparas uppgifterna</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Enkätsvar:</strong> Anonymiserade analysresultat sparas så länge tjänsten är aktiv för aggregerad statistik.</li>
              <li><strong className="text-foreground">Betaluppgifter:</strong> Hanteras av Stripe enligt deras lagringsperiod. Vi sparar transaktions-ID i 7 år för bokföringskrav.</li>
              <li><strong className="text-foreground">Analysdata (PostHog):</strong> Anonymiserade sessionsdata sparas i 12 månader.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">7. Dina rättigheter</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">Enligt GDPR har du rätt att:</p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Få tillgång till dina uppgifter</strong> — begär en kopia av de uppgifter vi har om dig.</li>
              <li><strong className="text-foreground">Få uppgifter rättade</strong> — om något är felaktigt.</li>
              <li><strong className="text-foreground">Få uppgifter raderade</strong> — vi raderar dina uppgifter på begäran, om det inte finns lagkrav på att behålla dem.</li>
              <li><strong className="text-foreground">Återkalla samtycke</strong> — om behandlingen baseras på samtycke.</li>
              <li><strong className="text-foreground">Invända mot behandling</strong> — baserat på berättigat intresse.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Kontakta oss på <a href="mailto:info@compcare.se" className="text-primary hover:underline">info@compcare.se</a> för att utöva dina rättigheter. Vi svarar inom 30 dagar. Du har även rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY), <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">imy.se</a>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">8. Cookies och spårning</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Compcare använder följande cookies och lokal lagring:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Funktionella:</strong> SessionStorage för att hålla enkätsvar och kupongkoder under ditt besök. Raderas när du stänger webbläsaren.</li>
              <li><strong className="text-foreground">Analys:</strong> PostHog använder localStorage för anonymt användar-ID. Ingen personidentifierbar information lagras.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Vi använder inga tredjepartscookies för reklam.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">9. Ändringar av denna policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi kan uppdatera denna policy. Vid väsentliga ändringar publiceras den nya versionen på compcare.se med uppdaterat datum. Vi rekommenderar att du regelbundet granskar denna sida.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">10. Kontakt</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">Har du frågor om hur vi hanterar dina uppgifter?</p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1 list-none pl-0">
              <li>E-post: <a href="mailto:info@compcare.se" className="text-primary hover:underline">info@compcare.se</a></li>
              <li>Ansvarigt bolag: Piemonte Invest AB</li>
              <li>Adress: Stockholm, Sverige</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p>© 2026 CompCare.se</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
