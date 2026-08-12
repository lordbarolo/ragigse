import { useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import logoDark from "@/assets/logo-dark.png";

const PrivacyPolicy = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Ingen session");
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.deleted) {
        await signOut();
        navigate("/");
        toast.success("Ditt konto har raderats");
      }
    } catch (err: any) {
      toast.error("Kunde inte radera kontot", { description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-background">
      <header className="py-8 px-5 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <Link to="/">
            <img src={logoDark} alt="vårdbemanning.ai" className="h-8 sm:h-10" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16 prose prose-sm prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold text-foreground mb-2">Integritetspolicy</h1>
        <p className="text-sm text-muted-foreground mb-10">Senast uppdaterad: juni 2026</p>

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground">1. Personuppgiftsansvarig</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi är personuppgiftsansvariga för behandlingen av dina personuppgifter när du använder vårdbemanning.ai.
            </p>
            <p className="text-sm text-muted-foreground mt-2">Kontakt: <a href="mailto:info@vardbemanning.ai" className="text-primary hover:underline">info@vardbemanning.ai</a></p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">2. Vilka uppgifter vi samlar in</h2>

            <h3 className="text-base font-medium text-foreground mt-4">2.1 Löneenkäten</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              När du gör en analys på vårdbemanning.ai samlar vi in: yrkesroll (ev. specialisering), kommun/region, anställningsform (anställd/egenföretagare), aktuell timersättning eller månadslön, samt e-postadress för att leverera rapporten. Uppgifterna används för att beräkna din marknadsposition mot SKR:s ramavtalspriser.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.2 Kontouppgifter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Om du skapar ett konto sparar vi e-postadress och (vid lösenordsinloggning) ett krypterat lösenord. Du kan även logga in via Google, då tar vi emot ditt namn och e-postadress från Google.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.3 Tekniska uppgifter och analys</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Vi använder PostHog (EU-baserat, eu.posthog.com) för anonym användarstatistik. PostHog är opt-out som standard och aktiveras först efter att du accepterat cookies. Data som samlas in inkluderar sidvisningar, klick och enhetsinformation. IP-adresser lagras inte i klartext och vi använder inte session recordings. Vi använder <strong>inte</strong> Google Analytics eller andra tredjepartsspårare för reklam.
            </p>

            <h3 className="text-base font-medium text-foreground mt-4">2.4 Kupongkoder och kampanjer</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Om du anländer via en kampanjlänk eller anger en kupongkod sparar vi vilken kod som använts kopplat till din rapport-ID.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">3. Varför vi behandlar dina uppgifter</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-2 list-none pl-0">
              <li><strong className="text-foreground">Leverans av tjänsten:</strong> Skapa och visa din löneanalys. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Kontoadministration:</strong> Hantera inloggning och inställningar om du valt att skapa konto. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Kommunikation:</strong> Skicka transaktionsmeddelanden (rapportleverans, kontoaktivering, lösenordsåterställning) via e-post. Rättslig grund: fullgörande av avtal (artikel 6.1b GDPR).</li>
              <li><strong className="text-foreground">Förbättring av tjänsten:</strong> Anonymiserad användarstatistik via PostHog. Rättslig grund: samtycke (artikel 6.1a GDPR). Aktiveras först efter cookie-accept och kan när som helst återkallas.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">4. Vilka vi delar uppgifter med</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi delar uppgifter med följande tjänsteleverantörer, som agerar som personuppgiftsbiträden:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Supabase (Lovable Cloud):</strong> Databas, autentisering och fillagring. Data lagras inom EU.</li>
              <li><strong className="text-foreground">PostHog:</strong> Anonym användaranalys på EU-instans (eu.posthog.com). Aktiveras först efter cookie-samtycke.</li>
              <li><strong className="text-foreground">Resend:</strong> E-postleverans för transaktionsmeddelanden.</li>
              <li><strong className="text-foreground">Google:</strong> Om du loggar in via Google delas autentiseringsuppgifter med Google enligt deras integritetspolicy.</li>
              <li><strong className="text-foreground">AI-leverantörer (via Lovable AI Gateway):</strong> När vi använder AI för att tolka eller berika analysen skickas enbart anonymiserad kontext (yrke, zon, marknadsdata) — inga personidentifierande uppgifter.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Vi säljer aldrig dina personuppgifter till tredje part.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">5. Var lagras dina uppgifter</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Alla uppgifter lagras inom EU/EES. Supabase och PostHog är konfigurerade med EU-baserade servrar.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">6. Hur länge sparas uppgifterna</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Konto och profil:</strong> Sparas så länge du har ett aktivt konto. Du kan radera ditt konto via "Radera mitt konto" längst ned på denna sida, varpå alla personuppgifter raderas inom 30 dagar.</li>
              <li><strong className="text-foreground">Löneanalyser (rapporter):</strong> Sparas så länge ditt konto är aktivt, eller upp till 24 månader för anonyma analyser utan konto.</li>
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
              <li><strong className="text-foreground">Få uppgifter raderade</strong> — du kan radera ditt konto direkt i tjänsten, eller kontakta oss.</li>
              <li><strong className="text-foreground">Återkalla samtycke</strong> — du kan när som helst ändra ditt cookie-val.</li>
              <li><strong className="text-foreground">Invända mot behandling</strong> — baserat på berättigat intresse.</li>
              <li><strong className="text-foreground">Dataportabilitet</strong> — få dina uppgifter i ett maskinläsbart format.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Kontakta oss på <a href="mailto:info@vardbemanning.ai" className="text-primary hover:underline">info@vardbemanning.ai</a> för att utöva dina rättigheter. Vi svarar inom 30 dagar. Du har även rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY), <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">imy.se</a>.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">8. Cookies och spårning</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              vårdbemanning.ai visar en cookie-banner vid första besöket. Du väljer själv om analytiska cookies ska aktiveras. Ditt val sparas i webbläsarens localStorage.
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
              <li><strong className="text-foreground">Nödvändiga:</strong> Autentiseringstokens (Supabase) för att hålla dig inloggad. Krävs för att tjänsten ska fungera och kräver inte samtycke.</li>
              <li><strong className="text-foreground">Funktionella:</strong> SessionStorage och localStorage för att spara enkätsvar, kupongkoder och temaval under ditt besök.</li>
              <li><strong className="text-foreground">Analys:</strong> PostHog använder localStorage för anonymt användar-ID. Aktiveras först efter att du accepterat cookies. Ingen personidentifierbar information lagras.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Vi använder inte Google Analytics, Facebook Pixel eller andra tredjepartsspårare för reklam.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">9. Säkerhet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina personuppgifter, inklusive kryptering i transit (TLS), kryptering vid lagring för uppladdade dokument, och radnivåsäkerhet (RLS) i databasen som säkerställer att varje användare enbart kan se sina egna uppgifter.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">10. Ändringar av denna policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vi kan uppdatera denna policy. Vid väsentliga ändringar publiceras den nya versionen här med uppdaterat datum.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground">11. Kontakt</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">Har du frågor om hur vi hanterar dina uppgifter?</p>
            <p className="text-sm text-muted-foreground mt-2">
              E-post: <a href="mailto:info@vardbemanning.ai" className="text-primary hover:underline">info@vardbemanning.ai</a>
            </p>
          </div>

          {user && (
            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-semibold text-foreground">12. Radera ditt konto</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Du kan när som helst radera ditt konto och all tillhörande data — rapporter, profil, referenser och dokument. Detta är permanent och kan inte ångras.
              </p>
              <div className="mt-4 not-prose">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-2">
                      <Trash2 className="w-4 h-4" />
                      Radera mitt konto
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Radera konto permanent?</AlertDialogTitle>
                      <AlertDialogDescription>
                        All din data raderas permanent — rapporter, profil, referenser och dokument. Detta kan inte ångras.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Ja, radera mitt konto
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-background border-t border-border py-10 text-center text-sm text-muted-foreground">
        <p>© 2026 vårdbemanning.ai</p>
      </footer>
    </div>
    </>
  );
};

export default PrivacyPolicy;
