import { useState } from "react";

export default function Compare() {
  const [reportId] = useState(() => sessionStorage.getItem("reportId") || "");
  const [leadId] = useState(() => sessionStorage.getItem("leadId") || "");

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-muted border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="font-display text-lg text-foreground">A/B Jämförelse</h1>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Variant A — Teaser
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            Variant B — Rapport
          </span>
        </div>
      </header>
      <div className="flex-1 flex">
        <div className="w-1/2 border-r border-border relative">
          <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
            A — Teaser (/resultat/:leadId)
          </div>
          <iframe
            src={leadId ? `/resultat/${leadId}` : "/"}
            className="w-full h-full border-0"
            title="Variant A – Teaser"
          />
        </div>
        <div className="w-1/2 relative">
          <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded">
            B — Rapport (/rapport)
          </div>
          <iframe
            src={reportId ? `/rapport/${reportId}` : "/"}
            className="w-full h-full border-0"
            title="Variant B – Rapport"
          />
        </div>
      </div>
    </div>
  );
}
