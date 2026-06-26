import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  /** Called once we have an authenticated session (email/password signup or
   *  already-existing account). Google flow does its own redirect; the caller
   *  detects the returning session via supabase.auth.getSession(). */
  onAuthenticated: (email: string) => void;
  loading: boolean;
}

export default function SignupGate({ onAuthenticated, loading }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validEmail = EMAIL_REGEX.test(email.trim());
  const validPassword = password.length >= 6;
  const canSubmit = validEmail && validPassword && !submitting && !loading;
  const busy = submitting || loading;

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      // Mark intent so that when the user returns from Google OAuth, the teaser
      // auto-unlocks the report instead of just sitting there.
      sessionStorage.setItem("compcare:autoUnlock", "1");
      trackEvent("signup_initiated", { method: "google", source: "teaser_gate" });
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.href,
      });
      if (result.error) {
        sessionStorage.removeItem("compcare:autoUnlock");
        toast({ title: "Google-inloggning misslyckades", description: result.error.message, variant: "destructive" });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) {
        return; // full-page redirect in progress
      }
      // Popup flow (preview): session is set — let Teaser pick it up.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        sessionStorage.removeItem("compcare:autoUnlock");
        onAuthenticated(session.user.email);
      }
    } catch (e) {
      sessionStorage.removeItem("compcare:autoUnlock");
      toast({ title: "Google-inloggning misslyckades", variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.href,
        data: { role: "individual" },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const exists = msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already registered");
      if (exists) {
        // Account exists — try sign in instead so the flow continues seamlessly.
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInErr) {
          setSubmitting(false);
          toast({
            title: "Kontot finns redan",
            description: "Logga in med ditt lösenord eller välj Google.",
            variant: "destructive",
          });
          return;
        }
        trackEvent("login_succeeded", { method: "email", source: "teaser_gate" });
        onAuthenticated(normalizedEmail);
        return;
      }
      setSubmitting(false);
      toast({ title: "Kunde inte skapa konto", description: error.message, variant: "destructive" });
      return;
    }

    trackEvent("signup_initiated", { method: "email", source: "teaser_gate" });
    // Even without email verification, the gate continues so the user gets
    // their report. They can verify the email link later to keep the account.
    onAuthenticated(normalizedEmail);
  };

  return (
    <div className="space-y-4">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy || googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-base bg-white border border-black/15 text-black hover:bg-black/[0.03] transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.3 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.3 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 43.5c5.2 0 9.8-1.8 13.4-4.8l-6.2-5.1c-2 1.4-4.5 2.3-7.2 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.1c-.4.4 6.7-4.9 6.7-14.7 0-1.2-.1-2.3-.4-3.5z" />
          </svg>
        )}
        Fortsätt med Google
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        eller
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email + password */}
      <form onSubmit={handleEmailSignup} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="namn@exempel.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base pl-11 rounded-xl"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Välj lösenord (minst 6 tecken)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base pl-11 rounded-xl"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base transition-all active:scale-[0.98] ${
            canSubmit
              ? "bg-gradient-to-r from-[#8155FF] to-[#a855f7] text-white shadow-[0_8px_32px_-6px_rgba(129,85,255,0.45)] hover:shadow-[0_12px_40px_-6px_rgba(129,85,255,0.55)] hover:-translate-y-0.5"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Skapa konto och visa rapport"}
          {!busy && <ArrowRight className="w-5 h-5" />}
        </button>
      </form>

      <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
        Genom att skapa konto godkänner du vår{" "}
        <a href="/integritetspolicy" className="underline">integritetspolicy</a>. Vi delar aldrig dina uppgifter.
      </p>
    </div>
  );
}
