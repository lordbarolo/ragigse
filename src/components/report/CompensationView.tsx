import { useEffect, useState } from "react";
import { FileText, Zap, MessageSquare, Shield, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { calculateSalaryRange } from "@/lib/calc";
import type { EmploymentType } from "@/lib/calc";
import PriceRangeGuard from "@/components/PriceRangeGuard";


interface CompensationViewProps {
  role: string | null;
  location: string | null;
  employmentType?: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export default function CompensationView({ role, location, employmentType }: CompensationViewProps) {
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<string | null>(null);
  const [invoiceRate, setInvoiceRate] = useState<number | null>(null);
  const [salaryRange, setSalaryRange] = useState<{ hourlyMin: number; hourlyMax: number } | null>(null);
  const [contractLabel, setContractLabel] = useState("SKR ramavtal 2026");

  useEffect(() => {
    if (!role || !location) { setLoading(false); return; }

    const fetchData = async () => {
      // 1. Look up zone from location
      const { data: loc } = await supabase
        .from("locations")
        .select("zon")
        .eq("kommun", location)
        .limit(1)
        .maybeSingle();

      const zon = loc?.zon || "Zon 1";
      setZone(zon);

      // 2. Look up invoice rate for role + zone
      const { data: rate } = await supabase
        .from("rates")
        .select("timpris_kund")
        .eq("yrkeskategori", role)
        .eq("zon", zon)
        .limit(1)
        .maybeSingle();

      if (rate) {
        setInvoiceRate(rate.timpris_kund);

        // 3. Calculate salary range
        const empType: EmploymentType = employmentType === "foretagare" ? "foretagare" : "anstalld";
        const range = calculateSalaryRange(rate.timpris_kund, empType);
        setSalaryRange({ hourlyMin: range.hourly_min, hourlyMax: range.hourly_max });
      }

      // 4. Try to get contract label matching the user's role
      const { data: cvr } = await supabase
        .from("contract_version_rates")
        .select("version_id")
        .eq("yrkeskategori", role)
        .limit(1)
        .maybeSingle();

      if (cvr?.version_id) {
        const { data: cv } = await supabase
          .from("contract_versions")
          .select("version_label, catalog_name")
          .eq("id", cvr.version_id)
          .maybeSingle();
        if (cv?.version_label) setContractLabel(`${cv.catalog_name || "SKR ramavtal"} ${cv.version_label}`);
      }

      setLoading(false);
    };

    fetchData();
  }, [role, location, employmentType]);

  if (!role || !location) return null;
  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }
  if (!invoiceRate || !salaryRange) return null;

  const hoursPerMonth = 167;
  const monthlyMin = salaryRange.hourlyMin * hoursPerMonth;
  const monthlyMax = salaryRange.hourlyMax * hoursPerMonth;

  const tips = [
    {
      icon: Zap,
      title: `Hänvisa till ${zone}-priset (${fmt(invoiceRate)} kr)`,
      detail:
        "Regionens ramavtalspris är offentlig information. Genom att referera till det visar du att du har koll på marknadsvärdet och att din begäran är förankrad i avtalets prisbild.",
    },
    {
      icon: MessageSquare,
      title: "Har du arbetat på samma ställe tidigare?",
      detail:
        "Använd det i förhandlingen. Det behövs ingen intro och risken för avbokning är mindre när kunden vet vem som kommer.",
    },
    {
      icon: Shield,
      title: "Bor du nära arbetsorten?",
      detail:
        "Utan kostnader för resa och boende har uppdragsgivaren mer utrymme till timlönen.",
    },
  ];

  const empType: EmploymentType = employmentType === "foretagare" ? "foretagare" : "anstalld";

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── Hero card (guarded mot pricing-invariant) ──── */}
      <PriceRangeGuard
        surface="report.compensation"
        role={role}
        timpris_kund={invoiceRate}
        employmentType={empType}
        hourly_min={salaryRange.hourlyMin}
        hourly_max={salaryRange.hourlyMax}
      >
        {() => (
          <Card className="relative overflow-hidden border-0 p-5 text-white bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]">
            {/* Purple spotlight overlay — matches ProfileHero */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 75% 30%, rgba(110,95,230,0.55) 0%, rgba(90,78,210,0.25) 25%, rgba(70,60,190,0.08) 50%, transparent 70%)",
              }}
            />
            <div className="relative">
              <p className="text-xs font-medium tracking-wide uppercase opacity-70 mb-1">
                {zone} · {location}
              </p>
              <h2 className="font-display text-lg font-bold leading-snug mb-4">
                {role}
              </h2>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm opacity-70">Timlön</span>
                  <span className="font-display text-lg font-bold">
                    {fmt(salaryRange.hourlyMin)} – {fmt(salaryRange.hourlyMax)}{" "}
                    <span className="text-sm font-normal opacity-60">kr/tim</span>
                  </span>
                </div>

                <div className="h-px bg-white/15" />

                <div className="flex items-baseline justify-between">
                  <span className="text-sm opacity-70">Månadslön</span>
                  <span className="font-display text-lg font-bold">
                    {fmt(monthlyMin)} – {fmt(monthlyMax)}{" "}
                    <span className="text-sm font-normal opacity-60">kr/mån</span>
                  </span>
                </div>
              </div>

              <p className="text-[11px] opacity-50 mt-3 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {contractLabel}
              </p>
            </div>
          </Card>
        )}
      </PriceRangeGuard>

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
