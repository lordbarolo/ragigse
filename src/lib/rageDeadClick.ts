/**
 * Lightweight rage-click + dead-click detector.
 *
 * Rage click: ≥3 clicks within 800ms inside a 50px radius.
 * Dead click: a click on a non-interactive element that doesn't change the URL
 *             OR mutate the DOM within 2.5s (suggests the user expected
 *             something to happen but nothing did).
 *
 * Both events route through our normal `trackEvent` allowlist (no PostHog
 * autocapture needed) so we stay consent-gated and GDPR-clean.
 */
import { trackEvent } from "@/lib/trackEvent";

const RAGE_WINDOW_MS = 800;
const RAGE_RADIUS_PX = 50;
const RAGE_THRESHOLD = 3;
const DEAD_TIMEOUT_MS = 2500;

type ClickSample = { t: number; x: number; y: number };

function selectorFor(el: Element | null): string {
  if (!el || !(el instanceof Element)) return "unknown";
  const id = el.id ? `#${el.id}` : "";
  const cls = (el.className && typeof el.className === "string")
    ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
    : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 120);
}

function isInteractive(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (["a", "button", "input", "textarea", "select", "label", "summary"].includes(tag)) return true;
  if (el.closest("a, button, [role='button'], [role='link'], input, textarea, select, label, [onclick]")) return true;
  return false;
}

let started = false;

export function initRageDeadClickTracking() {
  if (started || typeof window === "undefined") return;
  started = true;

  const recent: ClickSample[] = [];
  let lastRageFiredAt = 0;

  document.addEventListener(
    "click",
    (ev) => {
      const t = Date.now();
      const target = ev.target as Element | null;
      const sample: ClickSample = { t, x: ev.clientX, y: ev.clientY };
      recent.push(sample);
      // Drop samples outside window
      while (recent.length && t - recent[0].t > RAGE_WINDOW_MS) recent.shift();

      // ── Rage click detection ──
      if (recent.length >= RAGE_THRESHOLD) {
        const inRadius = recent.every(
          (s) => Math.hypot(s.x - sample.x, s.y - sample.y) <= RAGE_RADIUS_PX,
        );
        if (inRadius && t - lastRageFiredAt > 1500) {
          lastRageFiredAt = t;
          trackEvent("rage_click", {
            selector: selectorFor(target),
            path: window.location.pathname,
            count: recent.length,
          });
        }
      }

      // ── Dead click detection ──
      // Skip if target is clearly interactive — those are expected to do work.
      if (isInteractive(target)) return;

      const urlBefore = window.location.href;
      const docHtmlBefore = document.body.innerHTML.length;
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });

      const timer = window.setTimeout(() => {
        observer.disconnect();
        const urlChanged = window.location.href !== urlBefore;
        const domChanged = Math.abs(document.body.innerHTML.length - docHtmlBefore) > 50;
        if (!urlChanged && !domChanged) {
          trackEvent("dead_click", {
            selector: selectorFor(target),
            path: window.location.pathname,
          });
        }
      }, DEAD_TIMEOUT_MS);
    },
    { passive: true, capture: true },
  );
}
