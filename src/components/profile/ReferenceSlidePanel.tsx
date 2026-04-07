import { useRef } from "react";
import { X, Send, ShieldCheck, Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReferenceDashboard from "@/components/referly/ReferenceDashboard";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReferenceSlidePanel({ open, onClose }: Props) {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!open) return null;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade-in"
        onClick={onClose}
      />

      <div
        className={`
          fixed inset-0 z-50 md:relative md:inset-auto
          md:w-[480px] md:min-w-[480px] md:z-auto
          bg-background border-l border-border
          flex flex-col
          animate-slide-in-right
        `}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Mina referenser</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
          {/* ── Section 1: Info copy ── */}
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Dina referenser — på dina villkor
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Samla dina handlingar och intyg på ett ställe. Du delar det du vill,
                med vem du vill, och kan ta tillbaka åtkomsten när du vill.
              </p>
            </div>

            {/* Varför */}
            <div>
              <h4 className="text-base font-semibold text-foreground mb-3">
                Varför använda referenstjänsten?
              </h4>
              <ul className="space-y-2">
                {[
                  "Du äger dina handlingar — inte bemanningsföretaget",
                  "Bjud in referensgivare via länk — de behöver inget konto",
                  "Tidsbegränsad delning — du återkallar åtkomst när som helst",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Så fungerar det */}
            <div>
              <h4 className="text-base font-semibold text-foreground mb-3">
                Så fungerar det
              </h4>
              <ol className="space-y-3">
                {[
                  { step: "1", icon: Send, text: "Skicka en förfrågan — bjud in en referensgivare via e-post" },
                  { step: "2", icon: Clock, text: "Referensen svarar — lämnar omdöme och kompetensbedömning" },
                  { step: "3", icon: ShieldCheck, text: "Du delar — med tidsbegränsad åtkomst direkt i ansökningsflödet" },
                ].map(({ step, icon: Icon, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {step}
                    </span>
                    <div className="flex items-start gap-2 pt-0.5">
                      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">{text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Trygghet */}
            <div>
              <h4 className="text-base font-semibold text-foreground mb-2">
                Trygghet och integritet
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dina uppgifter lagras säkert. Du bestämmer vem som ser vad.
                Alla delningar är tidsbegränsade och kan återkallas.
              </p>
            </div>

            {/* FAQ */}
            <div>
              <h4 className="text-base font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                Vanliga frågor
              </h4>
              <dl className="space-y-3">
                {[
                  { q: "Behöver referensgivaren ett konto?", a: "Nej — de svarar via en länk." },
                  { q: "Hur länge är en referens giltig?", a: "6 månader — därefter behöver den förnyas." },
                  { q: "Kan jag återkalla åtkomst?", a: "Ja, när som helst direkt från din profil." },
                ].map(({ q, a }) => (
                  <div key={q}>
                    <dt className="text-sm font-medium text-foreground">{q}</dt>
                    <dd className="text-sm text-muted-foreground mt-0.5">{a}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* CTA */}
            <Button onClick={scrollToDashboard} className="w-full gap-2">
              <Send className="w-4 h-4" />
              Starta din första referensförfrågan
            </Button>
          </section>

          {/* ── Section 2: ReferenceDashboard ── */}
          <div ref={dashboardRef}>
            <ReferenceDashboard />
          </div>
        </div>
      </div>
    </>
  );
}
