import { Link } from "react-router-dom";
import BugReportButton from "@/components/BugReportButton";
import CompcareLogo from "@/components/CompcareLogo";
import { trackCta } from "@/lib/trackCta";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-8 px-6 md:px-10 flex items-center justify-between flex-wrap gap-4 bg-card">
      <CompcareLogo variant="wordmark" />
      <div className="flex gap-5 flex-wrap">
        <Link
          to="/vanliga-fragor"
          onClick={() => trackCta("landing_footer", "Om CompCare", "/vanliga-fragor")}
          className="text-sm md:text-[13px] text-muted-foreground no-underline hover:text-foreground transition-colors"
        >
          Om CompCare
        </Link>
        <Link
          to="/vanliga-fragor"
          onClick={() => trackCta("landing_footer", "Datakällor", "/vanliga-fragor")}
          className="text-sm md:text-[13px] text-muted-foreground no-underline hover:text-foreground transition-colors"
        >
          Datakällor
        </Link>
        <Link
          to="/integritetspolicy"
          onClick={() => trackCta("landing_footer", "Integritetspolicy", "/integritetspolicy")}
          className="text-sm md:text-[13px] text-muted-foreground no-underline hover:text-foreground transition-colors"
        >
          Integritetspolicy
        </Link>
        <BugReportButton />
      </div>
      <span className="text-xs md:text-[11px] text-foreground/15">© 2026 Compcare</span>
    </footer>
  );
}
