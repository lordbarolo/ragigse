import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users, Building2, Clock, Bell, Landmark } from "lucide-react";
import { useState } from "react";
import type { ScoreBreakdown } from "@/types/referly";

interface TrustScoreCardProps {
  total: number;
  tier: string;
  breakdown: ScoreBreakdown;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  elite: { label: "ELITE", color: "hsl(var(--primary))", bgClass: "bg-primary/10", textClass: "text-primary" },
  verified_pro: { label: "VERIFIED PRO", color: "hsl(217, 91%, 60%)", bgClass: "bg-blue-500/10", textClass: "text-blue-600" },
  basic: { label: "BASIC", color: "hsl(38, 92%, 50%)", bgClass: "bg-yellow-500/10", textClass: "text-yellow-600" },
  incomplete: { label: "OFULLSTÄNDIG", color: "hsl(var(--muted-foreground))", bgClass: "bg-muted", textClass: "text-muted-foreground" },
};

const NEXT_TIER: Record<string, { name: string; threshold: number }> = {
  incomplete: { name: "Basic", threshold: 50 },
  basic: { name: "Verified Pro", threshold: 70 },
  verified_pro: { name: "Elite", threshold: 90 },
  elite: { name: "Elite", threshold: 100 },
};

const CATEGORIES = [
  { key: "role" as const, label: "Chefsreferenser", icon: Users, details: (b: ScoreBreakdown) => `${b.role.chiefs} chefer, ${b.role.colleagues} kollegor` },
  { key: "domain" as const, label: "Domänverifiering", icon: Building2, details: (b: ScoreBreakdown) => `${b.domain.verified_count} verifierade domäner` },
  { key: "recency" as const, label: "Aktualitet", icon: Clock, details: (b: ScoreBreakdown) => b.recency.freshest_months < 999 ? `Färskaste: ${Math.round(b.recency.freshest_months)} mån sedan` : "Inga aktiva referenser" },
  { key: "ping" as const, label: "Ping-bekräftelse", icon: Bell, details: (b: ScoreBreakdown) => b.ping.has_active_ping ? "Aktiv ping-bekräftelse" : "Ingen aktiv ping" },
  { key: "compliance" as const, label: "Myndighetskontroll", icon: Landmark, details: () => "IVO & HOSP" },
];

export function TrustScoreCard({ total, tier, breakdown }: TrustScoreCardProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.incomplete;
  const next = NEXT_TIER[tier] ?? NEXT_TIER.incomplete;
  const pointsToNext = Math.max(0, next.threshold - total);

  const quickwins = CATEGORIES
    .map((c) => ({ ...c, potential: breakdown[c.key].max - breakdown[c.key].earned }))
    .filter((c) => c.potential > 0)
    .sort((a, b) => b.potential - a.potential)
    .slice(0, 3);

  return (
    <div className="space-y-3">
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={config.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(total / 100) * 327} 327`} className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground">Trust Score</h3>
              <Badge className={`mt-1 ${config.bgClass} ${config.textClass} border-0 rounded-md text-xs`}>{config.label}</Badge>
              {tier !== "elite" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {pointsToNext}p kvar till <span className="font-medium text-foreground">{next.name}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-3 space-y-0.5">
          {CATEGORIES.map((cat) => {
            const data = breakdown[cat.key];
            return <BreakdownRow key={cat.key} icon={<cat.icon className="h-3.5 w-3.5" />} label={cat.label} earned={data.earned} max={data.max} detail={cat.details(breakdown)} />;
          })}
        </CardContent>
      </Card>

      {quickwins.length > 0 && tier !== "elite" && (
        <Card className="border-0 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-2">VÄG TILL {next.name.toUpperCase()}</p>
            <div className="space-y-1">
              {quickwins.map((q) => (
                <div key={q.key} className="flex items-center gap-2 text-xs">
                  <q.icon className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">{q.label}</span>
                  <span className="ml-auto font-medium text-primary">+{q.potential}p</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BreakdownRow({ icon, label, earned, max, detail }: { icon: React.ReactNode; label: string; earned: number; max: number; detail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2.5 rounded-md p-2 hover:bg-muted/50 transition-colors">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-foreground flex-1 text-left">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{earned}/{max}</span>
        <Progress value={(earned / max) * 100} className="w-16 h-1.5" />
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="pl-8 pb-2 text-[11px] text-muted-foreground">{detail}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
