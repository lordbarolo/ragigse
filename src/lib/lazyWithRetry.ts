import { ComponentType, lazy } from "react";

/**
 * Wrap React.lazy with one-time auto-reload on chunk load failures.
 *
 * Why: When we deploy a new build, users with the previous index.html cached
 * still reference old chunk hashes (e.g. /assets/Login-abc123.js). When they
 * navigate to a lazy route, the import fails with "Importing a module script
 * failed" / ChunkLoadError, the ErrorBoundary catches it, and the user sees
 * "Något gick fel" — and trackEvent never fires (so PostHog/analytics_events
 * go silent even though traffic exists).
 *
 * Fix: catch the import error once, mark a sessionStorage flag, and reload the
 * page. The reload pulls the fresh index.html which references the new chunks.
 * If it fails a second time it's a real error — let the ErrorBoundary handle it.
 */
const RELOAD_KEY = "lovable:chunk-retry";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Successful load — clear retry flag so future failures can retry once again.
      try { window.sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
      return mod;
    } catch (err) {
      const message = (err as Error)?.message ?? "";
      const isChunkError =
        message.includes("Importing a module script failed") ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("error loading dynamically imported module") ||
        (err as Error)?.name === "ChunkLoadError";

      if (!isChunkError) throw err;

      let alreadyTried = false;
      try {
        alreadyTried = window.sessionStorage.getItem(RELOAD_KEY) === "1";
        if (!alreadyTried) {
          window.sessionStorage.setItem(RELOAD_KEY, "1");
        }
      } catch { /* sessionStorage unavailable — fall through */ }

      if (!alreadyTried) {
        // Hard reload to pick up the fresh index.html and chunk hashes.
        window.location.reload();
        // Return a never-resolving promise so React keeps showing the
        // Suspense fallback while the reload happens.
        return new Promise<{ default: T }>(() => {});
      }

      throw err;
    }
  });
}
