import { useEffect } from "react";
import Navbar from "@/components/Navbar";

interface Props {
  kommun: string;
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "DataFeed",
  "name": "CompCare Marknadsanalys för Sjukvårdspersonal",
  "description": "Verifierad analys av ersättningsnivåer baserat på SKR:s ramavtal 2026 och officiell lönestatistik.",
  "provider": {
    "@type": "Organization",
    "name": "CompCare",
    "url": "https://compcare.se"
  },
  "spatialCoverage": "Sweden",
  "variableMeasured": [
    "Timpris enligt ramavtal",
    "Marknadsmässig löneposition",
    "Bemanningsmarginaler"
  ],
  "isAccessibleForFree": "false",
  "hasPart": {
    "@type": "WebPageElement",
    "isAccessibleForFree": "true",
    "cssSelector": ".teaser-preview",
    "description": "Publik förhandsgranskning av lönestatistik och avtalspriser."
  }
};

export default function TeaserHeader({ kommun }: Props) {
  useEffect(() => {
    const id = "compcare-teaser-jsonld";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(JSON_LD);
      document.head.appendChild(script);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <>
      <Navbar />
      <header className="pt-24 pb-10 px-5 text-center border-b border-border bg-background">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
            Din marknadsanalys är klar
          </h1>
           <p className="text-body mt-2">
             Vi har jämfört din ersättning med marknadsdata i {kommun}
           </p>
        </div>
      </header>
    </>
  );
}