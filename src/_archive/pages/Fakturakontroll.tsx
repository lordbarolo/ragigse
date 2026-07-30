import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle, TrendingUp, Sparkles } from "lucide-react";
import InvoiceUploadForm from "@/components/invoice/InvoiceUploadForm";
import InvoiceEmailDrafter from "@/components/ai/InvoiceEmailDrafter";
import { Button } from "@/components/ui/button";
import LandingFooter from "@/components/landing/LandingFooter";
import { trackEvent } from "@/lib/trackEvent";
import { SEO } from "@/components/SEO";


const STEPS = [
  { num: "1", title: "Skapa ditt konto", desc: "Logga in och ange din roll.\nFå tillgång till verktyg och insikter." },
  { num: "2", title: "Ladda upp dina dokument", desc: "Fakturor, tidrapporter, intyg och cv. Allt struktureras automatiskt." },
  { num: "3", title: "Få insikt och agera", desc: "Ersättningsanalys, missad fakturering, förhandlingsstöd — direkt." },
  { num: "4", title: "Dela på dina villkor", desc: "Skicka en länk när du är redo. Aldrig mer bifogade dokument." },
];

const MOCK_INVOICES = [
  { id: "#3", fakturerat: "42 h", arbetat: "42 h", diff: null, belopp: null, status: "ok" },
  { id: "#4", fakturerat: "36 h", arbetat: "42 h", diff: "−6 h", belopp: "−6 900 kr", status: "avvikelse", highlight: true },
  { id: "#5", fakturerat: "38 h", arbetat: "38 h", diff: null, belopp: null, status: "ok" },
  { id: "#6", fakturerat: "40 h", arbetat: "43,5 h", diff: "−3,5 h", belopp: "−4 025 kr", status: "avvikelse", highlight: true },
  { id: "#7", fakturerat: "44 h", arbetat: "44 h", diff: null, belopp: null, status: "ok" },
];

export default function Fakturakontroll() {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("fakturakontroll_page_viewed");
    trackEvent("product_page_viewed", { product: "fakturakontroll" });
  }, []);

  return (
    <div className="flex flex-col text-foreground">
      <SEO
        title="Fakturakontroll för vårdkonsulter | CompCare"
        description="Vi granskar dina fakturor och tidrapporter från senaste två åren. Vid avvikelser hjälper vi dig fakturera om. 25% + moms endast om vi hittar pengar."
        path="/consultant/fakturakontroll"
        ogType="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Fakturagranskning för vårdkonsulter",
          provider: { "@type": "Organization", name: "CompCare", url: "https://www.compcare.se" },
          areaServed: "SE",
          description: "Granskning av fakturor och tidrapporter mot ramavtal. No cure — no pay: 25% + moms endast av återkrävt belopp.",
          offers: { "@type": "Offer", priceCurrency: "SEK", priceSpecification: { "@type": "PriceSpecification", description: "25% + moms av återkrävt belopp. Inget återkrävt — ingen kostnad." } },
        }}
      />
      {/* Hero — Value prop */}

      <section className="px-6 pt-12 pb-4 md:pt-20 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Fakturagranskning - Få betalt för all din tid</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Har du fakturerat för alla timmar du jobbat?
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-xl whitespace-pre-line">
            Det är lätt att räkna fel på beredskapstimmar eller storhelgstillägg.{"\n"}
            Vi analyserar dina fakturor och tidrapporter från de senaste två åren. Vid avvikelser hjälper vi dig med nya fakturor och säkerställer att du får betalt.{"\n"}
            Hittar vi inget, betalar du inget.
          </p>
        </div>
      </section>

      {/* Mock invoice table */}
      <section className="px-6 pt-8 pb-12 md:pt-12 md:pb-16">
        <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Filter tabs */}
              <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border text-[11px] font-medium">
                <span className="bg-foreground text-background rounded px-2 py-0.5">Alla</span>
                <span className="text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />Ej granskade</span>
                <span className="text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Avvikelser</span>
                <span className="text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Godkända</span>
                <span className="text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Fakturerade</span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[32px_60px_1fr_1fr_80px_90px_90px] gap-0 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                <span />
                <span>Faktura</span>
                <span>Fakturerat</span>
                <span>Arbetat</span>
                <span>Diff</span>
                <span>Belopp</span>
                <span>Status</span>
              </div>

              {/* Rows */}
              {MOCK_INVOICES.map((inv) => (
                <div
                  key={inv.id}
                  className={`grid grid-cols-[32px_60px_1fr_1fr_80px_90px_90px] gap-0 px-4 py-2.5 text-xs border-b border-border/50 items-center ${inv.highlight ? "bg-primary/[0.03]" : ""}`}
                >
                  <span className="flex items-center">
                    <div className={`w-3.5 h-3.5 rounded border ${inv.highlight ? "bg-primary border-primary" : "border-border"}`} />
                  </span>
                  <span className="text-primary font-medium">{inv.id}</span>
                  <span>{inv.fakturerat}</span>
                  <span>{inv.arbetat}</span>
                  <span className={inv.diff ? "text-red-500 font-medium" : "text-muted-foreground"}>
                    {inv.diff ?? "—"}
                  </span>
                  <span className={inv.belopp ? "text-red-500 font-medium" : "text-muted-foreground"}>
                    {inv.belopp ?? "—"}
                  </span>
                  <span>
                    {inv.status === "ok" ? (
                      <span className="text-green-600 font-medium text-[11px]">✓ OK</span>
                    ) : (
                      <span className="text-red-500 font-medium text-[11px]">! Avvikelse</span>
                    )}
                  </span>
                </div>
              ))}

              {/* Summary row */}
              <div className="px-4 py-3 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  Hittade <strong className="text-foreground">9,5 h</strong> som ger
                </span>
                <span className="font-bold text-foreground text-sm">+10 925 kr</span>
              </div>
            </div>

            {/* CTA button */}
            <Button
              size="default"
              className="text-sm py-3 px-6 font-semibold mt-6"
              onClick={() => {
                trackEvent("product_cta_clicked", { product: "fakturakontroll" });
                navigate("/consultant/fakturakontroll/ny");
              }}
            >
              Skapa konto
            </Button>
          </div>
      </section>

      {/* Steps */}
      <section className="px-6 pt-8 pb-12 md:pt-12 md:pb-16 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Så funkar det</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-12">
            Fyra steg till full kontroll
          </h2>

          {/* Step circles + line */}
          <div className="relative flex items-start justify-between">
            {/* connecting line */}
            <div className="absolute top-6 left-[calc(12.5%)] right-[calc(12.5%)] h-px bg-border" />
            {STEPS.map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center w-1/4 px-2">
                <div className="w-12 h-12 rounded-full bg-card border-2 border-border flex items-center justify-center font-display font-bold text-lg text-foreground mb-3 z-10">
                  {step.num}
                </div>
                <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-snug whitespace-pre-line">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing / trust */}
      <section className="px-6 py-16 md:py-24 bg-card border-y border-border">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <TrendingUp className="w-8 h-8 text-primary mx-auto" />
           <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Du betalar endast vid resultat
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
            Du betalar endast om vi hittar avvikelser som leder till att du kan tilläggsfakturera kunden. I dessa fall utgår en provision till CompCare med 25% av beloppet som du erhåller.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {["Ingen startkostnad", "Ingen bindningstid", "Du tjänar alltid på resultatet"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Invoice → Email demo */}
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Nyhet — AI-utkast</p>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Från avvikelse till mejl — på 10 sekunder
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            När vi hittat en avvikelse hjälper AI dig att formulera ett professionellt mejl till bemanningsbolaget.
            Du granskar, redigerar och skickar själv från din egen mejl.
          </p>
          <InvoiceEmailDrafter
            findings={[
              { invoiceRef: "#4", workedHours: 42, invoicedHours: 36, diffHours: -6, diffAmountSek: 6900, type: "ob_missing", description: "OB-tillägg saknas på 6 timmar storhelg" },
              { invoiceRef: "#6", workedHours: 43.5, invoicedHours: 40, diffHours: -3.5, diffAmountSek: 4025, type: "weekend_missing", description: "Helgtillägg saknas på 3,5 timmar" },
            ]}
            totalRecoverable={10925}
            consultantName="Demo Konsult"
            agencyName="Bemanningsbolag AB"
          />
        </div>
      </section>

      {/* Upload section */}
      <section id="upload" className="px-6 py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Intresserad av en fakturagranskning?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg">
            Fyll i formuläret så kontaktar vi dig inom 48 timmar för att diskutera hur vi kan hjälpa dig.
          </p>
          <InvoiceUploadForm />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto rounded-3xl border border-primary/20 bg-primary/[0.04] p-8 md:p-12 text-center space-y-5">
          <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Redo att se om du fakturerar rätt?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            Starta din kostnadsfria granskning idag. Vi kontaktar dig inom 48 timmar med resultatet.
          </p>
          <Button
            size="default"
            className="text-sm px-6 py-3 font-semibold"
            onClick={() => {
              trackEvent("product_cta_clicked", { product: "fakturakontroll" });
              navigate("/consultant/fakturakontroll/ny");
            }}
          >
            Jag vill veta mer →
          </Button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
