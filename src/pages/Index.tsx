import Calculator from "@/components/Calculator";
import { Shield, TrendingUp, FileCheck } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="hero-gradient py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl text-primary-foreground leading-tight">
            Får du den lön du förtjänar?
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/85 font-body max-w-2xl mx-auto">
            75% av sjuksköterskor är underbetalda. Jämför ditt erbjudande med faktiska ramavtalspriser — gratis.
          </p>
        </div>
      </header>

      {/* Trust badges */}
      <section className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Baserat på officiella ramavtal</span>
          <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" /> 290 kommuner</span>
          <span className="flex items-center gap-2"><FileCheck className="w-4 h-4 text-accent" /> Uppdaterat 2026</span>
        </div>
      </section>

      {/* Calculator */}
      <main className="px-4 py-12">
        <Calculator />
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 LönKoll · Data från offentliga ramavtal</p>
      </footer>
    </div>
  );
};

export default Index;
