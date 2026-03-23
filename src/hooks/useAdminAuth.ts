import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  // Dev bypass for preview/dev environments
  const isDevEnv = import.meta.env.DEV || window.location.hostname.includes("lovableproject.com") || window.location.hostname.includes("id-preview--");

  useEffect(() => {
    if (isDevEnv) {
      setIsAdmin(true);
      setChecking(false);
      return;
    }

    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    const checkAdmin = async () => {
      const { data } = await supabase
        .from("ref_user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      setChecking(false);
    };

    checkAdmin();
  }, [user, authLoading, isDevEnv]);

  return { user, isAdmin, loading: isDevEnv ? false : (authLoading || checking) };
}
