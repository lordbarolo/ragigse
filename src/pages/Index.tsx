import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Survey from "@/components/Survey";
import Navbar from "@/components/Navbar";
import { Shield, ArrowRight, ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import { supabase } from "@/integrations/supabase/client";

const FAQ_ITEMS = [
  {
    question: "Hur fungerar CompCare.se?",
    answer: "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din nuvarande eller erbjudna konsultersättning med faktiska ramavtalspriser som offentliga vårdgivare betalar till bemanningsföretag för inhyrd personal.",
  },
  {
    question: "Vilka data baseras analysen på?",
    answer: "Analysen baseras på Regionernas officiella ramavtalspriser för 2026 och bemanningsbranschens standardmarginaler.",
  },
  {
    question: "Kostar det något att använda CompCare?",
    answer: "Den grundläggande jämförelsen av din konsultersättning är helt gratis. För en detaljerad rapport med förhandlingstips kan du välja att uppgradera.",
  },
  {
    question: "Vilka yrkesgrupper stöds?",
    answer: "Just nu fokuserar vi på konsulterande sjuksköterskor, barnmorskor och läkare. Samtliga specialiseringar har unik data.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "CompCare.se",
  url: "https://compcare.se",
  description: "Jämför din konsultersättning med faktiska ramavtalspriser för vårdkonsulter i 290 kommuner.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SEK", description: "Gratis jämförelse av konsultersättning" },
};

const TRUST_LOGOS = ["290 kommuner", "21 regioner", "Officiella avtalspriser"];

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useTimeOnPage("landing");
  useEffect(() => { trackEvent("landing_viewed"); }, []);

  const devSkip = async (empType: "foretagare" | "anstalld") => {
    const testData = {
      category: "doctor", role: "Specialistläkare", specialization: "Allmänmedicin",
      yrke: "Specialistläkare allmänmedicin", region: "Stockholm", kommun: "Stockholm",
      employmentType: empType, salaryType: "hourly",
      currentSalary: empType === "foretagare" ? 500 : 400,
      commute: "none", email: "test@compcare.se",
    };
    const leadId = crypto.randomUUID();
    try {
      await supabase.from("leads").insert({
        id: leadId, email: testData.email, employment_type: testData.employmentType,
        yrke: testData.yrke, kommun: testData.kommun, salary_type: testData.salaryType,
        current_salary: testData.currentSalary,
      });
      const [reportRes, pricingRes] = await Promise.all([
        supabase.functions.invoke("create-report", {
          body: { lead_id: leadId, email: testData.email, occupation: testData.yrke, employment_type: testData.employmentType, kommun: testData.kommun, current_salary: testData.currentSalary, salary_type: testData.salaryType, track: "consultant" },
        }),
        supabase.functions.invoke("pricing-engine", {
          body: { occupation: testData.yrke, kommun: testData.kommun, employment_type: testData.employmentType },
        }),
      ]);
      sessionStorage.setItem("leadId", leadId);
      sessionStorage.setItem("surveyData", JSON.stringify(testData));
      if (reportRes.data?.report_id) sessionStorage.setItem("reportId", reportRes.data.report_id);
      if (reportRes.data?.ab_variant) sessionStorage.setItem("abVariant", reportRes.data.ab_variant);
      if (pricingRes.data && !pricingRes.data.error) sessionStorage.setItem("pricingResult", JSON.stringify(pricingRes.data));
      const couponCode = searchParams.get("coupon");
      navigate(`/resultat/${leadId}${couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : ""}`);
    } catch {
      sessionStorage.setItem("surveyData", JSON.stringify(testData));
      const couponCode = searchParams.get("coupon");
      navigate(`/resultat/${leadId}${couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : ""}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

      <Navbar />

      {/* ── Stripe-inspired Hero ── */}
      <header className="relative overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 stripe-hero-gradient opacity-90" />
        {/* Noise overlay for texture */}
        <div className="absolute inset-0 bg-background/10 backdrop-blur-[1px]" />

        <div className="relative z-10 pt-24 pb-16 sm:pt-32 sm:pb-24 px-5 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Trust line */}
            <p className="text-sm font-medium text-white/80 tracking-wide">
              Baserat på officiella ramavtalspriser · 2026
            </p>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight">
              Se om du får{" "}
              <span className="opacity-90">för lite betalt.</span>
            </h1>

            {/* Sub */}
            <p className="text-lg sm:text-xl text-white/80 max-w-lg mx-auto leading-relaxed">
              Jämför din ersättning med faktiska avtalspriser —{" "}
              på 60 sekunder.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="#survey"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-foreground font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Börja <ChevronRight className="w-4 h-4" />
              </a>
              <span className="text-sm text-white/60">Anonymt & kostnadsfritt</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Trust bar ── */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-5 py-5 flex items-center justify-center gap-8 sm:gap-12">
          {TRUST_LOGOS.map((label) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Survey section ── */}
      <main id="survey" className="px-4 py-12 sm:py-16 bg-background">
        {(import.meta.env.DEV || window.location.hostname.includes("lovableproject.com") || window.location.hostname.includes("id-preview--")) && (
          <div className="flex justify-center gap-2 mb-4">
            <button onClick={() => devSkip("foretagare")} className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition">🧪 Dev: företagare</button>
            <button onClick={() => devSkip("anstalld")} className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition">🧪 Dev: anställd</button>
          </div>
        )}
        <Survey />
      </main>

      {/* ── FAQ ── */}
      <section className="bg-card/30 border-t border-border" aria-labelledby="faq-heading">
        <div className="max-w-2xl mx-auto px-5 py-16 sm:py-20">
          <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            Vanliga frågor
          </h2>
          <dl className="space-y-8">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <dt className="text-base font-semibold text-foreground mb-1.5">{item.question}</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-background border-t border-border py-10 text-center text-sm text-muted-foreground space-y-2">
        <p>© 2026 CompCare.se · Data från offentliga ramavtal</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/vanliga-fragor" className="text-primary hover:underline text-sm">Vanliga frågor</Link>
          <span className="text-muted-foreground/50">·</span>
          <Link to="/integritetspolicy" className="text-primary hover:underline text-sm">Integritetspolicy</Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
