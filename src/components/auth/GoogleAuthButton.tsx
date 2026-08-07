import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

type Props = {
  label?: string;
  source: string;
  /** Called when a session is available directly (popup flow in preview). */
  onSession?: () => void;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1.0v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H1.0a9 9 0 0 0 0 8.1l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 1.0 4.95l2.97 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function GoogleAuthButton({ label = "Fortsätt med Google", source, onSession }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      trackEvent("signup_initiated", { method: "google", source });
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.href,
      });
      if (result.error) {
        toast({
          title: "Google-inloggning misslyckades",
          description: result.error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (result.redirected) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        onSession?.();
        return;
      }
      setLoading(false);
    } catch {
      toast({ title: "Google-inloggning misslyckades", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-white text-black hover:bg-white/90 border-black/15 gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
      {label}
    </Button>
  );
}
