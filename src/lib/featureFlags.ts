/**
 * Feature flag helper.
 *
 * Marketplace and other in-development features are gated by TWO independent flags:
 *   1. Build-time:   `VITE_FEATURE_<NAME>` (env var, defaults to OFF)
 *   2. Runtime:      `app_settings.<key>`  (DB row, defaults to OFF)
 *
 * BOTH must be true for a feature to be visible in production.
 *
 * This dual-gate means:
 *   - Toggling the env var alone never exposes the feature in prod (DB still OFF).
 *   - Flipping the DB flag alone never exposes the feature without a deploy that ships the code.
 *   - Either flag set to false instantly hides the feature.
 *
 * See `mem://constraints/marketplace-isolation.md` for the full isolation rule.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagKey = "marketplace_enabled";

/** Build-time flag (env). Returns true only if the env var is the literal string "true". */
function buildTimeEnabled(key: FeatureFlagKey): boolean {
  switch (key) {
    case "marketplace_enabled":
      return import.meta.env.VITE_FEATURE_MARKETPLACE === "true";
    default:
      return false;
  }
}

/** Runtime flag (DB). Reads via `get_feature_flag` RPC. */
async function runtimeEnabled(key: FeatureFlagKey): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("get_feature_flag", { _key: key });
    if (error) return false;
    return data === true || data === "true";
  } catch {
    return false;
  }
}

/**
 * React hook — returns `true` only when BOTH gates allow the feature.
 * Defaults to `false` until the runtime check resolves, so UI never flashes on.
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!buildTimeEnabled(key)) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    runtimeEnabled(key).then((v) => {
      if (!cancelled) setEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return enabled;
}

/** Imperative check (non-React contexts). Resolves to the ANDed value. */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  if (!buildTimeEnabled(key)) return false;
  return runtimeEnabled(key);
}
