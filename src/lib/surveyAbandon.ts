/**
 * Survey abandonment watcher.
 *
 * Starts a 60s inactivity timer scoped to the current step. Any pointer/key
 * activity inside the survey root resets it. If the timer fires, a single
 * `survey_abandoned` event is sent with the step the user got stuck on.
 *
 * Returns a cleanup function — call it when the step changes or the survey
 * unmounts. Idempotent: only ever fires once per watcher instance.
 */
import { trackEvent } from "@/lib/trackEvent";

export interface AbandonWatcherOpts {
  step: number;
  stepName: string;
  surface?: string;
  timeoutMs?: number;
}

export function startAbandonWatcher(opts: AbandonWatcherOpts): () => void {
  if (typeof window === "undefined") return () => undefined;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const enteredAt = Date.now();
  let fired = false;
  let timer: number | undefined;

  const fire = () => {
    if (fired) return;
    fired = true;
    trackEvent("survey_abandoned", {
      step_number: opts.step,
      step_name: opts.stepName,
      surface: opts.surface ?? null,
      idle_ms: timeoutMs,
      time_on_step_ms: Date.now() - enteredAt,
    });
  };

  const reset = () => {
    if (fired) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(fire, timeoutMs);
  };

  const events: Array<keyof DocumentEventMap> = [
    "pointerdown",
    "keydown",
    "wheel",
    "touchstart",
  ];
  events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
  reset();

  return () => {
    if (timer) window.clearTimeout(timer);
    events.forEach((e) => document.removeEventListener(e, reset));
  };
}
