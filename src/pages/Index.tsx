import { useEffect } from "react";
import { Link } from "react-router-dom";
import Survey from "@/components/Survey";
import { Shield, TrendingUp, FileCheck } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const FAQ_ITEMS = [
  {
    question: "Hur fungerar BraGig.se?",
    answer: "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din nuvarande eller erbjudna ersättning med faktiska ramavtalspriser som offentliga vårdgivare betalar till bemanningsföretag för inhyrd personal. Därefter gör vi ett avdrag för marknadsmässig marginal till bemanningsföretaget. Det som kvarstår är det belopp som utgör ersättningsutrymmet som är förhandlingsbar.",
  },
  {
    question: "Vilka data baseras analysen på?",
    answer: "Analysen baseras på officiella ramavtalspriser från 290 svenska vårdgivare, uppdaterade 2026.",
  },
  {
    question: "Kostar det något att använda BraGig?",
    answer: "Den grundläggande jämförelsen är helt gratis. För en detaljerad rapport med förhandlingstips kan du välja att uppgradera.",
  },
  {
    question: "Vilka yrkesgrupper stöds?",
    answer: "Just nu fokuserar vi på sjuksköterskor, barnmorskor och läkare. Samtliga specialiseringar har unik data. Fler kompetenser kommer snart.",
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
  name: "BraGig.se",
  url: "https://bragig.se",
  description:
    "Jämför din lön med faktiska ramavtalspriser för sjuksköterskor i 290 kommuner.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "SEK",
    description: "Gratis lönejämförelse",
  },
};

const Index = () => {
  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

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
          <p className="text-xs sm:text-sm uppercase tracking-widest text-primary-foreground/60 font-semibold mb-2">
            För vårdkonsulter
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-primary-foreground leading-tight">
            Får du den lön du förtjänar?
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 font-body max-w-2xl mx-auto">
            75% av sjuksköterskor är underbetalda. Jämför ditt erbjudande med
            faktiska ramavtalspriser — gratis.
          </p>
        </div>
      </header>

      {/* Trust badges */}
      <section
        className="border-b bg-card"
        aria-label="Förtroendesignaler"
      >
        <div className="max-w-4xl mx-auto px-5 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Baserat på officiella
            ramavtal
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" /> 290 kommuner
          </span>
          <span className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-accent" /> Uppdaterat 2026
          </span>
        </div>
      </section>

      {/* Survey */}
      <main className="px-4 py-8 sm:py-12">
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
        <p>© 2026 BraGig.se · Data från offentliga ramavtal</p>
        <p className="text-xs text-muted-foreground/70">Fler branscher kommer snart</p>
        <Link to="/vanliga-fragor" className="text-primary hover:underline">
          Vanliga frågor om lön →
        </Link>
      </footer>
    </div>
  );
};

export default Index;
