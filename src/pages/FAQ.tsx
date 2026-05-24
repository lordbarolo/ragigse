import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";


const FAQ_ITEMS = [
  {
    question: "Hur fungerar CompCare.se?",
    answer:
      "Du fyller i yrkesroll, arbetsort och erfarenhet. Vi jämför din ersättning med officiella ramavtalspriser som offentliga vårdgivare betalar till bemanningsföretag. Därefter drar vi av en marknadsmässig marginal. Resultatet visar hur din ersättning förhåller sig till marknadsspannet.",
  },
  {
    question: "Vilka data baseras analysen på?",
    answer:
      "Analysen baseras på regionernas officiella ramavtalspriser för 2026 och bemanningsbranschens standardmarginaler.",
  },
  {
    question: "Kostar det något att använda CompCare?",
    answer:
      "Den grundläggande jämförelsen är helt gratis. För en detaljerad rapport kan du välja att uppgradera.",
  },
  {
    question: "Vilka yrkesgrupper stöds?",
    answer:
      "Just nu täcker vi sjuksköterskor, barnmorskor och läkare — samtliga specialiseringar har unik data. Fler yrkesgrupper kommer snart.",
  },
  {
    question: "Hur ligger min ersättning jämfört med marknaden?",
    answer:
      "CompCare matchar din yrkesroll, arbetsort och erfarenhet mot officiella ramavtalspriser och visar om din ersättning ligger under, på eller över marknadsspannet.",
  },
  {
    question: "Vad är ramavtalspriser och varför är de relevanta?",
    answer:
      "Ramavtalspriser är de timpris som offentliga vårdgivare har avtalat med bemanningsföretag. De visar vad som faktiskt betalas för inhyrd personal och fungerar som en referenspunkt för ersättningsnivåer.",
  },
  {
    question: "Vad innehåller CompCare-rapporten?",
    answer:
      "Rapporten visar ramavtalspriser för din yrkesroll och zon, marknadmässig lön efter marginal, samt hur din ersättning förhåller sig till marknadens percentiler.",
  },
  {
    question: "Skiljer sig ersättningarna mellan olika kommuner?",
    answer:
      "Ja, skillnaderna kan vara stora. Storstadskommuner har generellt lägre ramavtalspriser tack vare större tillgång på personal, medan glesbygdskommuner kan betala 30–50% mer. CompCare visar data för alla 290 vårdgivare.",
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
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Vanliga frågor om ersättning för vårdkonsulter | CompCare"
        description="Svar på vanliga frågor om ersättning, SKR-ramavtalspriser och hur CompCare hjälper dig jämföra din ersättning med marknadsdata."
        path="/vanliga-fragor"
        jsonLd={faqJsonLd}
      />


      {/* Header */}
      <header className="hero-gradient py-10 px-5 text-center sm:py-14">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl text-primary-foreground leading-tight">
            Vanliga frågor om ersättning
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/85 font-body max-w-2xl mx-auto">
            Allt du behöver veta om ersättningar, ramavtalspriser och
            marknadsdata.
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
            Jämför din ersättning med marknadsdata
          </h2>
          <p className="text-muted-foreground text-sm">
            Det tar 60 sekunder. Ingen registrering krävs.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Till marknadsanalysen
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
