import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "Hur vet jag om jag är underbetald som sjuksköterska?",
    answer:
      "Det bästa sättet är att jämföra din lön med vad kommuner faktiskt betalar för inhyrd personal via ramavtal. BraGig.se gör exakt detta — vi matchar din yrkesroll, kommun och erfarenhet mot officiella ramavtalspriser så du ser om ditt erbjudande ligger under, på eller över marknadsnivå.",
  },
  {
    question: "Vad är ramavtalspriser och varför är de relevanta?",
    answer:
      "Ramavtalspriser är de timpris som kommuner och regioner har avtalat med bemanningsföretag. De speglar vad arbetsgivare faktiskt är villiga att betala för din kompetens — och ger därmed en mer realistisk bild av ditt marknadsvärde än generella lönestatistiker.",
  },
  {
    question: "Hur mycket tjänar en sjuksköterska i Sverige 2026?",
    answer:
      "Medianlönen för en sjuksköterska i Sverige ligger runt 36 000–39 000 kr/mån beroende på region och erfarenhet. Specialistsjuksköterskor kan tjäna 40 000–48 000 kr/mån. Ramavtalspriserna visar dock att arbetsgivare ofta betalar betydligt mer för inhyrd personal, vilket indikerar att fast anställda ofta är underbetalda.",
  },
  {
    question: "Vilka faktorer påverkar min lön mest?",
    answer:
      "De tre viktigaste faktorerna är: (1) Din specialisering — specialistsjuksköterskor inom t.ex. intensivvård eller operation har högre marknadsvärde. (2) Geografisk placering — glesbygdskommuner betalar ofta högre ramavtalspriser. (3) Erfarenhet — varje års erfarenhet höjer ditt timpris enligt ramavtalen.",
  },
  {
    question: "Hur kan jag använda BraGig-rapporten i en löneförhandling?",
    answer:
      "Rapporten visar exakt vad din kommun betalar för inhyrd personal med din profil. I förhandlingen kan du referera till dessa siffror och argumentera att din fasta lön bör spegla ditt faktiska marknadsvärde. Många arbetsgivare föredrar att höja lönen framför att betala ännu mer för inhyrd personal.",
  },
  {
    question: "Skiljer sig lönerna mycket mellan olika kommuner?",
    answer:
      "Ja, skillnaderna kan vara stora. Storstadskommuner har generellt lägre ramavtalspriser tack vare större tillgång på personal, medan glesbygdskommuner i norra Sverige kan betala 30–50% mer. BraGig.se visar data för alla 290 kommuner så du kan jämföra.",
  },
  {
    question: "Kostar det något att använda BraGig.se?",
    answer:
      "Den grundläggande lönejämförelsen är helt gratis. Du fyller i din profil och får direkt se hur ditt erbjudande förhåller sig till ramavtalspriserna. För en detaljerad rapport med specifika förhandlingstips och djupare analys finns en uppgraderingsmöjlighet.",
  },
  {
    question: "Hur ofta uppdateras datan?",
    answer:
      "Vi uppdaterar ramavtalspriserna kontinuerligt i takt med att nya avtal tecknas. Den senaste uppdateringen gjordes 2026. Kommuner omförhandlar sina ramavtal regelbundet, och vi säkerställer att vår data alltid speglar aktuella priser.",
  },
  {
    question: "Kan jag lita på att datan är korrekt?",
    answer:
      "All data kommer från offentliga ramavtal som kommuner och regioner publicerar. Dessa är juridiskt bindande avtal och representerar faktiska priser. Vi granskar och validerar all data innan den läggs in i systemet.",
  },
  {
    question: "Vad är skillnaden mellan timpris och månadslön?",
    answer:
      "Ramavtalspriser anges som timpris som kommunen betalar till bemanningsföretaget. BraGig.se räknar om detta till en uppskattad månadslön genom att ta hänsyn till arbetstid, semesterersättning och arbetsgivaravgifter — så du kan jämföra direkt med din lönespecifikation.",
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
      "Vanliga frågor om lön för sjuksköterskor | BraGig.se";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Svar på vanliga frågor om sjuksköterskelöner, ramavtalspriser, löneförhandling och hur BraGig.se hjälper dig jämföra din lön."
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
            Vanliga frågor om lön
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/85 font-body max-w-2xl mx-auto">
            Allt du behöver veta om sjuksköterskelöner, ramavtalspriser och
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
            Redo att jämföra din lön?
          </h2>
          <p className="text-muted-foreground text-sm">
            Det tar bara 60 sekunder och är helt gratis.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Gör din löneanalys nu
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 BraGig.se · Data från offentliga ramavtal</p>
      </footer>
    </div>
  );
}
