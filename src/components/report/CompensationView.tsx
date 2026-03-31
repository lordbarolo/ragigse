import { FileText, Zap, MessageSquare, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CompensationData {
  role: string;
  zone: string;
  location: string;
  invoiceRate: number;
  contractLabel: string;
  salaryRange: { hourlyMin: number; hourlyMax: number };
  hoursPerMonth?: number;
}

const defaultData: CompensationData = {
  role: "Specialistsjuksköterska – Ambulans",
  zone: "Zon 2",
  location: "Borlänge",
  invoiceRate: 770,
  contractLabel: "SKR ramavtal 2026 v1.0",
  salaryRange: { hourlyMin: 445, hourlyMax: 471 },
  hoursPerMonth: 167,
};

const tips = [
  {
    icon: Zap,
    title: "Hänvisa till Zon 2-priset (770 kr)",
    detail:
      "Regionens ramavtalspris är offentlig information. Genom att referera till det visar du att du har koll på marknadsvärdet och att din begäran är förankrad i avtalets prisbild.",
  },
  {
    icon: MessageSquare,
    title: "Kräv lön inom rekommenderat intervall",
    detail:
      "Intervallet baseras på ramavtalets kundpris minus normala marginaler. En lön under detta intervall innebär att bemanningsföretaget tar en oproportionerligt stor marginal.",
  },
  {
    icon: Shield,
    title: "Lyft fram din specialistkod för ambulans",
    detail:
      "Ambulansspecialister har en egen yrkeskategori i ramavtalet med högre prissättning. Säkerställ att du faktiskt prissätts i rätt kategori – det höjer ditt förhandlingsgolv.",
  },
];

export default function CompensationView({
  data = defaultData,
}: {
  data?: CompensationData;
}) {
  const monthlyMin = data.salaryRange.hourlyMin * (data.hoursPerMonth ?? 167);
  const monthlyMax = data.salaryRange.hourlyMax * (data.hoursPerMonth ?? 167);

  const fmt = (n: number) =>
    n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 py-2">
      {/* ── Hero card ──────────────────────────────────── */}
      <Card className="relative overflow-hidden bg-[hsl(var(--hero-bg))] text-[hsl(var(--hero-fg))] border-0 p-5">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-primary/10 -translate-y-1/2 translate-x-1/2" />
        <p className="text-xs font-medium tracking-wide uppercase opacity-70 mb-1">
          {data.zone} · {data.location}
        </p>
        <h2 className="font-display text-lg font-bold leading-snug mb-4">
          {data.role}
        </h2>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            {fmt(data.invoiceRate)} kr
          </span>
          <span className="text-sm opacity-60">/tim</span>
        </div>
        <p className="text-[11px] opacity-50 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {data.contractLabel}
        </p>
      </Card>

      {/* ── Salary range card ──────────────────────────── */}
      <Card className="p-5 border border-border bg-card">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Ditt rekommenderade lönespann
        </h3>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Timlön</span>
            <span className="font-display text-lg font-bold text-foreground">
              {fmt(data.salaryRange.hourlyMin)} – {fmt(data.salaryRange.hourlyMax)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                kr/tim
              </span>
            </span>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Månadslön</span>
            <span className="font-display text-lg font-bold text-foreground">
              {fmt(monthlyMin)} – {fmt(monthlyMax)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                kr/mån
              </span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 opacity-60">
          Baserat på {data.hoursPerMonth ?? 167} arbetstimmar
        </p>
      </Card>

      {/* ── Negotiation tips ───────────────────────────── */}
      <Card className="p-4 border border-border bg-card">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Förhandlingstips
        </h3>

        <Accordion type="single" collapsible className="w-full">
          {tips.map((tip, i) => (
            <AccordionItem key={i} value={`tip-${i}`} className="border-border/50">
              <AccordionTrigger className="py-3 hover:no-underline gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <tip.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground leading-snug">
                    {tip.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-10 pb-3 leading-relaxed">
                {tip.detail}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
