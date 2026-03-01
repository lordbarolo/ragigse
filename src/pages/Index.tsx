import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Survey from "@/components/Survey";
import { Shield } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const FAQ_ITEMS = [
  {
    question: "Hur fungerar CompCare.se?",
    answer: "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din nuvarande eller erbjudna konsultersättning med faktiska ramavtalspriser som offentliga vårdgivare betalar till bemanningsföretag för inhyrd personal. Därefter gör vi ett avdrag för marknadsmässig marginal till bemanningsföretaget. Det som kvarstår är det belopp som utgör ditt förhandlingsbara ersättningsutrymme.",
  },
  {
    question: "Vilka data baseras analysen på?",
    answer: "Analysen baseras på officiella ramavtalspriser från 290 svenska vårdgivare, uppdaterade 2026.",
  },
  {
    question: "Kostar det något att använda CompCare?",
    answer: "Den grundläggande jämförelsen av din konsultersättning är helt gratis. För en detaljerad rapport med förhandlingstips kan du välja att uppgradera.",
  },
  {
    question: "Vilka yrkesgrupper stöds?",
    answer: "Just nu fokuserar vi på konsulterande sjuksköterskor, barnmorskor och läkare. Samtliga specialiseringar har unik data. Fler kompetenser kommer snart.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "CompCare.se",
  url: "https://compcare.se",
  description:
    "Jämför din konsultersättning med faktiska ramavtalspriser för vårdkonsulter i 290 kommuner.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "SEK",
    description: "Gratis jämförelse av konsultersättning",
  },
};

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  const devSkip = () => {
    const testData = {
      category: "doctor",
      role: "Specialistläkare",
      specialization: "Allmänmedicin",
      region: "Stockholm",
      kommun: "Stockholm",
      employmentType: "foretagare",
      salaryType: "hourly",
      currentSalary: 500,
      commute: "none",
      email: "test@compcare.se",
    };
    sessionStorage.setItem("surveyData", JSON.stringify(testData));
    navigate("/resultat");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />

      {/* Hero */}
      <header className="hero-gradient py-10 px-5 text-center sm:py-16">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Trust badge — above headline */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-primary-foreground/60 font-medium">
            <Shield className="w-4 h-4" />
            <span>Baserat på officiella avtalspriser hos 290 kommuner och 21 regioner</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl text-primary-foreground leading-tight">
            Får du rätt ersättning?
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 font-body max-w-2xl mx-auto">
            Jämför med officiella avtalspriser hos 290 kommuner och 21 regioner.
          </p>
        </div>
      </header>

      {/* Survey */}
      <main className="px-4 py-8 sm:py-12">
        {import.meta.env.DEV && (
          <button
            onClick={devSkip}
            className="mx-auto mb-4 block text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-accent/20 transition"
          >
            🧪 Dev: hoppa till /resultat
          </button>
        )}
        <Survey />
      </main>

      {/* FAQ Section */}
      <section className="bg-card border-t" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8"
          >
            Vanliga frågor
          </h2>
          <dl className="space-y-6">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <dt className="text-base font-semibold text-foreground mb-1">
                  {item.question}
                </dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground space-y-2">
        <p>© 2026 CompCare.se · Data från offentliga ramavtal</p>
        <p className="text-xs text-muted-foreground/70">Fler branscher kommer snart</p>
        <Link to="/vanliga-fragor" className="text-primary hover:underline">
          Vanliga frågor om lön →
        </Link>
      </footer>
    </div>
  );
};

export default Index;
