import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/trackEvent";

/**
 * Tracks time spent on the current page.
 * Fires a "time_on_page" event with the page name and seconds when the user
 * leaves (beforeunload) or when the component unmounts (navigation).
 */
export function useTimeOnPage(pageName: string, ready = true) {
  const startTime = useRef<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!ready) return;
    startTime.current = Date.now();
    fired.current = false;

    const send = () => {
      if (fired.current || !startTime.current) return;
      fired.current = true;
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      trackEvent("time_on_page", { page: pageName, time_on_page_seconds: seconds });
    };

    window.addEventListener("beforeunload", send);
    return () => {
      window.removeEventListener("beforeunload", send);
      send(); // fires on unmount / navigation
    };
  }, [pageName, ready]);
}
