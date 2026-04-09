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
        <p className="text-sm text-muted-foreground mb-10">Senast uppdaterad: april 2026</p>

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

            <h3 className="text-base font-medium text-foreground mt-4">2.1 Kontouppgifter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              När du skapar ett konto samlar vi in din e-postadress och eventuellt lösenord. Du kan även logga in via Google, i vilket fall vi tar emot ditt namn och e-postadress från Google.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.2 Profilinformation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              I din profil kan du ange: yrkesroll, specialisering, geografisk region, anställningsform, erfarenhet, nuvarande ersättning, arbetsvillkor (jour, ledarskap, vårdform) samt bemanningsföretag. Dessa uppgifter används för att leverera personanpassade analyser.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.3 Dokumentvalvet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Du kan ladda upp legitimationer, intyg och andra yrkesdokument till ditt personliga dokumentvalv. Filer lagras krypterat och kan delas via engångslänkar som du kontrollerar.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.4 Referenser</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Du kan registrera referensgivare med namn, e-post, telefonnummer, organisation och yrkesroll. Vi skickar inbjudningar via e-post och erbjuder BankID-verifiering. Referensgivarens personuppgifter behandlas för att möjliggöra verifieringstjänsten. Rättslig grund: berättigat intresse (artikel 6.1f GDPR). Referensgivaren kan när som helst begära radering av sina uppgifter.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.5 Löneanalys och förhandlingschat</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Uppgifter du anger i enkäten (yrkesroll, specialisering, zon, anställningsform, ersättning) används för att beräkna din marknadsposition. Om du använder vår AI-drivna förhandlingsassistent sparas konversationshistoriken kopplat till din rapport-session.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.6 Fakturagranskning</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Om du skickar in fakturor för granskning samlar vi in din e-postadress, uppladdade filer (fakturor/tidrapporter) samt eventuellt meddelande. Filer lagras krypterat och används enbart för att identifiera avvikelser mellan fakturerat och utfört arbete.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.7 Uppdragsprognos (Radar)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Om du använder vår uppdragsprognos kan du bevaka specifika beställare, kompetenser och orter. Vi sparar din bevakning och kan skicka e-postnotifieringar om kommande uppdrag baserat på historisk data.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.8 Tekniska uppgifter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Vi använder PostHog (EU-baserat) för anonym användaranalys. Spårning aktiveras först efter att du accepterat cookies. Data som samlas in inkluderar: sidvisningar, klick och navigation, enhetsinformation (mobil/desktop, webbläsare) samt geografisk region (IP-adressen lagras inte i klartext). Inga session recordings eller skärminspelningar görs.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.9 Kupongkoder och kampanjer</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Om du använder en kupongkod (via URL-parameter eller manuell inmatning) lagrar vi vilken kod som använts kopplat till en rapport-ID.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">3. Varför behandlar vi dina uppgifter</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-2 list-none pl-0">
              <li><strong className="text-foreground">Leverans av tjänsten:</strong> Vi behandlar dina uppgifter för att skapa och leverera löneanalyser, fakturagranskning, dokumenthantering, referensverifiering och uppdragsprognoser. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Kontoadministration:</strong> Vi hanterar din inloggning, profil och inställningar. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Förbättring av tjänsten:</strong> Vi använder anonymiserad användarstatistik för att förbättra tjänsten. Rättslig grund: berättigat intresse (artikel 6.1f GDPR).</li>
              <li><strong className="text-foreground">Kommunikation:</strong> Vi skickar transaktionsmeddelanden (rapportleverans, referensinbjudningar, uppföljning) via e-post. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Notifieringar:</strong> Om du aktiverat bevakning i uppdragsprognosen skickar vi e-postnotifieringar. Rättslig grund: samtycke (artikel 6.1a GDPR).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">4. Vilka vi delar uppgifter med</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi delar uppgifter med följande tjänsteleverantörer, som alla agerar som personuppgiftsbiträden eller självständigt personuppgiftsansvariga:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Supabase:</strong> Databas, autentisering och fillagring. Data lagras inom EU.</li>
              <li><strong className="text-foreground">PostHog:</strong> Analysverktyg. EU-instans (eu.posthog.com). Anonymiserad data. Aktiveras först efter cookie-samtycke.</li>
              <li><strong className="text-foreground">Resend:</strong> E-postleverans för transaktionsmeddelanden (rapporter, referensinbjudningar, välkomstmail, uppföljning).</li>
              <li><strong className="text-foreground">Google:</strong> Om du väljer att logga in via Google delas autentiseringsuppgifter med Google enligt deras integritetspolicy.</li>
              <li><strong className="text-foreground">AI-modeller:</strong> Förhandlingsassistenten och uppdragsprognoschattfunktionen använder AI-modeller för att generera svar. Inga personidentifierande uppgifter skickas till modellerna — enbart anonymiserad kontext om yrkesroll och marknadssituation.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Vi säljer aldrig dina personuppgifter till tredje part.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">5. Var lagras dina uppgifter</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Alla uppgifter lagras inom EU/EES. Supabase och PostHog är konfigurerade med EU-baserade servrar. Uppladdade dokument och fakturor krypteras vid lagring.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">6. Hur länge sparas uppgifterna</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Konto och profil:</strong> Sparas så länge du har ett aktivt konto. Du kan radera ditt konto via inställningarna, varpå alla personuppgifter raderas inom 30 dagar.</li>
              <li><strong className="text-foreground">Dokument och fakturor:</strong> Sparas så länge du har ett aktivt konto eller tills du manuellt raderar dem.</li>
              <li><strong className="text-foreground">Referenser:</strong> Sparas så länge du har ett aktivt konto. Referensgivare kan begära radering av sina uppgifter när som helst.</li>
              <li><strong className="text-foreground">Analysresultat:</strong> Anonymiserade analysresultat sparas så länge tjänsten är aktiv för aggregerad statistik.</li>
              <li><strong className="text-foreground">Analysdata (PostHog):</strong> Anonymiserade sessionsdata sparas i 12 månader.</li>
              <li><strong className="text-foreground">E-postloggar:</strong> Sparas i 12 månader för felsökning och leveransuppföljning.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">7. Dina rättigheter</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">Enligt GDPR har du rätt att:</p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Få tillgång till dina uppgifter</strong> — begär en kopia av de uppgifter vi har om dig.</li>
              <li><strong className="text-foreground">Få uppgifter rättade</strong> — om något är felaktigt.</li>
              <li><strong className="text-foreground">Få uppgifter raderade</strong> — du kan radera ditt konto direkt i tjänsten, eller kontakta oss. Vi raderar dina uppgifter om det inte finns lagkrav på att behålla dem.</li>
              <li><strong className="text-foreground">Återkalla samtycke</strong> — du kan när som helst ändra ditt cookie-val eller avregistrera dig från notifieringar.</li>
              <li><strong className="text-foreground">Invända mot behandling</strong> — baserat på berättigat intresse.</li>
              <li><strong className="text-foreground">Dataportabilitet</strong> — du kan begära att få dina uppgifter i ett maskinläsbart format.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Kontakta oss på <a href="mailto:info@compcare.se" className="text-primary hover:underline">info@compcare.se</a> för att utöva dina rättigheter. Vi svarar inom 30 dagar. Du har även rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY), <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">imy.se</a>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">8. Cookies och spårning</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Compcare använder en cookie-banner som visas vid första besöket. Du kan välja att acceptera eller avvisa analytiska cookies. Ditt val sparas i webbläsarens localStorage.
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Nödvändiga:</strong> Autentiseringstokens (Supabase) för att hålla dig inloggad. Dessa krävs för att tjänsten ska fungera och kräver inte samtycke.</li>
              <li><strong className="text-foreground">Funktionella:</strong> SessionStorage och localStorage för att hålla enkätsvar, kupongkoder och temaval under ditt besök.</li>
              <li><strong className="text-foreground">Analys:</strong> PostHog använder localStorage för anonymt användar-ID. Aktiveras först efter att du accepterat cookies via vår cookie-banner. Ingen personidentifierbar information lagras.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Vi använder inga tredjepartscookies för reklam.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">9. Säkerhet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina personuppgifter, inklusive: kryptering av data i transit (TLS) och vid lagring, radnivåsäkerhet (RLS) i databasen som säkerställer att varje användare enbart kan se sina egna uppgifter, samt BankID-verifiering för referenstjänsten.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">10. Ändringar av denna policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi kan uppdatera denna policy. Vid väsentliga ändringar publiceras den nya versionen på compcare.se med uppdaterat datum. Vi rekommenderar att du regelbundet granskar denna sida.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">11. Kontakt</h2>
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
