import { useState, useEffect } from "react";
import { getConsent, setConsent } from "@/lib/cookieConsent";
import { Link } from "@/lib/router-compat";
import { applyAnalyticsConsent } from "@/lib/posthog";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent === "accepted") return;
    if (consent === "rejected") return;

    // No consent yet — delay banner until scroll/time/interaction
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setVisible(true);
      cleanup();
    };

    const timer = setTimeout(show, 10000);

    const onScroll = () => { if (window.scrollY > 50) show(); };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.("button")) show();
    };
    document.addEventListener("click", onClick, true);

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
    };

    return cleanup;
  }, []);

  const handleAccept = () => {
    setConsent("accepted");
    applyAnalyticsConsent(true);
    setVisible(false);
  };

  const handleReject = () => {
    setConsent("rejected");
    applyAnalyticsConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] safe-area-bottom animate-in slide-in-from-bottom-4 duration-400">
      <div className="mx-3 mb-3 rounded-2xl border border-border bg-card shadow-2xl p-4 sm:p-5 max-w-lg sm:mx-auto">
        <p className="text-sm text-foreground leading-relaxed mb-3">
          Vi använder cookies för att förbättra din upplevelse och analysera 
          hur tjänsten används.{" "}
          <Link
            to="/integritetspolicy"
            className="text-primary hover:underline font-medium"
          >
            Läs mer
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-muted-foreground border border-border hover:border-foreground/20 hover:text-foreground transition-all active:scale-[0.98]"
          >
            Avvisa
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
          >
            Acceptera
          </button>
        </div>
      </div>
    </div>
  );
}
