import { useEffect, useState, useRef } from "react";

/** Time in ms before the exit-intent section appears if no CTA click. Easy to change. */
const EXIT_INTENT_DELAY_MS = 15_000;

export function useExitIntent() {
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
    }, EXIT_INTENT_DELAY_MS);

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
