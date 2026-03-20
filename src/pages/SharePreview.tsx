import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Users, BarChart3 } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";

export default function SharePreview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const occupation = params.get("yrke") || "allmänläkare";
  const regionRate = params.get("rr") || "1 678";
  const avgRate = params.get("ar") || "1 400";

  const handleCTA = () => {
    trackEvent("share_preview_cta_clicked", { occupation });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden hero-gradient px-5 pt-8 pb-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <CompcareLogo variant="full" className="mb-6" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/40 font-medium">
            Marknadsöversikt
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground leading-tight tracking-tight">
            Hur stor är egentligen skillnaden mellan konsult och fast tjänst?
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Se hur din ersättning står sig mot marknaden
        </p>

        {/* Data cards */}
        <div className="space-y-3">
          {/* Region rate */}
          <div className="rounded-xl bg-foreground/[0.035] border border-foreground/[0.07] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                Regionens ramavtalspris för {occupation}
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight pl-11">
              {regionRate} <span className="text-base font-medium text-muted-foreground">kr/h</span>
            </p>
          </div>

          {/* Avg consultant rate */}
          <div className="rounded-xl bg-foreground/[0.035] border border-foreground/[0.07] p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                Genomsnittlig ersättning till konsult
              </span>
            </div>
            <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight pl-11">
              {avgRate} <span className="text-base font-medium text-muted-foreground">kr/h</span>
            </p>
          </div>
        </div>

        {/* Insight badge */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/[0.06] border border-accent/20">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-accent" />
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">
            <span className="font-semibold text-foreground">40 %</span> av konsulter har utrymme att förhandla.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground text-center">
            Se utförlig rapport och gör en egen analys kostnadsfritt.
          </p>
          <Button
            onClick={handleCTA}
            className="w-full h-14 text-base rounded-xl gap-2"
          >
            Gör din egen analys
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center space-y-3 pb-8">
          <CompcareLogo variant="wordmark" className="mx-auto opacity-40 !h-5" />
          <p className="text-[10px] text-muted-foreground/40">
            © {new Date().getFullYear()} CompCare.se
          </p>
        </div>
      </main>
    </div>
  );
}
