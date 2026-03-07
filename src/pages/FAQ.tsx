import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "Hur fungerar CompCare.se?",
    answer:
      "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din nuvarande eller erbjudna ersättning med faktiska ramavtalspriser som offentliga vårdgivare betalar till bemanningsföretag för inhyrd personal. Därefter gör vi ett avdrag för marknadsmässig marginal till bemanningsföretaget. Det som kvarstår är det belopp som utgör ersättningsutrymmet som är förhandlingsbar.",
  },
  {
    question: "Vilka data baseras analysen på?",
    answer:
      "Analysen baseras på Regionernas officiella ramavtalspriser för 2026 och bemanningsbranschens standardmarginaler.",
  },
  {
    question: "Kostar det något att använda CompCare?",
    answer:
      "Den grundläggande jämförelsen är helt gratis. För en detaljerad rapport med förhandlingstips kan du välja att uppgradera.",
  },
  {
    question: "Vilka yrkesgrupper stöds?",
    answer:
      "Just nu fokuserar vi på sjuksköterskor, barnmorskor och läkare. Samtliga specialiseringar har unik data. Fler kompetenser kommer snart.",
  },
  {
    question: "Hur vet jag om jag är underbetald?",
    answer:
      "Det bästa sättet är att jämföra din ersättning med vad offentliga vårdgivare faktiskt betalar för inhyrd personal via ramavtal. CompCare.se gör exakt detta — vi matchar din yrkesroll, arbetsort och erfarenhet mot officiella ramavtalspriser så du ser om ditt erbjudande ligger under, på eller över marknadsnivå.",
  },
  {
    question: "Vad är ramavtalspriser och varför är de relevanta?",
    answer:
      "Ramavtalspriser är de timpris som offentliga vårdgivare har avtalat med bemanningsföretag. De speglar vad arbetsgivare faktiskt är villiga att betala för din kompetens — och ger därmed en mer realistisk bild av ditt marknadsvärde än generella lönestatistiker.",
  },
  {
    question: "Hur kan jag använda CompCare-rapporten i en förhandling?",
    answer:
      "Rapporten visar exakt vad din vårdgivare betalar för inhyrd personal med din profil. I förhandlingen kan du referera till dessa siffror och argumentera att din ersättning bör spegla ditt faktiska marknadsvärde.",
  },
  {
    question: "Skiljer sig ersättningarna mycket mellan olika kommuner?",
    answer:
      "Ja, skillnaderna kan vara stora. Storstadskommuner har generellt lägre ramavtalspriser tack vare större tillgång på personal, medan glesbygdskommuner kan betala 30–50% mer. CompCare.se visar data för alla 290 vårdgivare så du kan jämföra.",
  },
  {
    question: "Hur ofta uppdateras datan?",
    answer:
      "Vi uppdaterar ramavtalspriserna kontinuerligt i takt med att nya avtal tecknas. Den senaste uppdateringen gjordes 2026.",
  },
  {
    question: "Kan jag lita på att datan är korrekt?",
    answer:
      "All data kommer från offentliga ramavtal som vårdgivare publicerar. Dessa är juridiskt bindande avtal och representerar faktiska priser.",
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

export default function FAQ() {
  useEffect(() => {
    document.title =
      "Vanliga frågor om ersättning för sjuksköterskor | CompCare.se";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Svar på vanliga frågor om ersättning, ramavtalspriser, förhandling och hur CompCare.se hjälper dig jämföra din ersättning."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Header */}
      <header className="hero-gradient py-10 px-5 text-center sm:py-14">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl text-primary-foreground leading-tight">
            Vanliga frågor om ersättning
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/85 font-body max-w-2xl mx-auto">
            Allt du behöver veta om ersättningar, ramavtalspriser och
            hur du kan förhandla bättre.
          </p>
        </div>
      </header>

      {/* FAQ Content */}
      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <dl className="space-y-8">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="border-b border-border pb-6 last:border-0"
            >
              <dt className="text-lg font-semibold text-foreground mb-2">
                {item.question}
              </dt>
              <dd className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>

        {/* CTA */}
        <section className="mt-12 text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Redo att jämföra din ersättning?
          </h2>
          <p className="text-muted-foreground text-sm">
            Det tar bara 60 sekunder och är helt gratis.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Gör din ersättningsanalys nu
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 CompCare.se · Data från offentliga ramavtal</p>
      </footer>
    </div>
  );
}
