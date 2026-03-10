import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Handles magic link auth callback.
 * Supabase sets session from URL hash automatically,
 * then we redirect to the dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase client auto-detects the hash and sets session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/");
        return;
      }

      if (session) {
        navigate("/mina-analyser", { replace: true });
      } else {
        // Wait a moment for session to be set from hash
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            navigate("/mina-analyser", { replace: true });
          } else {
            navigate("/");
          }
        }, 1000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Loggar in...</p>
    </div>
  );
}
