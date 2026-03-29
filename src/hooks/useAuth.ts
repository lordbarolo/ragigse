import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "individual" | "reference_giver" | "client" | "admin" | "agency";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
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

      if (!error && data) {
        setRole(data.role as AppRole);
      } else {
        // Fallback: check signup metadata
        const metaRole = user.user_metadata?.role as AppRole | undefined;
        setRole(metaRole || "individual");
      }
      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return { user, session, loading, role, signOut };
}
