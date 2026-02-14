import { useEffect } from "react";
import Survey from "@/components/Survey";
import { Shield, TrendingUp, FileCheck } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const Index = () => {
  useEffect(() => { trackEvent("landing_viewed"); }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="hero-gradient py-10 px-5 text-center sm:py-16">
        <div className="max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-primary-foreground leading-tight">
            Får du den lön du förtjänar?
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/85 font-body max-w-2xl mx-auto">
            75% av sjuksköterskor är underbetalda. Jämför ditt erbjudande med faktiska ramavtalspriser — gratis.
          </p>
        </div>
      </header>

      {/* Trust badges */}
      <section className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-5 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Baserat på officiella ramavtal</span>
          <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" /> 290 kommuner</span>
          <span className="flex items-center gap-2"><FileCheck className="w-4 h-4 text-accent" /> Uppdaterat 2026</span>
        </div>
      </section>

      {/* Survey */}
      <main className="px-4 py-8 sm:py-12">
        <Survey />
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 LönKoll · Data från offentliga ramavtal</p>
      </footer>
    </div>
  );
};

export default Index;
