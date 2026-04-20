import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import posthog from "@/lib/posthog";

export type AppRole = "individual" | "reference_giver" | "client" | "admin" | "agency";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            posthog.identify(session.user.id, { email: session.user.email ?? undefined });
          } catch {}
        }
        if (event === "SIGNED_OUT") {
          try { posthog.reset(); } catch {}
        }
        if (!session?.user) {
          setRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch role whenever user changes
  useEffect(() => {
    if (!user) return;

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("ref_user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      setRole((data?.role as AppRole) ?? "individual");
      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    window.location.href = "/";
  };

  return { user, session, loading, role, signOut };
}
