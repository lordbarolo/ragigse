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
      yrke: "Specialistläkare – Allmänmedicin",
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

      {/* Hero — clean white with navy text, Stripe-style */}
      <header className="py-16 px-5 text-center sm:py-24 border-b border-border">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted rounded-full px-4 py-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Baserat på officiella avtalspriser · 290 kommuner · 21 regioner</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
            Får du rätt ersättning?
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Jämför din lön med faktiska ramavtalspriser — gratis och anonymt.
          </p>
        </div>
      </header>

      {/* Survey — light professional tool feel */}
      <main className="px-4 py-12 sm:py-16 bg-background">
        {import.meta.env.DEV && (
          <button
            onClick={devSkip}
            className="mx-auto mb-4 block text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition"
          >
            🧪 Dev: hoppa till /resultat
          </button>
        )}
        <Survey />
      </main>

      {/* FAQ Section */}
      <section className="bg-background border-t border-border" aria-labelledby="faq-heading">
        <div className="max-w-2xl mx-auto px-5 py-16 sm:py-20">
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10"
          >
            Vanliga frågor
          </h2>
          <dl className="space-y-8">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <dt className="text-base font-semibold text-foreground mb-1.5">
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
      <footer className="bg-background border-t border-border py-10 text-center text-sm text-muted-foreground space-y-2">
        <p>© 2026 CompCare.se · Data från offentliga ramavtal</p>
        <p className="text-xs text-muted-foreground/70">Fler branscher kommer snart</p>
        <Link to="/vanliga-fragor" className="text-primary hover:underline text-sm">
          Vanliga frågor om lön →
        </Link>
      </footer>
    </div>
  );
};

export default Index;
