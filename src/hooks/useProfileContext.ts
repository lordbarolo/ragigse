import { useCallback, useEffect, useState } from "react";
import {
  fetchProfileContext,
  isProfileComplete,
  type ProfileContext,
} from "@/lib/profileContext";

/** Hämtar användarens profilkontext (roll, ort, kontraktsform, ersättning). */
export function useProfileContext(userId: string | undefined) {
  const [context, setContext] = useState<ProfileContext | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setContext(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const nextContext = await fetchProfileContext(userId);
      setContext(nextContext);
      return nextContext;
    } catch {
      setContext(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { context, loading, complete: isProfileComplete(context), refresh };
}
