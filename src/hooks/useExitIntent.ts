import { useEffect, useState, useRef } from "react";

/** Default delay; can be overridden per-variant */
const DEFAULT_DELAY_MS = 12_000;

export function useExitIntent(delayMs: number = DEFAULT_DELAY_MS) {
  const [triggered, setTriggered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const ctaClickedRef = useRef(false);

  useEffect(() => {
    if (triggered) return;

    // Inactivity timer
    timerRef.current = setTimeout(() => {
      if (!ctaClickedRef.current) {
        setTriggered(true);
      }
    }, delayMs);

    // Mouse leaves viewport top (exit intent)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !ctaClickedRef.current) {
        setTriggered(true);
      }
    };

    // Track clicks on CTA buttons (data-cta attribute)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cta]")) {
        ctaClickedRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("click", handleClick, true);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("click", handleClick, true);
    };
  }, [triggered]);

  return triggered;
}
